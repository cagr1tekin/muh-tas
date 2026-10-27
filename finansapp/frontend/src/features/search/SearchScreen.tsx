// cursorrules §4.4: SearchScreen — arama çubuğu, öne çıkan dövizler grid, son aramalar.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchStackParamList } from '@/types/navigation';
import { useCurrencies } from '@/hooks/useCurrencies';
import { currencyFlag, type Currency } from '@/services/currency.service';
import { useStrings, useLocalizedCurrencyName } from '@/services/i18n';
import { Search as SearchIcon, X, Clock, ChevronRight } from 'lucide-react-native';
import { AppHeader } from '@/components/common/AppHeader';
import { AnimatedPrice } from '@/components/common/AnimatedPrice';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

type Props = NativeStackScreenProps<SearchStackParamList, 'Search'>;

const RECENT_KEY = 'finans_recent_searches';
const MAX_RECENT = 8;
const FEATURED_CODES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'SAR'];

async function loadRecent(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveRecent(codes: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(codes.slice(0, MAX_RECENT)));
  } catch { /* AsyncStorage hata — yok say */ }
}

export function SearchScreen({ navigation }: Props): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentCodes, setRecentCodes] = useState<string[]>([]);

  const strings = useStrings();
  const getCurrencyName = useLocalizedCurrencyName();
  const { data: currencies = [] } = useCurrencies();

  // AsyncStorage'dan son aramaları yükle
  useEffect(() => {
    void loadRecent().then(setRecentCodes);
  }, []);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Local filtre — kod veya isimde ara
  const filteredCurrencies = useMemo<Currency[]>(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toUpperCase();
    return currencies.filter(
      (c) =>
        c.code.toUpperCase().includes(q) ||
        (c.name ?? '').toUpperCase().includes(q) ||
        (c.name_en ?? '').toUpperCase().includes(q),
    );
  }, [debouncedQuery, currencies]);

  // Öne çıkan dövizler
  const featuredCurrencies = useMemo(
    () =>
      FEATURED_CODES.map(
        (code) => currencies.find((c) => c.code === code) ?? { code, name: code },
      ),
    [currencies],
  );

  // Son aramalara karşılık gelen döviz nesneleri
  const recentCurrencies = useMemo(
    () =>
      recentCodes
        .map((code) => currencies.find((c) => c.code === code) ?? { code, name: code })
        .filter(Boolean) as Currency[],
    [recentCodes, currencies],
  );

  const navigateTo = useCallback(
    async (code: string) => {
      const next = [code, ...recentCodes.filter((c) => c !== code)].slice(0, MAX_RECENT);
      setRecentCodes(next);
      await saveRecent(next);
      navigation.navigate('CurrencyDetail', { code });
    },
    [recentCodes, navigation],
  );

  const clearRecent = useCallback(async () => {
    setRecentCodes([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  }, []);

  const renderResultItem = useCallback(
    ({ item }: { item: Currency }) => (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => { void navigateTo(item.code); }}
        activeOpacity={0.7}
      >
        <Text style={styles.resultFlag}>{currencyFlag(item.code)}</Text>
        <View style={styles.resultInfo}>
          <Text style={styles.resultCode}>{item.code}</Text>
          <AnimatedPrice
            value={item.buy ?? 0}
            decimals={4}
            suffix=" ₺"
            style={styles.resultPrice}
            showDash
          />
        </View>
        <ChevronRight size={16} color={Colors.text.disabled} strokeWidth={1.75} />
      </TouchableOpacity>
    ),
    [navigateTo],
  );

  const isSearching = debouncedQuery.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Global Header ── */}
      <AppHeader title={strings.discover} />

      {/* ── Arama Çubuğu ── */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={16} color={Colors.text.disabled} strokeWidth={1.75} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={strings.searchPlaceholder}
            placeholderTextColor={Colors.text.disabled}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            selectionColor={Colors.accent.primary}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={Colors.text.disabled} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        /* ── Arama Sonuçları ── */
        <FlatList
          data={filteredCurrencies}
          keyExtractor={(item) => item.code}
          renderItem={renderResultItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.resultSeparator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{strings.noResults.replace('{query}', debouncedQuery)}</Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Öne Çıkan Dövizler ── */}
          <SectionHeader title={strings.featured} style={{ marginBottom: Spacing[3] }} />
          <View style={styles.featuredGrid}>
            {featuredCurrencies.map((cur) => (
              <TouchableOpacity
                key={cur.code}
                style={styles.featuredCard}
                onPress={() => { void navigateTo(cur.code); }}
                activeOpacity={0.75}
              >
                <Text style={styles.featuredFlag}>{currencyFlag(cur.code)}</Text>
                <Text style={styles.featuredCode}>{cur.code}</Text>
                {'buy' in cur && cur.buy != null && cur.buy > 0 ? (
                  <Text style={styles.featuredPrice}>{(cur as Currency).buy!.toFixed(2)} ₺</Text>
                ) : (
                  <Text style={styles.featuredPrice}>— ₺</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Son Aramalar ── */}
          {recentCurrencies.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <SectionHeader title={strings.recentSearches} />
                <TouchableOpacity onPress={() => { void clearRecent(); }}>
                  <Text style={styles.clearRecentBtn}>{strings.clearRecents}</Text>
                </TouchableOpacity>
              </View>
              {recentCurrencies.map((cur, index) => (
                <View key={cur.code}>
                  <TouchableOpacity
                    style={styles.resultRow}
                    onPress={() => { void navigateTo(cur.code); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resultFlag}>{currencyFlag(cur.code)}</Text>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultCode}>{cur.code}</Text>
                      {'buy' in cur && cur.buy != null && cur.buy > 0 ? (
                        <Text style={styles.resultPrice}>{cur.buy.toFixed(4)} ₺</Text>
                      ) : (
                        <Text style={styles.resultPrice}>— ₺</Text>
                      )}
                    </View>
                    <Clock size={14} color={Colors.text.disabled} strokeWidth={1.75} />
                    <ChevronRight size={16} color={Colors.text.disabled} strokeWidth={1.75} />
                  </TouchableOpacity>
                  {index < recentCurrencies.length - 1 && <View style={styles.resultSeparator} />}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  searchBarContainer: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[3],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing[3],
    height: 46,
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.inter.regular,
    fontSize: 15,
    color: Colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[8],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
    marginTop: Spacing[5],
  },
  clearRecentBtn: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.accent.primary,
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    marginBottom: Spacing[2],
  },
  featuredCard: {
    width: '30.5%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[1],
  },
  featuredFlag: {
    fontSize: 24,
  },
  featuredCode: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 14,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  featuredPrice: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  resultSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 44,
  },
  resultFlag: {
    fontSize: 28,
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultCode: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 16,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  resultPrice: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: {
    paddingTop: Spacing[12],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
