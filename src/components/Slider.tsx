import React, { useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  formatValue?: (value: number) => string;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
};

const THUMB_SIZE = 22;
const TRACK_HEIGHT = 6;

function snapToStep(value: number, min: number, max: number, step?: number) {
  const clamped = Math.min(max, Math.max(min, value));
  if (step == null || step <= 0) {
    return clamped;
  }
  return Math.min(
    max,
    Math.max(min, Math.round((clamped - min) / step) * step + min),
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  disabled = false,
  formatValue,
  onValueChange,
  onSlidingComplete,
}: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  const handlersRef = useRef({ onValueChange, onSlidingComplete });

  valueRef.current = value;
  handlersRef.current = { onValueChange, onSlidingComplete };

  const ratio = useMemo(
    () => (max > min ? (value - min) / (max - min) : 0),
    [value, min, max],
  );

  const panResponder = useMemo(() => {
    const valueFromLocation = (locationX: number) => {
      const trackWidth = widthRef.current;
      if (trackWidth <= 0) {
        return valueRef.current;
      }
      const raw = min + (locationX / trackWidth) * (max - min);
      return snapToStep(raw, min, max, step);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        handlersRef.current.onValueChange(
          valueFromLocation(event.nativeEvent.locationX),
        );
      },
      onPanResponderMove: event => {
        handlersRef.current.onValueChange(
          valueFromLocation(event.nativeEvent.locationX),
        );
      },
      onPanResponderRelease: event => {
        handlersRef.current.onSlidingComplete?.(
          valueFromLocation(event.nativeEvent.locationX),
        );
      },
    });
  }, [disabled, min, max, step]);

  const updateWidth = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    widthRef.current = nextWidth;
    setWidth(nextWidth);
  };

  const fillWidth = width * Math.min(1, Math.max(0, ratio));
  const thumbLeft = Math.max(
    0,
    Math.min(width - THUMB_SIZE, ratio * (width - THUMB_SIZE)),
  );

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {formatValue ? formatValue(value) : value.toFixed(2)}
        </Text>
      </View>
      <View
        style={styles.hitArea}
        onLayout={updateWidth}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: fillWidth }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: thumbLeft }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  disabled: {
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: '#f8fafc',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  hitArea: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#2b3242',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
});
