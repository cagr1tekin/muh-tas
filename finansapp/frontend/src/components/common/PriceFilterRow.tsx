import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '@/theme';
import { FontFamily } from '@/theme/typography';

export interface FilterChip {
  label: string;
  value: string;
}

interface PriceFilterRowProps {
  amount?: string;
  pct?: string;
  hint?: string;
  color: string;
  chips: FilterChip[];
  activeChip: string;
  onChipPress: (value: string) => void;
  style?: ViewStyle;
}

export function PriceFilterRow({
  amount,
  pct,
  hint,
  color,
  chips,
  activeChip,
  onChipPress,
  style,
}: PriceFilterRowProps): React.JSX.Element {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {hint != null ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : (
          <>
            {amount != null && (
              <Text style={[styles.amount, { color }]}>{amount}</Text>
            )}
            {pct != null && (
              <Text style={[styles.pct, { color }]}>{pct}</Text>
            )}
          </>
        )}
      </View>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <TouchableOpacity
            key={chip.value}
            style={[styles.chip, activeChip === chip.value && styles.chipActive]}
            onPress={() => onChipPress(chip.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeChip === chip.value && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing[2],
  },
  amount: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  pct: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.disabled,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  chip: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    minWidth: 28,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.accent.primary,
  },
  chipText: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: '#0A0A0A',
  },
});
