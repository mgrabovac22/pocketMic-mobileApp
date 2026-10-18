# 🎙️ PocketMic - React Native Live Microphone App

**PocketMic** is a React Native mobile application that turns your smartphone into a real-time microphone. Stream your live voice directly to connected external Bluetooth speakers, AUX sound systems, or USB audio devices with minimal latency.

---

## Features

- **Real-Time Voice Passthrough:** Ultra-low latency PCM audio streaming from the device microphone to the output speaker.
- **Visual Audio Meter:** Live sound level visualization (waveform/VU meter) while speaking.
- **Gain & Volume Control:** Adjust input gain on the fly to prevent clipping or distortion.
- **Multiple Output Routing:** Supports Bluetooth speakers, 3.5mm AUX jack, and USB audio interfaces.
- **Minimalist UI:** Clean, intuitive one-tap operation.

---

## Tech Stack & Dependencies

- **Framework:** React Native
- **Language:** TypeScript / JavaScript
- **Audio Core:** Custom Kotlin native module (`AudioRecord → DSP → AudioTrack`), PCM 16-bit mono 48 kHz, `PERFORMANCE_MODE_LOW_LATENCY`, buffers 10–160 ms
- **Permissions:** Android `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`