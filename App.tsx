/**
 * PocketMic - real-time microphone passthrough.
 *
 * @format
 */

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LevelMeter } from './src/components/LevelMeter';
import { Slider } from './src/components/Slider';
import { StatusBadge } from './src/components/StatusBadge';
import { ToggleButton } from './src/components/ToggleButton';
import { NOISE_GATE_THRESHOLD, usePocketMic } from './src/hooks/usePocketMic';
import { PocketMicAudio } from './src/native/PocketMicAudio';

const BUFFER_OPTIONS = [40, 60, 100, 160];

type OptionRowProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function OptionRow({
  label,
  description,
  value,
  onValueChange,
}: OptionRowProps) {
  return (
    <View style={styles.optionRow}>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#2b3242', true: '#1d4ed8' }}
        thumbColor="#f8fafc"
      />
    </View>
  );
}

function App() {
  const [gain, setGain] = useState(1);
  const [outputVolume, setOutputVolume] = useState(0.8);
  const [bufferSizeMs, setBufferSizeMs] = useState(60);
  const [noiseGateEnabled, setNoiseGateEnabled] = useState(true);
  const [highPassEnabled, setHighPassEnabled] = useState(true);
  const [antiFeedbackEnabled, setAntiFeedbackEnabled] = useState(true);
  const [duckMusicEnabled, setDuckMusicEnabled] = useState(true);

  const { status, errorMessage, level, isActive, toggle } = usePocketMic({
    gain,
    bufferSizeMs,
    noiseGateEnabled,
    highPassEnabled,
    antiFeedbackEnabled,
    duckMusicEnabled,
    outputVolume,
  });

  useEffect(() => {
    PocketMicAudio.setGain(gain);
  }, [gain]);

  useEffect(() => {
    PocketMicAudio.setNoiseGate(noiseGateEnabled ? NOISE_GATE_THRESHOLD : 0);
    PocketMicAudio.setHighPass(highPassEnabled);
    PocketMicAudio.setPreventFeedback(antiFeedbackEnabled);
    PocketMicAudio.setDuckMusic(duckMusicEnabled);
  }, [
    noiseGateEnabled,
    highPassEnabled,
    antiFeedbackEnabled,
    duckMusicEnabled,
  ]);

  useEffect(() => {
    PocketMicAudio.setBufferSizeMs(bufferSizeMs);
  }, [bufferSizeMs]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>PocketMic</Text>
            <Text style={styles.subtitle}>
              Glas u stvarnom vremenu: mikrofon → zvucnik
            </Text>
          </View>

          <StatusBadge status={status} errorMessage={errorMessage} />

          <LevelMeter level={level} active={isActive} />

          <ToggleButton
            active={isActive}
            busy={status === 'starting'}
            onPress={toggle}
          />

          <View style={styles.panel}>
            <Slider
              label="Pojačanje mikrofona (Gain)"
              value={gain}
              min={0}
              max={4}
              step={0.1}
              formatValue={value => `${value.toFixed(1)}×`}
              onValueChange={setGain}
            />
            <Slider
              label="Izlazna glasnoća"
              value={outputVolume}
              min={0}
              max={1}
              step={0.05}
              disabled={!isActive}
              formatValue={value => `${Math.round(value * 100)}%`}
              onValueChange={setOutputVolume}
            />

            <Text style={styles.sectionTitle}>Latencija buffera</Text>
            <View style={styles.bufferRow}>
              {BUFFER_OPTIONS.map(option => {
                const selected = option === bufferSizeMs;
                return (
                  <PressableChip
                    key={option}
                    label={`${option} ms`}
                    selected={selected}
                    onPress={() => setBufferSizeMs(option)}
                  />
                );
              })}
            </View>
            <Text style={styles.hint}>
              Procijenjena latencija ≈ {bufferSizeMs * 2} ms
              {isActive ? ' (mijenja se pri sljedećem pokretanju)' : ''}
            </Text>

            <View style={styles.divider} />

            <OptionRow
              label="Noise gate"
              description="Rezuje zujanje kad ne govorite"
              value={noiseGateEnabled}
              onValueChange={setNoiseGateEnabled}
            />
            <OptionRow
              label="Visokopropusni filter"
              description="Uklanja duboke frekvencije koje potiču povratnu vezu"
              value={highPassEnabled}
              onValueChange={setHighPassEnabled}
            />
            <OptionRow
              label="Zaštita od mikrofonije"
              description="Automatsko prigušenje pri jakom povratu (howling)"
              value={antiFeedbackEnabled}
              onValueChange={setAntiFeedbackEnabled}
            />
            <OptionRow
              label="Stišaj glazbu dok govorite"
              description="Voice over: glazba se automatski stiša dok je mikrofon aktivan"
              value={duckMusicEnabled}
              onValueChange={setDuckMusicEnabled}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function PressableChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Text
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b0f17',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  panel: {
    backgroundColor: '#111621',
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
  },
  sectionTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  bufferRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    color: '#94a3b8',
    backgroundColor: '#1b2230',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b3242',
  },
  chipSelected: {
    color: '#f8fafc',
    backgroundColor: '#1d4ed8',
    borderColor: '#3b82f6',
  },
  chipPressed: {
    opacity: 0.7,
  },
  hint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e2430',
    marginVertical: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  optionText: {
    flex: 1,
    paddingRight: 14,
  },
  optionLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  optionDescription: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
});

export default App;
