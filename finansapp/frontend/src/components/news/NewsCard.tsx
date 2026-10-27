// cursorrules §5.4: NewsCard — AI rozeti, RiskBadge, başlık (2 satır), özet (3 satır), tarih.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AINews, MarketNews } from '@/services/news.service';
import { RiskBadge } from './RiskBadge';
import { formatDate } from '@/utils';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

// ── AI Haber Kartı ────────────────────────────────────────────────────────────
interface AINewsCardProps {
  item: AINews;
  onPress: () => void;
}

export function AINewsCard({ item, onPress }: AINewsCardProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Üst satır: AI rozeti + Risk badge */}
      <View style={styles.badgeRow}>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
        <RiskBadge risk={item.risk_bolgesi} />
      </View>

      {/* Başlık */}
      <Text style={styles.title} numberOfLines={2}>{item.haber_basligi}</Text>

      {/* Özet */}
      <Text style={styles.summary} numberOfLines={3}>{item.ozet}</Text>

      {/* Alt satır: tarih */}
      <Text style={styles.date}>{formatDate(item.uretim_tarihi)}</Text>
    </TouchableOpacity>
  );
}

// ── Piyasa Haber Kartı ────────────────────────────────────────────────────────
interface MarketNewsCardProps {
  item: MarketNews;
  onPress: () => void;
}

export function MarketNewsCard({ item, onPress }: MarketNewsCardProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Kaynak */}
      <Text style={styles.source}>{item.source}</Text>

      {/* Başlık */}
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

      {/* Açıklama */}
      {item.description ? (
        <Text style={styles.summary} numberOfLines={3}>{item.description}</Text>
      ) : null}

      {/* Tarih */}
      <Text style={styles.date}>{formatDate(item.published_at)}</Text>
    </TouchableOpacity>
  );
}

// ── Skeleton Kart ─────────────────────────────────────────────────────────────
export function NewsCardSkeleton(): React.JSX.Element {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={[styles.skLine, { width: '30%', height: 18, marginBottom: Spacing[3] }]} />
      <View style={[styles.skLine, { width: '90%', height: 14, marginBottom: Spacing[2] }]} />
      <View style={[styles.skLine, { width: '75%', height: 14, marginBottom: Spacing[3] }]} />
      <View style={[styles.skLine, { width: '60%', height: 12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  skeleton: {
    opacity: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  aiBadge: {
    backgroundColor: Colors.accent.primary,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.badge,
  },
  aiBadgeText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
  source: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    color: Colors.accent.primary,
    marginBottom: Spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: Spacing[2],
  },
  summary: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing[3],
  },
  date: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: Colors.text.disabled,
  },
  skLine: {
    borderRadius: 6,
    backgroundColor: Colors.background.elevated,
  },
});
