// cursorrules §4.3: NewsDetailScreen — tam haber metni, projeksiyon bilgisi, URL linki.
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { NewsStackParamList } from '@/types/navigation';
import { RiskBadge } from '@/components/news/RiskBadge';
import { AINews, MarketNews } from '@/services/news.service';
import { formatDateLong } from '@/utils';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { SectionHeader } from '@/components/common/SectionHeader';

type Props = NativeStackScreenProps<NewsStackParamList, 'NewsDetail'>;

export function NewsDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { id } = route.params;
  const qc = useQueryClient();

  // Cache'den AI haberini bul (UUID formatındaysa)
  const aiList = qc.getQueryData<AINews[]>(['news', 'ai']) ?? [];
  const aiItem = aiList.find((n) => n.id === id);

  // Cache'den piyasa haberini bul (URL olarak id geçilir)
  const marketList = qc.getQueryData<MarketNews[]>(['news', 'market']) ?? [];
  const marketItem = marketList.find((n) => n.url === id);

  if (!aiItem && !marketItem) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent.primary} />
          <Text style={styles.loadingText}>Haber yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (aiItem) {
    return <AINewsDetail item={aiItem} onBack={() => navigation.goBack()} />;
  }

  return <MarketNewsDetail item={marketItem!} onBack={() => navigation.goBack()} />;
}

// ── AI Haber Detayı ───────────────────────────────────────────────────────────

function AINewsDetail({ item, onBack }: { item: AINews; onBack: () => void }): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI Üretildi</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RiskBadge risk={item.risk_bolgesi} />
        <Text style={styles.title}>{item.haber_basligi}</Text>
        <Text style={styles.date}>{formatDateLong(item.uretim_tarihi)}</Text>
        <View style={styles.divider} />

        <View style={styles.section}>
          <SectionHeader title="Özet" style={{ marginBottom: Spacing[2] }} />
          <Text style={styles.ozet}>{item.ozet}</Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.body}>{item.haber_icerigi}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Piyasa Haber Detayı ───────────────────────────────────────────────────────

function MarketNewsDetail({ item, onBack }: { item: MarketNews; onBack: () => void }): React.JSX.Element {
  async function handleOpenURL() {
    if (item.url) {
      const supported = await Linking.canOpenURL(item.url);
      if (supported) {
        await Linking.openURL(item.url);
      }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.sourceChip}>{item.source}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <Text style={styles.title}>{item.title}</Text>

        {/* Tarih */}
        <Text style={styles.date}>{formatDateLong(item.published_at)}</Text>

        <View style={styles.divider} />

        {/* Açıklama */}
        {item.description ? (
          <Text style={styles.body}>{item.description}</Text>
        ) : null}

        {/* Habere Git butonu */}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => { void handleOpenURL(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.linkBtnText}>Habere Git →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  backBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  backText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  aiBadge: {
    backgroundColor: 'rgba(0,191,255,0.12)',
    borderColor: Colors.accent.primary,
    borderRadius: BorderRadius.badge,
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    color: Colors.accent.primary,
  },
  sourceChip: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: Colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing[4],
    paddingBottom: Spacing[8],
  },
  title: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 22,
    color: Colors.text.primary,
    lineHeight: 30,
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
  },
  date: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.disabled,
    marginBottom: Spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
    marginVertical: Spacing[4],
  },
  projCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  projTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: Spacing[3],
  },
  projRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing[1],
  },
  projDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border.subtle,
  },
  projLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.disabled,
  },
  projValue: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  section: {
    marginBottom: Spacing[4],
  },
  ozet: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  body: {
    fontFamily: FontFamily.serif.regular,
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 28,
  },
  linkBtn: {
    marginTop: Spacing[6],
    backgroundColor: Colors.accent.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  linkBtnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: '#0A0A0A',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  loadingText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
