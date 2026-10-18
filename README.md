# 🎙️ PocketMic - Live Phone Microphone & Passthrough

**PocketMic** is an Android application that turns your smartphone into a real-time microphone. Stream your voice instantly to any connected external speaker via Bluetooth, AUX/3.5mm jack, or local network.

---

## ✨ Features

- **Real-Time Audio Streaming:** Low-latency voice passthrough from mic to speaker.
- **Multiple Output Options:** Supports Bluetooth speakers, wired audio jacks, and USB audio outputs.
- **Audio Control:** Adjustable microphone gain and output volume controls.
- **Echo Reduction:** Built-in audio processing to minimize feedback screeching.
- **Clean UI:** Simple one-tap start/stop interface.

---

## 🛠️ Tech Stack & Architecture

- **Language:** Kotlin
- **Min SDK:** 21+ (Android 5.0)
- **Audio APIs:** `AudioRecord`, `AudioTrack` (or Google's Oboe library for high-performance low-latency)
- **Permissions Required:** `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`

---

## 🚀 Getting Started

### Prerequisites
* Android Studio Iguana / Jellyfish (or newer)
* Android device with API 21+

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/PocketMic.git](https://github.com/your-username/PocketMic.git)
