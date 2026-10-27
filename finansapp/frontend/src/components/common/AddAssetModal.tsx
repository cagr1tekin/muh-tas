// cursorrules §5.4: BottomSheet → RN Modal (Expo Go uyumlu, Reanimated gerektirmez).
// İki adımlı: 1) Döviz seç  2) Miktar + alış kuru gir.
import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Currency, currencyFlag } from '@/services/currency.service';
import { useAddAsset } from '@/hooks/usePortfolio';
import { useWatchlistStore } from '@/store/watchlistStore';
import { PrimaryButton } from './PrimaryButton';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

interface AddAssetModalProps {
  visible: boolean;
  currencies: Currency[];
  onClose: () => void;
}

type Step = 'select' | 'amount';

export function AddAssetModal({
  visible,
  currencies,
  onClose,
}: AddAssetModalProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<Currency | null>(null);
  const [miktar, setMiktar] = useState('');
  const [alisKuru, setAlisKuru] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync: addAsset, isPending } = useAddAsset();
  const { add: addToWatchlist, has: isWatched } = useWatchlistStore();

  const reset = useCallback(() => {
    setStep('select');
    setSelected(null);
    setMiktar('');
    setAlisKuru('');
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSelectCurrency = useCallback((cur: Currency) => {
    setSelected(cur);
    // Anlık buy kurunu varsayılan alış kuru olarak öner
    if (cur.buy && cur.buy > 0) {
      setAlisKuru(String(cur.buy));
    }
    setStep('amount');
  }, []);

  const handleSave = useCallback(async () => {
    setError('');
    if (!selected) return;
    const miktarNum = parseFloat(miktar.replace(',', '.'));
    const kurNum = parseFloat(alisKuru.replace(',', '.'));

    if (isNaN(miktarNum) || miktarNum <= 0) {
      setError('Geçerli bir miktar girin');
      return;
    }
    if (isNaN(kurNum) || kurNum <= 0) {
      setError('Geçerli bir alış kuru girin');
      return;
    }

    try {
      await addAsset({
        doviz_kodu: selected.code,
        islem_turu: 'ALIS',
        miktar: miktarNum,
        alis_kuru: kurNum,
      });
      handleClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
      setError(msg);
    }
  }, [selected, miktar, alisKuru, addAsset, handleClose]);

  const renderCurrencyItem = useCallback(
    ({ item }: { item: Currency }) => {
      const watched = isWatched(item.code);
      return (
        <View style={styles.currencyItem}>
          {/* Portföye ekle — ana bölgeye tıklama */}
          <TouchableOpacity
            style={styles.currencyItemMain}
            onPress={() => handleSelectCurrency(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.itemFlag}>{currencyFlag(item.code)}</Text>
            <View style={styles.itemInfo}>
              <Text style={styles.itemCode}>{item.code}</Text>
              {item.name && (
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
              )}
            </View>
            {item.buy != null && item.buy > 0 && (
              <Text style={styles.itemRate}>{item.buy.toFixed(4)} ₺</Text>
            )}
          </TouchableOpacity>

          {/* Takibe Al butonu */}
          <TouchableOpacity
            style={[styles.watchBtn, watched && styles.watchBtnActive]}
            onPress={() => { void addToWatchlist(item.code).then(() => handleClose()); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.watchBtnText, watched && styles.watchBtnTextActive]}>
              {watched ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [handleSelectCurrency, addToWatchlist, isWatched, handleClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Handle + Başlık */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>
              {step === 'select' ? 'Döviz Seç' : `${selected?.code ?? ''} Ekle`}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Adım 1: Döviz listesi */}
          {step === 'select' && (
            <>
              {/* Backend bağlı değilse veya gerçek kurlar yoksa bilgi banner'ı */}
              {currencies.length > 0 && currencies[0].buy == null && (
                <View style={styles.offlineBanner}>
                  <Text style={styles.offlineBannerText}>
                    ⚠ Backend bağlantısı yok — gerçek kurlar görünmüyor.
                    Alış kurunu manuel girebilirsiniz.
                  </Text>
                </View>
              )}
              <FlatList
                data={currencies}
                keyExtractor={(item) => item.code}
                renderItem={renderCurrencyItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>
                      Döviz listesi yüklenemedi.{'\n'}Backend bağlantısını kontrol edin.
                    </Text>
                  </View>
                }
              />
            </>
          )}

          {/* Adım 2: Miktar + alış kuru */}
          {step === 'amount' && (
            <View style={styles.formContainer}>
              {/* Seçili döviz özeti */}
              <View style={styles.selectedRow}>
                <Text style={styles.selectedFlag}>{currencyFlag(selected?.code ?? '')}</Text>
                <Text style={styles.selectedCode}>{selected?.code}</Text>
                <TouchableOpacity onPress={() => setStep('select')}>
                  <Text style={styles.changeBtn}>Değiştir</Text>
                </TouchableOpacity>
              </View>

              {/* Miktar */}
              <Text style={styles.label}>Miktar (adet)</Text>
              <TextInput
                style={styles.input}
                placeholder="örn: 1000"
                placeholderTextColor={Colors.text.disabled}
                value={miktar}
                onChangeText={setMiktar}
                keyboardType="decimal-pad"
                returnKeyType="next"
                selectionColor={Colors.accent.primary}
              />

              {/* Alış kuru */}
              <Text style={styles.label}>Alış Kuru (₺)</Text>
              <TextInput
                style={styles.input}
                placeholder="örn: 38.50"
                placeholderTextColor={Colors.text.disabled}
                value={alisKuru}
                onChangeText={setAlisKuru}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectionColor={Colors.accent.primary}
              />

              {error !== '' && <Text style={styles.errorText}>{error}</Text>}

              {isPending ? (
                <ActivityIndicator color={Colors.accent.primary} style={{ marginTop: Spacing[4] }} />
              ) : (
                <PrimaryButton
                  label="Kaydet"
                  onPress={() => { void handleSave(); }}
                  style={styles.saveBtn}
                />
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.elevated,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  handle: {
    display: 'none', // presentationStyle="pageSheet" handle gösterir
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 18,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  closeBtn: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 18,
    color: Colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[1],
  },
  currencyItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    gap: Spacing[3],
  },
  watchBtn: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.badge,
  },
  watchBtnActive: {
    backgroundColor: 'rgba(0,191,255,0.12)',
  },
  watchBtnText: {
    fontSize: 18,
    color: Colors.text.disabled,
  },
  watchBtnTextActive: {
    color: Colors.accent.primary,
  },
  itemFlag: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemCode: {
    fontFamily: FontFamily.mono.medium,
    fontSize: 14,
    color: Colors.accent.primary,
  },
  itemName: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  itemRate: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 14,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border.subtle,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[3],
    marginBottom: Spacing[5],
    gap: Spacing[3],
  },
  selectedFlag: {
    fontSize: 26,
  },
  selectedCode: {
    flex: 1,
    fontFamily: FontFamily.mono.medium,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  changeBtn: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.accent.primary,
  },
  label: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: Spacing[2],
    marginTop: Spacing[4],
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
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
    marginTop: Spacing[6],
  },
  offlineBanner: {
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderBottomColor: 'rgba(255,184,0,0.25)',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  offlineBannerText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 18,
  },
  emptyList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing[12],
    paddingHorizontal: Spacing[8],
  },
  emptyListText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
