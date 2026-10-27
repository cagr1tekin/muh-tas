// cursorrules §5.4: RiskBadge — RISKLI/GUVENLI/NOTR renk ve metin tanımları.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/theme';
import { FontFamily } from '@/theme/typography';

export type RiskLevel = 'RISKLI' | 'GUVENLI' | 'NOTR';

interface RiskBadgeProps {
  risk: RiskLevel;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string }> = {
  RISKLI:  { label: '⚠ RİSKLİ',  bg: Colors.danger,   text: '#FFFFFF' },
  GUVENLI: { label: '✓ GÜVENLİ', bg: Colors.success,  text: '#0A0A0A' },
  NOTR:    { label: '— NÖTR',    bg: Colors.warning,  text: '#0A0A0A' },
};

export function RiskBadge({ risk }: RiskBadgeProps): React.JSX.Element {
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.NOTR;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.badge,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
