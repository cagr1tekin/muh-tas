// cursorrules §5.4 — PrimaryButton spec.
// height: 52, borderRadius: 14, accent renk, glow shadow, loading state.
// cursorrules §5.6: Reanimated withSpring — scale(0.97) bası animasyonu.
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Typography } from '@/theme';

interface PrimaryButtonProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  loading = false,
  disabled,
  onPress,
  style,
}: PrimaryButtonProps): React.JSX.Element {
  const scale = React.useRef(new Animated.Value(1)).current;

  const isDisabled = disabled ?? loading;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        style={[styles.button, isDisabled && styles.disabled]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        android_ripple={null}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator color={Colors.background.primary} size="small" />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.accent.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.h3,
    color: Colors.background.primary,
    fontSize: 16,
  },
});
