// cursorrules §4.1: SplashScreen JWT kontrolü yapar; geçerli → MainTabs, yok → AuthStack.
// Not: Reanimated dev build hazır olduğunda geri eklenecek; şimdilik RN Animated kullanılıyor.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Colors, Typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props): React.JSX.Element {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydratePrefs = usePreferencesStore((s) => s.hydrate);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Giriş animasyonu
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8,
        speed: 6,
      }),
    ]).start();

    void hydrate();
    void hydratePrefs();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const timer = setTimeout(() => {
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (accessToken) {
          navigation.replace('Main');
        } else {
          navigation.replace('Auth');
        }
      });
    }, 1400);

    return () => clearTimeout(timer);
  }, [isHydrated, accessToken]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        <Text style={styles.logoText}>₺</Text>
        <Text style={styles.appName}>Döviz</Text>
        <Text style={styles.tagline}>Finansal Takip</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 72,
    color: Colors.accent.primary,
  },
  appName: {
    ...Typography.h1,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  tagline: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    letterSpacing: 1,
  },
});
