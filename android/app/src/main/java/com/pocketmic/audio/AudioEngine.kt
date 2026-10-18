package com.pocketmic.audio

import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Build
import android.os.Process
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt
import kotlin.math.tanh

private const val SOFT_CLIP_KNEE = 0.7f

private fun softClip(x: Float): Float {
  val a = abs(x)
  if (a <= SOFT_CLIP_KNEE) {
    return x
  }
  val y = SOFT_CLIP_KNEE + (1f - SOFT_CLIP_KNEE) * tanh((a - SOFT_CLIP_KNEE) / (1f - SOFT_CLIP_KNEE))
  return if (x < 0f) -y else y
}

class AudioEngine(
  private val listener: Listener,
  private val audioManager: AudioManager,
) {

  interface Listener {
    fun onLevel(rms: Float, peak: Float)
    fun onStatus(state: String, message: String?)
  }

  @Volatile
  var gain: Float = 1f

  @Volatile
  var noiseGate: Float = DEFAULT_GATE

  @Volatile
  var highPass: Boolean = true

  @Volatile
  var preventFeedback: Boolean = true

  @Volatile
  var duckMusic: Boolean = true

  @Volatile
  var voiceVolume: Float = 1f

  @Volatile
  var musicBalance: Float = 1f

  @Volatile
  var bufferSizeMs: Int = DEFAULT_BUFFER_MS

  @Volatile
  private var running = false

  private var record: AudioRecord? = null
  private var track: AudioTrack? = null
  private var worker: Thread? = null
  private var focusRequest: AudioFocusRequest? = null

  private val focusChangeListener =
    AudioManager.OnAudioFocusChangeListener { change ->
      if (
        change == AudioManager.AUDIOFOCUS_LOSS ||
          change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ||
          change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK
      ) {
        running = false
      }
    }

  val isRunning: Boolean
    get() = running

  @Synchronized
  fun start(): Boolean {
    if (running) {
      return true
    }

    val minIn = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_IN, ENCODING)
    val minOut = AudioTrack.getMinBufferSize(SAMPLE_RATE, CHANNEL_OUT, ENCODING)
    if (minIn <= 0 || minOut <= 0) {
      listener.onStatus("error", "Nepodrzan audio format ($minIn/$minOut)")
      return false
    }

    val wantedBytes = (SAMPLE_RATE * bufferSizeMs / 1000) * BYTES_PER_SAMPLE
    val bufferBytes = max(max(minIn, minOut), wantedBytes)

    val recorder = createRecorder(bufferBytes)
    val player = createPlayer(bufferBytes)
    if (recorder == null || player == null) {
      recorder?.release()
      player?.release()
      listener.onStatus("error", "Neuspjesna inicijalizacija audio zapisa")
      return false
    }

    record = recorder
    track = player

    if (duckMusic) {
      requestAudioFocus()
    }

    running = true
    worker = Thread({ runLoop(recorder, player) }, "PocketMicAudio").also {
      it.priority = Thread.MAX_PRIORITY
      it.start()
    }
    return true
  }

  @Synchronized
  fun stop() {
    running = false
    val current = worker
    if (current != null) {
      try {
        current.join(JOIN_TIMEOUT_MS)
      } catch (e: InterruptedException) {
        Thread.currentThread().interrupt()
      }
      worker = null
      if (current.isAlive) {
        return
      }
    }
    record?.let { releaseRecorder(it) }
    track?.let { releasePlayer(it) }
    abandonAudioFocus()
    listener.onStatus("stopped", null)
  }

  private fun runLoop(recorder: AudioRecord, player: AudioTrack) {
    val frames = max(MIN_FRAMES, SAMPLE_RATE * bufferSizeMs / 1000)
    val input = ShortArray(frames)
    val floats = FloatArray(frames)
    val output = ShortArray(frames)

    var hpIn = 0f
    var hpOut = 0f
    var smoothedGain = gain
    var trimmed = musicBalance
    var appliedVoiceVolume = -1f
    var gate = 1f
    var duck = 1f
    var framesSinceEmit = 0
    var failed = false

    try {
      Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
      recorder.startRecording()
      player.play()
      player.setVolume(voiceVolume)
      appliedVoiceVolume = voiceVolume
      listener.onStatus("running", null)

      while (running) {
        val read = recorder.read(input, 0, frames)
        if (read < 0) {
          failed = true
          listener.onStatus("error", "AudioRecord error: $read")
          break
        }
        if (read == 0) {
          continue
        }

        var sumSq = 0.0
        var filteredPeak = 0f
        var i = 0
        while (i < read) {
          var s = input[i] / 32768f
          if (highPass) {
            hpOut = HIGH_PASS_A * (hpOut + s - hpIn)
            hpIn = s
            s = hpOut
          }
          floats[i] = s
          sumSq += (s * s).toDouble()
          if (abs(s) > filteredPeak) {
            filteredPeak = abs(s)
          }
          i++
        }
        val rms = sqrt(sumSq / read).toFloat()

        gate =
          if (noiseGate <= 0f) {
            1f
          } else if (rms >= noiseGate) {
            min(1f, gate + (1f - gate) * GATE_ATTACK)
          } else {
            max(0f, gate - gate * GATE_RELEASE)
          }

        smoothedGain += (gain - smoothedGain) * GAIN_SMOOTHING
        trimmed += (musicBalance - trimmed) * GAIN_SMOOTHING

        val currentVoiceVolume = voiceVolume
        if (currentVoiceVolume != appliedVoiceVolume) {
          player.setVolume(currentVoiceVolume)
          appliedVoiceVolume = currentVoiceVolume
        }

        duck =
          if (!preventFeedback) {
            1f
          } else if (filteredPeak * smoothedGain * gate > CLIP_THRESHOLD) {
            max(MIN_DUCK, duck - DUCK_STEP)
          } else {
            min(1f, duck + DUCK_RECOVER)
          }

        var outSumSq = 0.0
        var outPeak = 0f
        var j = 0
        while (j < read) {
          val s = softClip(floats[j] * smoothedGain * trimmed * gate * duck)
          output[j] = (s * 32767f).toInt().toShort()
          outSumSq += (s * s).toDouble()
          if (abs(s) > outPeak) {
            outPeak = abs(s)
          }
          j++
        }

        val written = player.write(output, 0, read)
        if (written < 0) {
          failed = true
          listener.onStatus("error", "AudioTrack error: $written")
          break
        }

        framesSinceEmit += read
        if (framesSinceEmit >= SAMPLE_RATE / EMIT_PER_SECOND) {
          framesSinceEmit = 0
          listener.onLevel(sqrt(outSumSq / read).toFloat(), outPeak)
        }
      }
    } catch (t: Throwable) {
      failed = true
      listener.onStatus("error", t.message ?: t.javaClass.simpleName)
    } finally {
      releaseRecorder(recorder)
      releasePlayer(player)
      abandonAudioFocus()
      running = false
      if (!failed) {
        listener.onStatus("stopped", null)
      }
    }
  }

  private fun createRecorder(bufferBytes: Int): AudioRecord? =
    try {
      val created =
        AudioRecord.Builder()
          .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
          .setAudioFormat(
            AudioFormat.Builder()
              .setEncoding(ENCODING)
              .setSampleRate(SAMPLE_RATE)
              .setChannelMask(CHANNEL_IN)
              .build()
          )
          .setBufferSizeInBytes(bufferBytes)
          .build()
      if (created.state == AudioRecord.STATE_INITIALIZED) {
        created
      } else {
        created.release()
        null
      }
    } catch (e: Throwable) {
      null
    }

  private fun createPlayer(bufferBytes: Int): AudioTrack? =
    try {
      val builder =
        AudioTrack.Builder()
          .setAudioAttributes(mediaAttributes())
          .setAudioFormat(
            AudioFormat.Builder()
              .setEncoding(ENCODING)
              .setSampleRate(SAMPLE_RATE)
              .setChannelMask(CHANNEL_OUT)
              .build()
          )
          .setBufferSizeInBytes(bufferBytes)
          .setTransferMode(AudioTrack.MODE_STREAM)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        builder.setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
      }
      val created = builder.build()
      if (created.state == AudioTrack.STATE_INITIALIZED) {
        created
      } else {
        created.release()
        null
      }
    } catch (e: Throwable) {
      null
    }

  private fun mediaAttributes(): AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
      .setLegacyStreamType(AudioManager.STREAM_MUSIC)
      .build()

  private fun requestAudioFocus() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val request =
          AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(mediaAttributes())
            .setOnAudioFocusChangeListener(focusChangeListener)
            .setWillPauseWhenDucked(false)
            .build()
        focusRequest = request
        audioManager.requestAudioFocus(request)
      } else {
        @Suppress("DEPRECATION")
        audioManager.requestAudioFocus(
          focusChangeListener,
          AudioManager.STREAM_MUSIC,
          AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
        )
      }
    } catch (e: Throwable) {
      focusRequest = null
    }
  }

  private fun abandonAudioFocus() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
      } else {
        @Suppress("DEPRECATION")
        audioManager.abandonAudioFocus(focusChangeListener)
      }
    } catch (e: Throwable) {
    }
    focusRequest = null
  }

  private fun releaseRecorder(recorder: AudioRecord) {
    try {
      recorder.stop()
    } catch (e: Throwable) {
    }
    try {
      recorder.release()
    } catch (e: Throwable) {
    }
    if (record === recorder) {
      record = null
    }
  }

  private fun releasePlayer(player: AudioTrack) {
    try {
      player.stop()
    } catch (e: Throwable) {
    }
    try {
      player.release()
    } catch (e: Throwable) {
    }
    if (track === player) {
      track = null
    }
  }

  companion object {
    const val SAMPLE_RATE = 48000
    const val DEFAULT_BUFFER_MS = 20
    const val DEFAULT_GATE = 0.02f

    private const val ENCODING = AudioFormat.ENCODING_PCM_16BIT
    private const val CHANNEL_IN = AudioFormat.CHANNEL_IN_MONO
    private const val CHANNEL_OUT = AudioFormat.CHANNEL_OUT_MONO
    private const val BYTES_PER_SAMPLE = 2
    private const val MIN_FRAMES = 160

    private const val HIGH_PASS_A = 0.983f
    private const val GATE_ATTACK = 0.5f
    private const val GATE_RELEASE = 0.06f
    private const val GAIN_SMOOTHING = 0.3f
    private const val CLIP_THRESHOLD = 0.95f
    private const val MIN_DUCK = 0.35f
    private const val DUCK_STEP = 0.4f
    private const val DUCK_RECOVER = 0.03f

    private const val EMIT_PER_SECOND = 20
    private const val JOIN_TIMEOUT_MS = 2000L
  }
}
