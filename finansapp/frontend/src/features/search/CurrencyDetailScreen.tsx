// cursorrules §4.4: CurrencyDetailScreen — anlık kur, grafik crosshair, period chip'leri, istatistikler, takip.
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchStackParamList, HomeStackParamList } from '@/types/navigation';
import { useCurrencyDetail } from '@/hooks/useCurrencyDetail';
import { useAllCurrencyHistory, type HistoryPeriod } from '@/hooks/useCurrencyHistory';
import { useWatchlistStore } from '@/store/watchlistStore';
import { currencyFlag } from '@/services/currency.service';
import { formatRate, formatPercent } from '@/utils';
import { LineChart } from '@/components/charts/LineChart';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AnimatedPrice } from '@/components/common/AnimatedPrice';
import { PriceFilterRow } from '@/components/common/PriceFilterRow';
import { Bookmark } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings } from '@/services/i18n';

type Props =
  | NativeStackScreenProps<SearchStackParamList, 'CurrencyDetail'>
  | NativeStackScreenProps<HomeStackParamList, 'CurrencyDetail'>;

const PERIODS: { label: string; value: HistoryPeriod }[] = [
  { label: 'G', value: '1d' },
  { label: 'H', value: '1w' },
  { label: 'A', value: '1m' },
  { label: 'D', value: '3m' },
  { label: 'Y', value: '1y' },
];

function StatRow({ label, value, valueColor = Colors.text.primary, valueNode }: {
  label: string;
  value?: string;
  valueColor?: string;
  valueNode?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={statRowStyle.row}>
      <Text style={statRowStyle.label}>{label}</Text>
      {valueNode ?? (
        <Text style={[statRowStyle.value, { color: valueColor }]} numberOfLines={1}>{value}</Text>
      )}
    </View>
  );
}

const statRowStyle = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  label: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  value: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});

export function CurrencyDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { code } = route.params;
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriod>('1w');
  const [scrubRate, setScrubRate] = useState<number | null>(null);

  const { data: detail, isLoading: detailLoading } = useCurrencyDetail(code);
  const { dataMap, isInitialLoading } = useAllCurrencyHistory(code);
  const history = dataMap[selectedPeriod] ?? [];
  const { add, remove, has } = useWatchlistStore();
  const isWatched = has(code);
  const strings = useStrings();

  const stats = useMemo(() => {
    if (!history || history.length < 2) return null;
    const rates = history.map((p) => p.rate);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const firstRate = rates[0];
    const lastRate = rates[rates.length - 1];
    const changePct = firstRate > 0 ? ((lastRate - firstRate) / firstRate) * 100 : 0;
    const changeAbs = lastRate - firstRate;
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const variance = rates.reduce((s, r) => s + (r - avgRate) ** 2, 0) / rates.length;
    const volatility = avgRate > 0 ? (Math.sqrt(variance) / avgRate) * 100 : 0;
    return { maxRate, minRate, changePct, changeAbs, avgRate, volatility };
  }, [history]);

  const currentRate = detail?.buy ?? detail?.sell ?? (history.length > 0 ? history[history.length - 1].rate : 0);
  const displayRate = scrubRate ?? currentRate;
  const isScrubbing = scrubRate !== null;
  const isPositive = (stats?.changePct ?? 0) >= 0;
  const changeColor = isPositive ? Colors.success : Colors.danger;

  const firstRate = history.length > 0 ? history[0].rate : 0;
  const scrubChange = isScrubbing && firstRate > 0 ? (scrubRate ?? 0) - firstRate : null;
  const scrubChangePct = scrubChange !== null && firstRate > 0 ? (scrubChange / firstRate) * 100 : null;
  const scrubIsPositive = (scrubChange ?? 0) >= 0;
  const scrubColor = scrubIsPositive ? Colors.success : Colors.danger;

  const handleScrub = useCallback((rate: number | null, _date: string | null) => {
    setScrubRate(rate);
  }, []);

  function handleWatchlistToggle() {
    if (isWatched) void remove(code);
    else void add(code);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Üst Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.titleFlag}>{currencyFlag(code)}</Text>
          <View>
            <Text style={styles.titleCode}>{code}</Text>
            {detail?.name && (
              <Text style={styles.titleName} numberOfLines={1}>{detail.name}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.watchBtn}
          onPress={handleWatchlistToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bookmark
            size={17}
            color={Colors.text.primary}
            fill={isWatched ? Colors.text.primary : 'none'}
            strokeWidth={1.75}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Fiyat ── */}
        <View style={styles.priceSection}>
          {detailLoading && !currentRate ? (
            <ActivityIndicator color={Colors.accent.primary} />
          ) : (
            <AnimatedPrice
              value={displayRate}
              decimals={2}
              suffix=" ₺"
              style={styles.priceValue}
              showDash
            />
          )}
        </View>

        {/* ── Değişim + Period Filtresi ── */}
        <PriceFilterRow
          amount={
            isScrubbing && scrubChange !== null
              ? `${scrubIsPositive ? '+' : ''}${formatRate(scrubChange)} ₺`
              : stats
              ? `${isPositive ? '+' : ''}${formatRate(stats.changeAbs)} ₺`
              : undefined
          }
          pct={
            isScrubbing && scrubChangePct !== null
              ? formatPercent(scrubChangePct)
              : stats
              ? formatPercent(stats.changePct)
              : undefined
          }
          color={isScrubbing ? scrubColor : changeColor}
          chips={PERIODS}
          activeChip={selectedPeriod}
          onChipPress={(v) => setSelectedPeriod(v as HistoryPeriod)}
          style={styles.changeFilterRow}
        />

        {/* ── Grafik ── */}
        <View style={styles.chartWrap}>
          {isInitialLoading && history.length === 0 ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={Colors.accent.primary} />
            </View>
          ) : (
            <LineChart
              data={history}
              height={220}
              color={isPositive ? Colors.success : Colors.danger}
              period={selectedPeriod}
              onScrub={handleScrub}
            />
          )}
        </View>

        {/* ── İstatistikler ── */}
        {stats && (
          <View style={styles.statsSection}>
            <SectionHeader title={strings.statistics} style={{ paddingLeft: Spacing[1] }} />
            <StatRow
              label={selectedPeriod === '1y' ? strings.weekHigh : strings.periodHigh}
              value={`${formatRate(stats.maxRate)} ₺`}
              valueColor={Colors.success}
            />
            <View style={styles.statSeparator} />
            <StatRow
              label={selectedPeriod === '1y' ? strings.weekLow : strings.periodLow}
              value={`${formatRate(stats.minRate)} ₺`}
              valueColor={Colors.danger}
            />
            <View style={styles.statSeparator} />
            <StatRow
              label={strings.changeAbs}
              value={`${stats.changeAbs >= 0 ? '+' : ''}${formatRate(stats.changeAbs)} ₺`}
              valueColor={changeColor}
            />
            <View style={styles.statSeparator} />
            <StatRow
              label={strings.changePct}
              value={formatPercent(stats.changePct)}
              valueColor={changeColor}
            />
            <View style={styles.statSeparator} />
            <StatRow
              label={strings.periodAvg}
              value={`${formatRate(stats.avgRate)} ₺`}
            />
            <View style={styles.statSeparator} />
            <StatRow
              label={strings.volatility}
              value={`${stats.volatility.toFixed(2)}%`}
              valueColor={Colors.text.secondary}
            />
            {detail?.buy != null && detail.buy > 0 && (
              <>
                <View style={styles.statSeparator} />
                <StatRow
                  label={strings.instantBuy}
                  valueNode={
                    <AnimatedPrice value={detail.buy} decimals={2} suffix=" ₺" style={statRowStyle.value} />
                  }
                />
              </>
            )}
            {detail?.sell != null && detail.sell > 0 && (
              <>
                <View style={styles.statSeparator} />
                <StatRow
                  label={strings.instantSell}
                  valueNode={
                    <AnimatedPrice value={detail.sell} decimals={2} suffix=" ₺" style={statRowStyle.value} />
                  }
                />
              </>
            )}
          </View>
        )}

        {/* Veri yok */}
        {!isInitialLoading && history.length === 0 && (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>{strings.noChartData}</Text>
          </View>
        )}
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
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  backText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  titleFlag: {
    fontSize: 28,
  },
  titleCode: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 18,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  titleName: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  watchBtn: {
    padding: Spacing[2],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing[10],
  },
  priceSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[5],
    alignItems: 'center',
  },
  priceValue: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 36,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  changeFilterRow: {
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  chartWrap: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[2],
    minHeight: 220,
    justifyContent: 'center',
  },
  chartLoading: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  statSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  noDataCard: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[4],
    alignItems: 'center',
  },
  noDataText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
