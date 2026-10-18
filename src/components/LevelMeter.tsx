import { StyleSheet, Text, View } from 'react-native';
import type { MicLevelEvent } from '../native/PocketMicAudio';

type Props = {
  level: MicLevelEvent;
  active: boolean;
};

const SEGMENTS = 28;
const MIN_DB = -60;

function toRatio(rms: number) {
  if (rms <= 0) {
    return 0;
  }
  const db = 20 * Math.log10(rms);
  return Math.min(1, Math.max(0, (db - MIN_DB) / -MIN_DB));
}

function toDb(value: number) {
  if (value <= 0) {
    return MIN_DB;
  }
  return Math.max(MIN_DB, Math.min(0, 20 * Math.log10(value)));
}

function segmentColor(index: number, total: number) {
  const ratio = index / total;
  if (ratio < 0.62) {
    return '#22c55e';
  }
  if (ratio < 0.84) {
    return '#eab308';
  }
  return '#ef4444';
}

const LIT_STYLES = Array.from({ length: SEGMENTS }, (_, index) => ({
  backgroundColor: segmentColor(index, SEGMENTS),
}));
const UNLIT_STYLE = { backgroundColor: '#1e2430' };

export function LevelMeter({ level, active }: Props) {
  const ratio = active ? toRatio(level.rms) : 0;
  const peakRatio = active ? toRatio(level.peak) : 0;
  const peakLeft = `${Math.round(peakRatio * 100)}%` as `${number}%`;
  const litSegments = Math.round(ratio * SEGMENTS);

  return (
    <View style={styles.container}>
      <View style={styles.meter}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index < litSegments ? LIT_STYLES[index] : UNLIT_STYLE,
            ]}
          />
        ))}
        <View
          pointerEvents="none"
          style={[styles.peakMarker, { left: peakLeft }]}
        />
      </View>
      <View style={styles.labels}>
        <Text style={styles.dbLabel}>{MIN_DB} dB</Text>
        <Text style={styles.readout}>
          {active ? `RMS ${toDb(level.rms).toFixed(0)} dB` : '—'}
        </Text>
        <Text style={styles.dbLabel}>0 dB</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 26,
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 56,
    gap: 3,
  },
  segment: {
    flex: 1,
    height: '100%',
    borderRadius: 3,
  },
  peakMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#f8fafc',
    opacity: 0.85,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dbLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  readout: {
    color: '#94a3b8',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
