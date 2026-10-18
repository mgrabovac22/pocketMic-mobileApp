import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  active: boolean;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const SIZE = 184;

export function ToggleButton({
  active,
  busy = false,
  disabled = false,
  onPress,
}: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(1);
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [active, pulse]);

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.ring,
          active ? styles.ringActive : styles.ringIdle,
          { transform: [{ scale: pulse }] },
        ]}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={active ? 'Zaustavi mikrofon' : 'Pokreni mikrofon'}
          disabled={disabled}
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          style={({ pressed }) => [
            styles.button,
            active ? styles.buttonActive : styles.buttonIdle,
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
        >
          <View>
            <Text style={styles.buttonTitle}>{active ? 'STOP' : 'START'}</Text>
            <Text style={styles.buttonSubtitle}>
              {busy
                ? 'cekaj...'
                : active
                ? 'iskljuci mikrofon'
                : 'ukljuci mikrofon'}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SIZE + 40,
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#ef4444',
  },
  ringActive: {
    opacity: 0.35,
  },
  ringIdle: {
    opacity: 0,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  buttonIdle: {
    backgroundColor: '#1b2230',
    borderColor: '#3b82f6',
  },
  buttonActive: {
    backgroundColor: '#b91c1c',
    borderColor: '#fca5a5',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTitle: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  buttonSubtitle: {
    color: '#e2e8f0',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
