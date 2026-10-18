package com.pocketmic.audio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class PocketMicAudioModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val audioManager =
    reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  private val engine =
    AudioEngine(
      listener =
        object : AudioEngine.Listener {
          override fun onLevel(rms: Float, peak: Float) {
            val params =
              Arguments.createMap().apply {
                putDouble("rms", rms.toDouble())
                putDouble("peak", peak.toDouble())
              }
            emit(LEVEL_EVENT, params)
          }

          override fun onStatus(state: String, message: String?) {
            val params =
              Arguments.createMap().apply {
                putString("state", state)
                if (message != null) {
                  putString("message", message)
                }
              }
            emit(STATUS_EVENT, params)
          }
        },
      audioManager = audioManager,
    )

  private fun emit(name: String, params: WritableMap) {
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(name, params)
    } catch (e: Throwable) {
    }
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun start(options: ReadableMap, promise: Promise) {
    if (
      reactContext.checkSelfPermission(Manifest.permission.RECORD_AUDIO) !=
        PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject(E_PERMISSION, "RECORD_AUDIO dozvola nije odobrena")
      return
    }

    if (options.hasKey("gain")) {
      engine.gain = options.getDouble("gain").toFloat().coerceIn(MIN_GAIN, MAX_GAIN)
    }
    if (options.hasKey("bufferSizeMs")) {
      engine.bufferSizeMs = options.getInt("bufferSizeMs").coerceIn(MIN_BUFFER_MS, MAX_BUFFER_MS)
    }
    if (options.hasKey("noiseGate")) {
      engine.noiseGate = options.getDouble("noiseGate").toFloat().coerceIn(0f, MAX_GATE)
    }
    if (options.hasKey("highPass")) {
      engine.highPass = options.getBoolean("highPass")
    }
    if (options.hasKey("preventFeedback")) {
      engine.preventFeedback = options.getBoolean("preventFeedback")
    }
    if (options.hasKey("duckMusic")) {
      engine.duckMusic = options.getBoolean("duckMusic")
    }

    if (engine.start()) {
      promise.resolve(null)
    } else {
      promise.reject(E_START_FAILED, "Audio engine se nije mogao pokrenuti")
    }
  }

  @ReactMethod
  fun stop() {
    engine.stop()
  }

  @ReactMethod
  fun setGain(value: Double) {
    engine.gain = value.toFloat().coerceIn(MIN_GAIN, MAX_GAIN)
  }

  @ReactMethod
  fun setNoiseGate(value: Double) {
    engine.noiseGate = value.toFloat().coerceIn(0f, MAX_GATE)
  }

  @ReactMethod
  fun setHighPass(enabled: Boolean) {
    engine.highPass = enabled
  }

  @ReactMethod
  fun setPreventFeedback(enabled: Boolean) {
    engine.preventFeedback = enabled
  }

  @ReactMethod
  fun setDuckMusic(enabled: Boolean) {
    engine.duckMusic = enabled
  }

  @ReactMethod
  fun setVoiceVolume(value: Double) {
    engine.voiceVolume = value.toFloat().coerceIn(0f, 1f)
  }

  @ReactMethod
  fun setMusicLevel(value: Double) {
    engine.musicBalance = (1.0 / value.coerceIn(0.25, 1.0)).toFloat()
  }

  @ReactMethod
  fun setBufferSizeMs(value: Int) {
    engine.bufferSizeMs = value.coerceIn(MIN_BUFFER_MS, MAX_BUFFER_MS)
  }

  @ReactMethod
  fun setOutputVolume(value: Double) {
    val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    val level = (value.coerceIn(0.0, 1.0) * max).toInt()
    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, level, 0)
  }

  @ReactMethod
  fun isRunning(promise: Promise) {
    promise.resolve(engine.isRunning)
  }

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Double) {}

  override fun getConstants(): Map<String, Any> =
    mapOf(
      "LEVEL_EVENT" to LEVEL_EVENT,
      "STATUS_EVENT" to STATUS_EVENT,
      "SAMPLE_RATE" to AudioEngine.SAMPLE_RATE,
      "DEFAULT_BUFFER_MS" to AudioEngine.DEFAULT_BUFFER_MS,
    )

  companion object {
    const val NAME = "PocketMicAudio"
    const val LEVEL_EVENT = "PocketMicLevel"
    const val STATUS_EVENT = "PocketMicStatus"

    private const val E_PERMISSION = "E_PERMISSION"
    private const val E_START_FAILED = "E_START_FAILED"

    private const val MIN_GAIN = 0f
    private const val MAX_GAIN = 8f
    private const val MAX_GATE = 0.5f
    private const val MIN_BUFFER_MS = 10
    private const val MAX_BUFFER_MS = 400
  }
}
