import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  addLevelListener,
  addStatusListener,
  PocketMicAudio,
  type MicLevelEvent,
} from '../native/PocketMicAudio';

export const NOISE_GATE_THRESHOLD = 0.02;

export type MicStatus = 'idle' | 'starting' | 'running' | 'denied' | 'error';

type Options = {
  gain: number;
  bufferSizeMs: number;
  noiseGateEnabled: boolean;
  highPassEnabled: boolean;
  antiFeedbackEnabled: boolean;
  duckMusicEnabled: boolean;
  outputVolume: number;
};

export function usePocketMic(options: Options) {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [level, setLevel] = useState<MicLevelEvent>({ rms: 0, peak: 0 });
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const subscriptions = [
      addLevelListener(event => {
        setLevel(event);
      }),
      addStatusListener(event => {
        if (event.state === 'running') {
          setStatus('running');
          setErrorMessage(null);
        } else if (event.state === 'error') {
          setStatus('error');
          setErrorMessage(event.message ?? 'Nepoznata audio pogreska');
          setLevel({ rms: 0, peak: 0 });
        } else if (event.state === 'stopped') {
          setStatus(current =>
            current === 'error' || current === 'denied' ? current : 'idle',
          );
          setLevel({ rms: 0, peak: 0 });
        }
      }),
    ];

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, []);

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    PocketMicAudio.setOutputVolume(options.outputVolume);
  }, [options.outputVolume, status]);

  useEffect(() => {
    return () => {
      PocketMicAudio.stop();
    };
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);
    setStatus('starting');

    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'PocketMic treba mikrofon',
          message:
            'Mikrofon se koristi za prijenos glasa na zvucnik u stvarnom vremenu.',
          buttonPositive: 'Dopusti',
          buttonNegative: 'Odbij',
        },
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        setStatus('denied');
        setErrorMessage('Dopustenje za mikrofon nije odobreno.');
        return;
      }
    }

    const current = optionsRef.current;
    try {
      await PocketMicAudio.start({
        gain: current.gain,
        bufferSizeMs: current.bufferSizeMs,
        noiseGate: current.noiseGateEnabled ? NOISE_GATE_THRESHOLD : 0,
        highPass: current.highPassEnabled,
        preventFeedback: current.antiFeedbackEnabled,
        duckMusic: current.duckMusicEnabled,
      });
      setStatus('running');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Pokretanje mikrofona nije uspjelo.',
      );
    }
  }, []);

  const stop = useCallback(() => {
    PocketMicAudio.stop();
    setStatus('idle');
    setLevel({ rms: 0, peak: 0 });
  }, []);

  const toggle = useCallback(() => {
    if (status === 'running' || status === 'starting') {
      stop();
    } else {
      start();
    }
  }, [start, stop, status]);

  return {
    status,
    errorMessage,
    level,
    isActive: status === 'running',
    start,
    stop,
    toggle,
  };
}
