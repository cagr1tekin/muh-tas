import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { X, Bookmark, Check } from 'lucide-react-native';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useAddAsset } from '@/hooks/usePortfolio';
import { useWatchlistStore } from '@/store/watchlistStore';
import { Currency, currencyFlag } from '@/services/currency.service';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings, useLocalizedCurrencyName } from '@/services/i18n';

type Step = 'select' | 'amount';

export function AddAssetScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { data: currencies = [] } = useCurrencies();
  const { mutateAsync: addAsset, isPending } = useAddAsset();
  const { add: addToWatchlist, has: isWatched } = useWatchlistStore();

  const strings = useStrings();
  const getCurrencyName = useLocalizedCurrencyName();

  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<Currency | null>(null);
  const [miktar, setMiktar] = useState('');
  const [alisKuru, setAlisKuru] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSelectCurrency = useCallback((cur: Currency) => {
    setSelected(cur);
    if (cur.buy && cur.buy > 0) setAlisKuru(cur.buy.toFixed(4));
    setStep('amount');
    setQuery('');
  }, []);

  const handleSave = useCallback(async () => {
    setError('');
    if (!selected) return;
    const miktarNum = parseFloat(miktar.replace(',', '.'));
    const kurNum = parseFloat(alisKuru.replace(',', '.'));
    if (isNaN(miktarNum) || miktarNum <= 0) { setError(strings.invalidQuantity); return; }
    if (isNaN(kurNum) || kurNum <= 0) { setError(strings.invalidRate); return; }
    try {
      await addAsset({ doviz_kodu: selected.code, islem_turu: 'ALIS', miktar: miktarNum, alis_kuru: kurNum });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : strings.anErrorOccurred);
    }
  }, [selected, miktar, alisKuru, addAsset, handleClose]);

  const filtered = query.trim()
    ? currencies.filter((c) =>
        c.code.toUpperCase().includes(query.toUpperCase()) ||
        (c.name ?? '').toUpperCase().includes(query.toUpperCase()),
      )
    : currencies;

  const renderItem = useCallback(
    ({ item }: { item: Currency }) => {
      const watched = isWatched(item.code);
      return (
        <TouchableOpacity
          style={styles.currencyRow}
          onPress={() => handleSelectCurrency(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.flag}>{currencyFlag(item.code)}</Text>
          <View style={styles.rowInfo}>
            <Text style={styles.rowCode}>{item.code}</Text>
            {getCurrencyName(item) ? <Text style={styles.rowName} numberOfLines={1}>{getCurrencyName(item)}</Text> : null}
          </View>
          {item.buy != null && item.buy > 0 && (
            <Text style={styles.rowRate}>{item.buy.toFixed(4)} ₺</Text>
          )}
          <TouchableOpacity
            style={styles.watchBtn}
            onPress={() => { void addToWatchlist(item.code); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bookmark
              size={17}
              color={Colors.text.primary}
              fill={watched ? Colors.text.primary : 'none'}
              strokeWidth={1.75}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handleSelectCurrency, addToWatchlist, isWatched],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Üst bar ── */}
        <View style={styles.topBar}>
          {step === 'amount' ? (
            <TouchableOpacity onPress={() => setStep('select')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backText}>{strings.back}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48 }} />
          )}
          <Text style={styles.topBarTitle}>
            {step === 'select' ? strings.addAssetTitle : strings.addCurrency.replace('{code}', selected?.code ?? '')}
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={Colors.text.secondary} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>

        {/* ── Adım 1: Döviz seç ── */}
        {step === 'select' && (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={strings.searchCurrencyPlaceholder}
                placeholderTextColor={Colors.text.disabled}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="characters"
                autoCorrect={false}
                selectionColor={Colors.accent.primary}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{strings.noCurrencyFound}</Text>
                </View>
              }
            />
          </>
        )}

        {/* ── Adım 2: Miktar + alış kuru ── */}
        {step === 'amount' && (
          <View style={styles.formSection}>
            {/* Seçili döviz kartı */}
            <View style={styles.selectedCard}>
              <Text style={styles.selectedFlag}>{currencyFlag(selected?.code ?? '')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedCode}>{selected?.code}</Text>
                {getCurrencyName(selected ?? undefined) ? (
                  <Text style={styles.selectedName}>{getCurrencyName(selected ?? undefined)}</Text>
                ) : null}
              </View>
              {selected?.buy != null && selected.buy > 0 && (
                <Text style={styles.selectedRate}>{selected.buy.toFixed(4)} ₺</Text>
              )}
            </View>

            {/* Miktar */}
            <Text style={styles.label}>{strings.quantityLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={strings.quantityPlaceholder}
              placeholderTextColor={Colors.text.disabled}
              value={miktar}
              onChangeText={setMiktar}
              keyboardType="decimal-pad"
              returnKeyType="next"
              selectionColor={Colors.accent.primary}
            />

            {/* Alış kuru */}
            <Text style={styles.label}>{strings.buyRateLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={strings.buyRatePlaceholder}
              placeholderTextColor={Colors.text.disabled}
              value={alisKuru}
              onChangeText={setAlisKuru}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={() => { void handleSave(); }}
              selectionColor={Colors.accent.primary}
            />

            {error !== '' && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.saveBtn, isPending && styles.saveBtnDisabled]}
              onPress={() => { void handleSave(); }}
              activeOpacity={0.85}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <>
                  <Check size={18} color="#0A0A0A" strokeWidth={2.5} />
                  <Text style={styles.saveBtnText}>{strings.addToPortfolio}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
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
  backText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.accent.primary,
    minWidth: 48,
  },
  topBarTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 17,
    color: Colors.text.primary,
  },
  searchContainer: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  searchInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.inter.regular,
    fontSize: 15,
    color: Colors.text.primary,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  flag: {
    fontSize: 28,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  rowCode: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 16,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  rowName: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  rowRate: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 17,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  watchBtn: {
    padding: Spacing[2],
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 44,
  },
  empty: {
    paddingTop: Spacing[12],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[4],
    marginBottom: Spacing[5],
    gap: Spacing[3],
  },
  selectedFlag: {
    fontSize: 32,
  },
  selectedCode: {
    fontFamily: FontFamily.mono.medium,
    fontSize: 18,
    color: Colors.accent.primary,
  },
  selectedName: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  selectedRate: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 16,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[2],
    marginTop: Spacing[4],
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.inter.regular,
    fontSize: 17,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.danger,
    marginTop: Spacing[3],
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginTop: Spacing[6],
    backgroundColor: Colors.accent.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: '#0A0A0A',
  },
});
