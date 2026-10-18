import {
  DeviceEventEmitter,
  NativeModules,
  type EmitterSubscription,
} from 'react-native';

export type StartOptions = {
  gain?: number;
  bufferSizeMs?: number;
  noiseGate?: number;
  highPass?: boolean;
  preventFeedback?: boolean;
  duckMusic?: boolean;
};

export type MicLevelEvent = {
  rms: number;
  peak: number;
};

export type MicState = 'running' | 'stopped' | 'error';

export type MicStatusEvent = {
  state: MicState;
  message?: string;
};

export const LEVEL_EVENT = 'PocketMicLevel';
export const STATUS_EVENT = 'PocketMicStatus';

const LINKING_ERROR =
  'PocketMic: nativni modul "PocketMicAudio" nije dostupan. ' +
  'Provjerite gradnju aplikacije (npm run android).';

type NativePocketMicAudio = {
  start(options: StartOptions): Promise<void>;
  stop(): void;
  setGain(value: number): void;
  setNoiseGate(value: number): void;
  setHighPass(enabled: boolean): void;
  setPreventFeedback(enabled: boolean): void;
  setDuckMusic(enabled: boolean): void;
  setBufferSizeMs(value: number): void;
  setOutputVolume(value: number): void;
  isRunning(): Promise<boolean>;
};

function nativeModule(): NativePocketMicAudio {
  const module = optionalModule();
  if (module == null) {
    throw new Error(LINKING_ERROR);
  }
  return module;
}

function optionalModule(): NativePocketMicAudio | undefined {
  return NativeModules.PocketMicAudio as NativePocketMicAudio | undefined;
}

export const PocketMicAudio = {
  start(options: StartOptions = {}): Promise<void> {
    return nativeModule().start(options);
  },
  stop(): void {
    optionalModule()?.stop();
  },
  setGain(value: number): void {
    optionalModule()?.setGain(value);
  },
  setNoiseGate(value: number): void {
    optionalModule()?.setNoiseGate(value);
  },
  setHighPass(enabled: boolean): void {
    optionalModule()?.setHighPass(enabled);
  },
  setPreventFeedback(enabled: boolean): void {
    optionalModule()?.setPreventFeedback(enabled);
  },
  setDuckMusic(enabled: boolean): void {
    optionalModule()?.setDuckMusic(enabled);
  },
  setBufferSizeMs(value: number): void {
    optionalModule()?.setBufferSizeMs(value);
  },
  setOutputVolume(value: number): void {
    optionalModule()?.setOutputVolume(value);
  },
  isRunning(): Promise<boolean> {
    return nativeModule().isRunning();
  },
};

export function addLevelListener(
  listener: (event: MicLevelEvent) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener(LEVEL_EVENT, listener);
}

export function addStatusListener(
  listener: (event: MicStatusEvent) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener(STATUS_EVENT, listener);
}
