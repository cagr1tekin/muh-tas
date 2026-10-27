// cursorrules §4.2: Varlıklarım Kartı — Bento kart: Toplam K/Z (TL+%), Yatırılan.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTL } from '@/utils';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

interface PortfolioSummaryCardProps {
  totalCurrent: number;
  totalPurchase: number;
  totalPL: number;
  totalPLPct: number;
}

export function PortfolioSummaryCard({
  totalCurrent,
  totalPurchase,
  totalPL,
  totalPLPct,
}: PortfolioSummaryCardProps): React.JSX.Element {
  const isPositive = totalPL >= 0;
  const plColor = isPositive ? Colors.success : Colors.danger;
  const plBg = isPositive ? 'rgba(0,200,150,0.10)' : 'rgba(255,76,76,0.10)';
  const sign = isPositive ? '+' : '';

  return (
    <View style={styles.card}>
      {/* Sol: K/Z */}
      <View style={styles.section}>
        <Text style={styles.label}>Kar / Zarar</Text>
        <Text style={[styles.plValue, { color: plColor }]}>
          {sign}{formatTL(totalPL)} ₺
        </Text>
        <View style={[styles.pctBadge, { backgroundColor: plBg }]}>
          <Text style={[styles.pctText, { color: plColor }]}>
            {sign}{totalPLPct.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Dikey ayraç */}
      <View style={styles.divider} />

      {/* Sağ: Yatırılan + Anlık Değer */}
      <View style={styles.section}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Yatırılan</Text>
          <Text style={styles.metaValue}>{formatTL(totalPurchase)} ₺</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Anlık Değer</Text>
          <Text style={styles.metaValue}>{formatTL(totalCurrent)} ₺</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    marginBottom: Spacing[5],
  },
  section: {
    flex: 1,
  },
  label: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: Spacing[1],
  },
  plValue: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    marginBottom: Spacing[1],
  },
  pctBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.badge,
  },
  pctText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.background.elevated,
    marginHorizontal: Spacing[4],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  metaLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  metaValue: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 13,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
});
