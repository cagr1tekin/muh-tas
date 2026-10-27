// cursorrules §4.2: HomeScreen — selamlama, portföy özet, varlık listesi, takip listesi, FAB.
// cursorrules §3.4: TanStack Query sunucu verisi, Zustand cross-screen state, useState tek ekran.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/types/navigation';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useAlertChecker } from '@/hooks/useAlertChecker';
import { usePortfolioAnalysis } from '@/hooks/usePortfolioAnalysis';
import { AssetCard } from '@/components/common/AssetCard';
import { AssetActionSheet } from '@/components/common/AssetActionSheet';
import { WatchlistCard } from '@/components/common/WatchlistCard';
import { PriceFilterRow } from '@/components/common/PriceFilterRow';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AppHeader } from '@/components/common/AppHeader';
import { findRate } from '@/services/currency.service';
import { formatTL, displayName } from '@/utils';
import { AssetViewModel } from '@/types/portfolio';
import { useAuthStore } from '@/store/authStore';
import { useWatchlistStore } from '@/store/watchlistStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useStrings, useGreeting } from '@/services/i18n';
import { convertFromTRY, currencySymbol } from '@/utils';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

// Skeleton kart — yükleme göstergesi
function SkeletonCard(): React.JSX.Element {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.circle} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[skeletonStyles.line, { width: '40%' }]} />
        <View style={[skeletonStyles.line, { width: '70%' }]} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={[skeletonStyles.line, { width: 80 }]} />
        <View style={[skeletonStyles.line, { width: 50 }]} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[3],
    opacity: 0.4,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.elevated,
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.background.elevated,
  },
});

type HomeNav = NativeStackNavigationProp<HomeStackParamList>;
type PLMode = 'total' | 'daily' | 'weekly';

export function HomeScreen(): React.JSX.Element {
  useAlertChecker();

  const navigation = useNavigation<HomeNav>();
  const user = useAuthStore((s) => s.user);
  const { codes: watchlistCodes, remove: removeFromWatchlist, hydrate: hydrateWatchlist } = useWatchlistStore();
  const preferredCurrency = usePreferencesStore((s) => s.currency);
  const strings = useStrings();
  const greeting = useGreeting();

  const [actionAsset, setActionAsset] = useState<AssetViewModel | null>(null);
  const [plMode, setPLMode] = useState<PLMode>('total');

  // Takip listesini uygulama açılışında yükle
  useEffect(() => {
    void hydrateWatchlist();
  }, [hydrateWatchlist]);

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    isRefetching,
    refetch,
  } = usePortfolio();

  const { data: currencies, isLoading: currenciesLoading } = useCurrencies();

  // hasAssets: portfolio yüklendi ve en az 1 ALIS kaydı var
  const hasAssets = (portfolio?.filter((a) => a.islem_turu === 'ALIS').length ?? 0) > 0;

  const {
    lastAnalysis: analysisData,
    isAnalyzing: analysisLoading,
    canAnalyze,
    triggerAnalysis,
  } = usePortfolioAnalysis(hasAssets);

  const isLoading = portfolioLoading || currenciesLoading;

  // Her asset için K/Z hesaplayan ViewModel listesi (plMode'a göre baz kur değişir)
  const viewModels = useMemo<AssetViewModel[]>(() => {
    if (!portfolio || !currencies) return [];
    return portfolio.map((asset) => {
      const cur = currencies.find((c) => c.code.toUpperCase() === asset.doviz_kodu.toUpperCase());
      const rate = findRate(currencies, asset.doviz_kodu);
      const currentValue = asset.miktar * rate;
      const purchaseValue = asset.miktar * asset.alis_kuru;

      let baseRate: number;
      if (plMode === 'daily') {
        baseRate = cur?.buy_1d_ago ?? rate;
      } else if (plMode === 'weekly') {
        baseRate = cur?.buy_1w_ago ?? rate;
      } else {
        baseRate = asset.alis_kuru;
      }

      const baseValue = asset.miktar * baseRate;
      const profitLoss = currentValue - baseValue;
      const profitLossPct = baseValue > 0 ? (profitLoss / baseValue) * 100 : 0;

      return {
        ...asset,
        currentRate: rate,
        currentValue,
        purchaseValue,
        profitLoss,
        profitLossPct,
      };
    });
  }, [portfolio, currencies, plMode]);

  // Toplam portföy özet değerleri (profitLoss zaten plMode'a göre hesaplı)
  const summary = useMemo(() => {
    const totalCurrent = viewModels.reduce((s, a) => s + a.currentValue, 0);
    const totalPurchase = viewModels.reduce((s, a) => s + a.purchaseValue, 0);
    const totalPL = viewModels.reduce((s, a) => s + a.profitLoss, 0);
    const totalBase = totalCurrent - totalPL;
    const totalPLPct = totalBase > 0 ? (totalPL / totalBase) * 100 : 0;
    return { totalCurrent, totalPurchase, totalPL, totalPLPct };
  }, [viewModels]);

  // Portföyde olmayan watchlist kodları
  const portfolioCodes = new Set(viewModels.map((v) => v.doviz_kodu.toUpperCase()));
  const filteredWatchlist = watchlistCodes.filter((c) => !portfolioCodes.has(c.toUpperCase()));

  const name = displayName(user);
  const fullTitle = name ? `${greeting}, ${name}` : greeting;
  const greetingTitle = fullTitle.length > 22 ? greeting : fullTitle;

  // Referans para birimine göre dönüşüm
  const usdRate = currencies ? currencies.find((c) => c.code === 'USD')?.buy ?? 0 : 0;
  const eurRate = currencies ? currencies.find((c) => c.code === 'EUR')?.buy ?? 0 : 0;
  const fxRates = { USD: usdRate, EUR: eurRate };
  const sym = currencySymbol(preferredCurrency);
  const displayTotal = convertFromTRY(summary.totalCurrent, preferredCurrency, fxRates);
  const displayPL = convertFromTRY(summary.totalPL, preferredCurrency, fxRates);

  const isPlPositive = summary.totalPL >= 0;
  const plColor = isPlPositive ? Colors.success : Colors.danger;
  const plSign = isPlPositive ? '+' : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── GLOBAL HEADER ── */}
      <AppHeader title={greetingTitle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { void refetch(); }}
            tintColor={Colors.accent.primary}
            colors={[Colors.accent.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Toplam Portföy Değeri ── */}
        <View style={styles.headerSection}>
          <Text style={styles.totalLabel}>{strings.totalPortfolioValue}</Text>
          <Text style={styles.totalValue}>{sym}{formatTL(displayTotal)}</Text>
        </View>

        {/* ── K/Z Özeti + Periyot Filtresi ── */}
        {viewModels.length > 0 && (
          <PriceFilterRow
            amount={`${plSign}${sym}${formatTL(Math.abs(displayPL))}`}
            pct={`${summary.totalPLPct.toFixed(2)}%`}
            color={plColor}
            chips={[
              { label: 'G', value: 'daily' },
              { label: 'H', value: 'weekly' },
              { label: 'T', value: 'total' },
            ]}
            activeChip={plMode}
            onChipPress={(v) => setPLMode(v as PLMode)}
            style={styles.plFilterRow}
          />
        )}

        {/* ── AI ANALİZ ── */}
        {hasAssets && (
          <>
            <View style={styles.analysisSectionRow}>
              <SectionHeader title="AI Analiz" style={styles.analysisSectionHeader} />
              <TouchableOpacity
                style={[styles.analyzeBtn, (!canAnalyze) && styles.analyzeBtnDisabled]}
                onPress={() => { void triggerAnalysis(); }}
                disabled={!canAnalyze}
                activeOpacity={0.7}
              >
                {analysisLoading ? (
                  <ActivityIndicator size={12} color="#0A0A0A" />
                ) : (
                  <Text style={[styles.analyzeBtnText, (!canAnalyze) && styles.analyzeBtnTextDisabled]}>
                    Analiz Et
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            {analysisLoading && (
              <Text style={styles.analysisLoading}>Analiz yapılıyor, bu 1-2 dakika sürebilir…</Text>
            )}
            {analysisData?.ozet ? (
              <Text style={styles.analysisOzet}>{analysisData.ozet}</Text>
            ) : !analysisLoading ? (
              <Text style={styles.analysisEmpty}>Portföyünüz için henüz analiz yapılmadı.</Text>
            ) : null}
          </>
        )}

        {/* ── VARLIKLARIM BÖLÜMÜ ── */}
        <SectionHeader title={strings.myAssets} style={{ marginTop: Spacing[4] }} />

        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : viewModels.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Text style={styles.inlineEmptyText}>{strings.noAssets}</Text>
          </View>
        ) : (
          viewModels.map((item, index) => {
            const code = item.doviz_kodu.toUpperCase();
            const aiOneri =
              analysisData?.doviz_aciklamalari?.find(d => d.doviz_kodu.toUpperCase() === code) ??
              analysisData?.doviz_onerileri?.find(d => d.doviz_kodu.toUpperCase() === code) ??
              null;
            return (
              <AssetCard
                key={item.id}
                asset={item}
                onPress={(a) => navigation.navigate('CurrencyDetail', { code: a.doviz_kodu })}
                onBuy={(a) => setActionAsset(a)}
                onSell={(a) => setActionAsset(a)}
                isLast={index === viewModels.length - 1}
                aiOneri={aiOneri}
              />
            );
          })
        )}

        {/* ── TAKİP LİSTESİ BÖLÜMÜ ── */}
        {filteredWatchlist.length > 0 && (
          <>
            <SectionHeader title={strings.watchlist} style={{ marginTop: Spacing[5] }} />
            {currencies ? (
              filteredWatchlist.map((code, index) => (
                <WatchlistCard
                  key={code}
                  code={code}
                  currencies={currencies}
                  onPress={(c) => navigation.navigate('CurrencyDetail', { code: c })}
                  onRemove={(c) => { void removeFromWatchlist(c); }}
                  isLast={index === filteredWatchlist.length - 1}
                />
              ))
            ) : (
              <ActivityIndicator color={Colors.accent.primary} style={{ marginTop: Spacing[4] }} />
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <AssetActionSheet
        asset={actionAsset}
        onClose={() => setActionAsset(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  headerSection: {
    paddingBottom: Spacing[5],
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: Spacing[1],
  },
  totalValue: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 36,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  plFilterRow: {
    marginBottom: Spacing[4],
  },
  sectionSubtitle: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.disabled,
    marginBottom: Spacing[3],
  },
  analysisSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[4],
  },
  analysisSectionHeader: {
    marginTop: 0,
  },
  analyzeBtn: {
    backgroundColor: Colors.accent.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnDisabled: {
    opacity: 0.35,
  },
  analyzeBtnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: '#0A0A0A',
  },
  analyzeBtnTextDisabled: {
    color: '#0A0A0A',
  },
  analysisLoading: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
  },
  analysisOzet: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
  },
  analysisEmpty: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.disabled,
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
  },
  inlineEmpty: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    alignItems: 'center',
  },
  inlineEmptyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

