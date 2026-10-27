import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RiskBadge } from '@/components/news/RiskBadge';
import { PortfolioAnalysis, DovizOneri } from '@/types/portfolio';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

const ONERI_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  AL:  { label: 'AL',  bg: Colors.success,              text: '#0A0A0A' },
  TUT: { label: 'TUT', bg: Colors.background.elevated,  text: Colors.text.secondary },
  SAT: { label: 'SAT', bg: Colors.danger,               text: '#FFFFFF' },
};

interface Props {
  analysis: PortfolioAnalysis | undefined;
  isLoading: boolean;
  error: string | null;
}

function OneriBadge({ oneri }: { oneri: string }) {
  const cfg = ONERI_CONFIG[oneri] ?? ONERI_CONFIG.TUT;
  return (
    <View style={[styles.oneriBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.oneriText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export function PortfolioAnalysisCard({ analysis, isLoading, error }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Portföy Analizi</Text>
        {isLoading && <ActivityIndicator size="small" color={Colors.accent.primary} />}
      </View>

      {isLoading && (
        <Text style={styles.loadingText}>Qwen modeli analiz yapıyor...</Text>
      )}

      {error && !analysis && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {analysis && (
        <>
          <View style={styles.riskRow}>
            <RiskBadge risk={analysis.risk_bolgesi} />
            <View style={styles.projRow}>
              <Text style={styles.projLabel}>3 ay</Text>
              <Text style={styles.projValue}>{analysis.projeksiyon_3_ay.toFixed(2)} ₺</Text>
              <Text style={[styles.projLabel, { marginLeft: Spacing[3] }]}>6 ay</Text>
              <Text style={styles.projValue}>{analysis.projeksiyon_6_ay.toFixed(2)} ₺</Text>
            </View>
          </View>

          {!!analysis.portfoy_aciklamasi && (
            <Text style={styles.summaryText}>{analysis.portfoy_aciklamasi}</Text>
          )}

          {/* Gemini açıklamalı öneriler */}
          {(analysis.doviz_aciklamalari ?? []).length > 0 && (
            <View style={styles.oneriList}>
              {(analysis.doviz_aciklamalari ?? []).map((d) => (
                <View key={d.doviz_kodu} style={styles.oneriRow}>
                  <View style={styles.oneriLeft}>
                    <Text style={styles.oneriKod}>{d.doviz_kodu}</Text>
                    <OneriBadge oneri={d.oneri} />
                  </View>
                  <Text style={styles.oneriAciklama} numberOfLines={2}>{d.aciklama}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Sadece Qwen kararları (Gemini açıklaması yoksa) */}
          {(analysis.doviz_aciklamalari ?? []).length === 0 &&
            (analysis.doviz_onerileri ?? []).length > 0 && (
            <View style={styles.oneriList}>
              {(analysis.doviz_onerileri ?? []).map((d: DovizOneri) => (
                <View key={d.doviz_kodu} style={styles.oneriRow}>
                  <View style={styles.oneriLeft}>
                    <Text style={styles.oneriKod}>{d.doviz_kodu}</Text>
                    <OneriBadge oneri={d.oneri} />
                  </View>
                  <Text style={styles.oneriAciklama} numberOfLines={2}>{d.gerekce}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.cacheNote}>15 dakikada bir güncellenir</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  title: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: Colors.text.primary,
  },
  loadingText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: Spacing[2],
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  projRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  projLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: Colors.text.secondary,
  },
  projValue: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  summaryText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing[3],
  },
  oneriList: {
    gap: Spacing[2],
  },
  oneriRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.badge,
    padding: Spacing[2],
  },
  oneriLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    minWidth: 80,
  },
  oneriKod: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: Colors.text.primary,
  },
  oneriBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  oneriText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  oneriAciklama: {
    flex: 1,
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 17,
  },
  cacheNote: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 10,
    color: Colors.text.disabled,
    marginTop: Spacing[3],
    textAlign: 'right',
  },
  errorText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.danger,
  },
});
