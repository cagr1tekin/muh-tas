// cursorrules §4.5: AlertsScreen — fiyat alarmları (lokal, FCM Faz 6'da)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermission } from '@/services/push.service';
import { Bell } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings } from '@/services/i18n';

const ALERTS_KEY = 'finans_price_alerts';

const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'SAR', 'AUD', 'CAD'];

export interface PriceAlert {
  id: string;
  code: string;
  threshold: number;
  direction: 'above' | 'below';
  createdAt: string;
}

export function AlertsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const strings = useStrings();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [selectedCode, setSelectedCode] = useState('USD');
  const [thresholdText, setThresholdText] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    void loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const raw = await AsyncStorage.getItem(ALERTS_KEY);
      if (raw) setAlerts(JSON.parse(raw) as PriceAlert[]);
    } catch {
      // sessizce geç
    }
  }

  async function saveAlerts(updated: PriceAlert[]) {
    try {
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
    } catch {
      // sessizce geç
    }
  }

  async function ensureNotificationPermission(): Promise<boolean> {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        strings.notifPermTitle,
        strings.notifPermMsg,
        [{ text: strings.ok }],
      );
    }
    return granted;
  }

  function handleAdd() {
    const threshold = parseFloat(thresholdText.replace(',', '.'));
    if (isNaN(threshold) || threshold <= 0) {
      Alert.alert(strings.error, strings.invalidThreshold, [{ text: strings.ok }]);
      return;
    }

    void ensureNotificationPermission().then((granted) => {
      if (!granted) return;
      const newAlert: PriceAlert = {
        id: Date.now().toString(),
        code: selectedCode,
        threshold,
        direction,
        createdAt: new Date().toISOString(),
      };
      const updated = [newAlert, ...alerts];
      setAlerts(updated);
      void saveAlerts(updated);
      setThresholdText('');
      setIsAdding(false);
    });
  }

  function handleDelete(id: string) {
    Alert.alert(strings.deleteAlertTitle, strings.deleteAlertMsg, [
      { text: strings.cancel, style: 'cancel' },
      {
        text: strings.delete,
        style: 'destructive',
        onPress: () => {
          const updated = alerts.filter((a) => a.id !== id);
          setAlerts(updated);
          void saveAlerts(updated);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Üst bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backText}>{strings.back}</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{strings.priceAlertsTitle}</Text>
          <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
            <Text style={styles.addBtn}>{isAdding ? strings.cancel : strings.addBtn}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Alarm ekleme formu */}
          {isAdding && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{strings.newAlert}</Text>

              {/* Döviz seçimi */}
              <Text style={styles.formLabel}>{strings.currencyLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {POPULAR_CURRENCIES.map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={[styles.chip, selectedCode === code && styles.chipActive]}
                      onPress={() => setSelectedCode(code)}
                    >
                      <Text style={[styles.chipText, selectedCode === code && styles.chipTextActive]}>
                        {code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Yön */}
              <Text style={styles.formLabel}>{strings.directionLabel}</Text>
              <View style={styles.directionRow}>
                <TouchableOpacity
                  style={[styles.dirBtn, direction === 'above' && styles.dirBtnActive]}
                  onPress={() => setDirection('above')}
                >
                  <Text style={[styles.dirBtnText, direction === 'above' && styles.dirBtnTextActive]}>
                    {strings.above}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dirBtn, direction === 'below' && styles.dirBtnActive]}
                  onPress={() => setDirection('below')}
                >
                  <Text style={[styles.dirBtnText, direction === 'below' && styles.dirBtnTextActive]}>
                    {strings.below}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Eşik */}
              <Text style={styles.formLabel}>{strings.priceThreshold}</Text>
              <TextInput
                style={styles.input}
                placeholder={strings.thresholdPlaceholder}
                placeholderTextColor={Colors.text.disabled}
                keyboardType="decimal-pad"
                value={thresholdText}
                onChangeText={setThresholdText}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{strings.createAlert}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Alarm listesi */}
          <View style={styles.listSection}>
            {alerts.length === 0 ? (
              <View style={styles.empty}>
                <Bell size={48} color={Colors.text.disabled} strokeWidth={1.25} />
                <Text style={styles.emptyText}>{strings.noAlerts}</Text>
                <Text style={styles.emptySubText}>{strings.noAlertsSub}</Text>
              </View>
            ) : (
              alerts.map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <AlertRow alert={alert} onDelete={() => handleDelete(alert.id)} />
                  {index < alerts.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))
            )}
          </View>

          <View style={{ height: Spacing[8] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: () => void }) {
  const strings = useStrings();
  return (
    <View style={styles.alertRow}>
      <View style={styles.alertLeft}>
        <Text style={styles.alertCode}>{alert.code}</Text>
        <Text style={styles.alertDesc}>
          {alert.direction === 'above' ? '↑ ' : '↓ '}
          {alert.threshold.toFixed(2)} ₺
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.deleteBtnText}>{strings.delete}</Text>
      </TouchableOpacity>
    </View>
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
  },
  topBarTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 17,
    color: Colors.text.primary,
  },
  addBtn: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 14,
    color: Colors.accent.primary,
  },
  notice: {
    margin: Spacing[4],
    backgroundColor: 'rgba(0,191,255,0.08)',
    borderRadius: BorderRadius.card,
    borderColor: 'rgba(0,191,255,0.2)',
    padding: Spacing[3],
  },
  noticeText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.accent.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
  formCard: {
    marginHorizontal: Spacing[4],
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.card,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  formTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },
  formLabel: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing[2],
  },
  chipScroll: {
    marginTop: Spacing[1],
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingVertical: Spacing[1],
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background.elevated,
  },
  chipActive: {
    backgroundColor: Colors.accent.primary,
    borderColor: Colors.accent.primary,
  },
  chipText: {
    fontFamily: FontFamily.mono.medium,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: '#0A0A0A',
  },
  directionRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.background.elevated,
    alignItems: 'center',
  },
  dirBtnActive: {
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderColor: Colors.accent.primary,
  },
  dirBtnText: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  dirBtnTextActive: {
    color: Colors.accent.primary,
  },
  input: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing[3],
    paddingVertical: 12,
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: Spacing[1],
    fontVariant: ['tabular-nums'],
  },
  saveBtn: {
    marginTop: Spacing[3],
    backgroundColor: Colors.accent.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: '#0A0A0A',
  },
  listSection: {
    paddingHorizontal: Spacing[4],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing[10],
    gap: Spacing[2],
  },
  emptyIcon: {},
  emptyText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  emptySubText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.disabled,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  alertRow: {
    paddingVertical: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertLeft: {
    gap: 4,
  },
  alertCode: {
    fontFamily: FontFamily.mono.medium,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  alertDesc: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  deleteBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: 'rgba(255,76,76,0.1)',
    borderRadius: BorderRadius.badge,
    borderColor: 'rgba(255,76,76,0.3)',
  },
  deleteBtnText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 12,
    color: Colors.danger,
  },
});
