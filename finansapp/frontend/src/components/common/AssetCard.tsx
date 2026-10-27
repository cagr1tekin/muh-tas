import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Modal, Pressable,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { AssetViewModel, DovizAciklama, DovizOneri } from '@/types/portfolio';
import { currencyFlag } from '@/services/currency.service';
import { formatTL } from '@/utils';
import { Eye } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings } from '@/services/i18n';

const ONERI_COLOR: Record<string, string> = {
  AL:  Colors.success,
  TUT: Colors.accent.primary,
  SAT: Colors.danger,
};

interface AssetCardProps {
  asset: AssetViewModel;
  onPress?: (asset: AssetViewModel) => void;
  onBuy?: (asset: AssetViewModel) => void;
  onSell?: (asset: AssetViewModel) => void;
  isLast?: boolean;
  aiOneri?: DovizAciklama | DovizOneri | null;
}

function AIPopup({ oneri, onClose }: { oneri: DovizAciklama | DovizOneri; onClose: () => void }) {
  const color = ONERI_COLOR[oneri.oneri] ?? Colors.accent.primary;
  const aciklama = 'aciklama' in oneri ? oneri.aciklama : oneri.gerekce;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={popup.overlay} onPress={onClose}>
        <Pressable style={popup.box} onPress={() => {}}>
          <View style={popup.header}>
            <Text style={popup.title}>Öneri — {oneri.doviz_kodu}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={popup.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[popup.badge, { backgroundColor: color }]}>
            <Text style={popup.badgeText}>{oneri.oneri}</Text>
          </View>

          <Text style={popup.aciklama}>{aciklama}</Text>

          <Text style={popup.disclaimer}>
            Bu öneri yapay zeka analizine dayanır, yatırım tavsiyesi değildir.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AssetCard({ asset, onPress, onBuy, onSell, isLast, aiOneri }: AssetCardProps): React.JSX.Element {
  const strings = useStrings();
  const swipeRef = useRef<Swipeable>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const isPositive = asset.profitLoss >= 0;
  const plColor = isPositive ? Colors.success : Colors.danger;
  const plSign = isPositive ? '+' : '';

  function close() { swipeRef.current?.close(); }

  function renderRightActions(_: unknown, dragX: Animated.AnimatedInterpolation<number>) {
    const scale = dragX.interpolate({ inputRange: [-120, 0], outputRange: [1, 0.85], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.actions, { transform: [{ scale }] }]}>
        <TouchableOpacity style={[styles.actionBtn, styles.buyBtn]} onPress={() => { close(); onBuy?.(asset); }} activeOpacity={0.8}>
          <Text style={styles.actionText}>{strings.buy}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.sellBtn]} onPress={() => { close(); onSell?.(asset); }} activeOpacity={0.8}>
          <Text style={styles.actionText}>{strings.sell}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <>
      <Swipeable ref={swipeRef} renderRightActions={renderRightActions} rightThreshold={40} friction={2} overshootRight={false}>
        <TouchableOpacity style={styles.card} onPress={() => onPress?.(asset)} activeOpacity={0.75}>
          <View style={styles.row}>
            {/* ── SOL: bayrak + kod + AI badge + birim fiyat ── */}
            <View style={styles.left}>
              <Text style={styles.flag}>{currencyFlag(asset.doviz_kodu)}</Text>
              <View style={styles.labelBlock}>
                <View style={styles.codeRow}>
                  <Text style={styles.code}>{asset.doviz_kodu}</Text>
                  {aiOneri && (
                    <TouchableOpacity
                      style={[styles.aiBadge, { backgroundColor: ONERI_COLOR[aiOneri.oneri] ?? Colors.accent.primary }]}
                      onPress={() => setPopupVisible(true)}
                      hitSlop={6}
                      activeOpacity={0.75}
                    >
                      <Eye size={10} color="#0A0A0A" strokeWidth={2.5} />
                      <Text style={styles.aiBadgeText}>{aiOneri.oneri}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.unitPrice}>{formatTL(asset.currentRate)} ₺</Text>
              </View>
            </View>

            {/* ── SAĞ: toplam TL + kar/zarar ── */}
            <View style={styles.right}>
              <Text style={styles.totalValue}>{formatTL(asset.currentValue)} ₺</Text>
              <View style={styles.plRow}>
                <Text style={[styles.profitLoss, { color: plColor }]}>{plSign}{formatTL(asset.profitLoss)} ₺</Text>
                <Text style={[styles.profitLossPct, { color: plColor }]}>{asset.profitLossPct.toFixed(2)}%</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>

      {!isLast && <View style={styles.separator} />}

      {aiOneri && popupVisible && (
        <AIPopup oneri={aiOneri} onClose={() => setPopupVisible(false)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: Spacing[4] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginLeft: 44 },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], flex: 1 },
  flag: { fontSize: 28 },
  labelBlock: { gap: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  code: { fontFamily: FontFamily.inter.bold, fontSize: 16, color: Colors.text.primary, letterSpacing: 0.3 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  aiBadgeText: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 10,
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },
  unitPrice: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: Colors.text.secondary, fontVariant: ['tabular-nums'] },
  right: { alignItems: 'flex-end', gap: 4 },
  totalValue: { fontFamily: FontFamily.inter.bold, fontSize: 17, color: Colors.text.primary, fontVariant: ['tabular-nums'] },
  plRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  profitLoss: { fontFamily: FontFamily.inter.medium, fontSize: 13, fontVariant: ['tabular-nums'] },
  profitLossPct: { fontFamily: FontFamily.inter.regular, fontSize: 12, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], paddingLeft: Spacing[2] },
  actionBtn: { width: 56, borderRadius: BorderRadius.card, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  buyBtn: { backgroundColor: Colors.success },
  sellBtn: { backgroundColor: Colors.danger },
  actionText: { fontFamily: FontFamily.inter.bold, fontSize: 14, color: '#FFFFFF' },
});

const popup = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[5],
  },
  box: {
    backgroundColor: Colors.background.elevated,
    borderRadius: 20,
    padding: Spacing[5],
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  title: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.text.primary,
  },
  close: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 18,
    color: Colors.text.secondary,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: 10,
    marginBottom: Spacing[4],
  },
  badgeText: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 18,
    color: '#0A0A0A',
    letterSpacing: 1,
  },
  aciklama: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: Spacing[4],
  },
  disclaimer: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: Colors.text.disabled,
    lineHeight: 16,
  },
});
