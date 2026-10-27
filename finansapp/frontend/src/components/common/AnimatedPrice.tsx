import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TextStyle, View } from 'react-native';

interface AnimatedPriceProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  style?: TextStyle;
  showDash?: boolean;
}

/**
 * Görünen formatlı değer değiştiğinde:
 *  - Pozitif → yeşil parlama + hafif büyüme
 *  - Negatif → kırmızı parlama + hafif küçülme
 *
 * Tüm animasyonlar native thread (opacity + transform).
 * Reanimated veya useNativeDriver:false gerektirmez.
 */
export function AnimatedPrice({
  value,
  decimals = 2,
  suffix = '',
  prefix = '',
  style,
  showDash = false,
}: AnimatedPriceProps): React.JSX.Element {
  const isEmpty = showDash && value <= 0;
  const displayed = isEmpty ? '—' : value.toFixed(decimals);

  const prevDisplayed = useRef(displayed);
  const prevValue = useRef(value);
  const isUpRef = useRef(true);

  // Native-driver uyumlu animasyon değerleri
  const scale = useRef(new Animated.Value(1)).current;
  const greenOpacity = useRef(new Animated.Value(0)).current;
  const redOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEmpty || displayed === prevDisplayed.current) {
      prevValue.current = value;
      prevDisplayed.current = displayed;
      return;
    }

    isUpRef.current = value >= prevValue.current;
    prevDisplayed.current = displayed;
    prevValue.current = value;

    const glowAnim = isUpRef.current ? greenOpacity : redOpacity;
    const idleAnim = isUpRef.current ? redOpacity : greenOpacity;

    // Boştaki parlamayı sıfırla
    idleAnim.setValue(0);

    const scaleTarget = isUpRef.current ? 1.08 : 0.93;

    Animated.parallel([
      // Scale: büyü/küçül → orijine dön
      Animated.sequence([
        Animated.spring(scale, {
          toValue: scaleTarget,
          useNativeDriver: true,
          damping: 8,
          stiffness: 260,
          mass: 0.4,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 150,
        }),
      ]),
      // Glow: hızlı görün, bekle, yavaş sönsün
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.delay(300),
        Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, [displayed]);

  const text = isEmpty ? '—' : `${prefix}${displayed}${suffix}`;

  return (
    <View style={styles.wrapper}>
      {/* Yeşil parlama katmanı */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.greenGlow, { opacity: greenOpacity }]}
        pointerEvents="none"
      />
      {/* Kırmızı parlama katmanı */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.redGlow, { opacity: redOpacity }]}
        pointerEvents="none"
      />
      {/* Metin — scale animasyonu */}
      <Animated.Text
        style={[styles.base, style, { transform: [{ scale }] }]}
        numberOfLines={1}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 5,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  greenGlow: {
    backgroundColor: 'rgba(0, 200, 150, 0.22)',
    borderRadius: 5,
  },
  redGlow: {
    backgroundColor: 'rgba(255, 76, 76, 0.22)',
    borderRadius: 5,
  },
  base: {
    fontVariant: ['tabular-nums'],
  },
});
