// Long-press ile açılan aksiyon modal'ı.
// cursorrules §5.4: BottomSheet pattern — RN Modal ile Expo Go uyumlu.
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useDeleteAsset } from '@/hooks/usePortfolio';
import { AssetViewModel } from '@/types/portfolio';
import { currencyFlag } from '@/services/currency.service';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings } from '@/services/i18n';

interface AssetActionSheetProps {
  asset: AssetViewModel | null;
  onClose: () => void;
}

export function AssetActionSheet({ asset, onClose }: AssetActionSheetProps): React.JSX.Element {
  const strings = useStrings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutateAsync: deleteAsset, isPending } = useDeleteAsset();

  function handleClose() {
    setConfirmDelete(false);
    onClose();
  }

  async function handleDelete() {
    if (!asset) return;
    try {
      await deleteAsset(asset.id);
      handleClose();
    } catch {
      handleClose();
    }
  }

  return (
    <Modal
      visible={asset !== null}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <View style={styles.sheet}>
          {/* Başlık */}
          {asset && (
            <View style={styles.assetHeader}>
              <Text style={styles.flag}>{currencyFlag(asset.doviz_kodu)}</Text>
              <View>
                <Text style={styles.code}>{asset.doviz_kodu}</Text>
                <Text style={styles.subtext}>{asset.miktar} {strings.units}</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Aksiyon butonları */}
          {!confirmDelete ? (
            <>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => setConfirmDelete(true)}
              >
                <Text style={styles.deleteAction}>{strings.deleteAsset}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.actionRow} onPress={handleClose}>
                <Text style={styles.cancelAction}>{strings.cancel}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.confirmText}>
                {strings.deleteAssetMsg.replace('{code}', asset?.doviz_kodu ?? '')}
              </Text>
              <View style={styles.confirmButtons}>
                {isPending ? (
                  <ActivityIndicator color={Colors.danger} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.confirmBtn, styles.deleteBtn]}
                      onPress={() => { void handleDelete(); }}
                    >
                      <Text style={styles.deleteBtnText}>{strings.delete}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmBtn, styles.cancelBtn]}
                      onPress={() => setConfirmDelete(false)}
                    >
                      <Text style={styles.cancelBtnText}>{strings.back}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingBottom: Spacing[6],
  },
  sheet: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing[4],
    overflow: 'hidden',
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  flag: {
    fontSize: 26,
  },
  code: {
    fontFamily: FontFamily.mono.medium,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  subtext: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
  },
  actionRow: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  deleteAction: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.danger,
  },
  cancelAction: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  confirmText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  confirmButtons: {
    flexDirection: 'row',
    padding: Spacing[4],
    gap: Spacing[3],
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: Colors.danger,
  },
  cancelBtn: {
    backgroundColor: Colors.background.secondary,
  },
  deleteBtnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cancelBtnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: Colors.text.secondary,
  },
});
