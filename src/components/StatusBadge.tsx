import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MicStatus } from '../hooks/usePocketMic';

type Props = {
  status: MicStatus;
  errorMessage?: string | null;
};

type Appearance = {
  label: string;
  color: string;
};

function appearanceFor(status: MicStatus): Appearance {
  switch (status) {
    case 'running':
      return { label: 'Mikrofon aktivan', color: '#22c55e' };
    case 'starting':
      return { label: 'Pokretanje...', color: '#eab308' };
    case 'denied':
      return { label: 'Dopustenje za mikrofon odbijeno', color: '#f97316' };
    case 'error':
      return { label: 'Audio greska', color: '#ef4444' };
    default:
      return { label: 'Mikrofon zaustavljen', color: '#64748b' };
  }
}

export function StatusBadge({ status, errorMessage }: Props) {
  const appearance = appearanceFor(status);

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: appearance.color }]} />
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: appearance.color }]}>
          {appearance.label}
        </Text>
        {status === 'error' && errorMessage != null ? (
          <Text style={styles.message}>{errorMessage}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#151a24',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  textContainer: {
    flexShrink: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  message: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
});
