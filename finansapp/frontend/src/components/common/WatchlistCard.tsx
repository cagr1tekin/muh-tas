import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Currency, currencyFlag, findRate } from '@/services/currency.service';
import { AnimatedPrice } from './AnimatedPrice';
import { useStrings, useLocalizedCurrencyName } from '@/services/i18n';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

interface WatchlistCardProps {
  code: string;
  currencies: Currency[];
  onPress: (code: string) => void;
  onRemove: (code: string) => void;
  isLast?: boolean;
}

export function WatchlistCard({ code, currencies, onPress, onRemove, isLast }: WatchlistCardProps): React.JSX.Element {
  const swipeRef = useRef<Swipeable>(null);
  const strings = useStrings();
  const getCurrencyName = useLocalizedCurrencyName();
  const currency = currencies.find((c) => c.code.toUpperCase() === code.toUpperCase());
  const rate = findRate(currencies, code);
  const name = getCurrencyName(currency) || code;

  function close() {
    swipeRef.current?.close();
  }

  function renderRightActions(_: unknown, dragX: Animated.AnimatedInterpolation<number>) {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.85],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.actions, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => { close(); onRemove(code); }}
          activeOpacity={0.8}
        >
          <Text style={styles.removeText}>{strings.remove}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        friction={2}
        overshootRight={false}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => onPress(code)}
          activeOpacity={0.75}
        >
          <View style={styles.row}>
            {/* Sol: bayrak + kod + ülke adı */}
            <View style={styles.left}>
              <Text style={styles.flag}>{currencyFlag(code)}</Text>
              <View style={styles.labelBlock}>
                <Text style={styles.code}>{code}</Text>
                <Text style={styles.name}>{name}</Text>
              </View>
            </View>

            {/* Sağ: anlık kur */}
            <View style={styles.right}>
              <AnimatedPrice
                value={rate}
                decimals={2}
                suffix=" ₺"
                style={styles.rate}
                showDash
              />
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
      {!isLast && <View style={styles.separator} />}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing[4],
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 44,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  flag: {
    fontSize: 28,
  },
  labelBlock: {
    gap: 4,
  },
  code: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 16,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  name: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  rate: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 17,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  noData: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 17,
    color: Colors.text.disabled,
  },
  actions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: Spacing[2],
  },
  removeBtn: {
    width: 70,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: Colors.danger,
  },
  removeText: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
