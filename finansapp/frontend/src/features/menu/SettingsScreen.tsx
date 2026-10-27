// cursorrules §4.5: SettingsScreen — dil, para birimi, bildirim ayarları
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MenuStackParamList } from '@/types/navigation';
import { usePreferencesStore, Language, Currency } from '@/store/preferencesStore';
import { Colors, Spacing } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { SectionHeader } from '@/components/common/SectionHeader';

type Props = NativeStackScreenProps<MenuStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props): React.JSX.Element {
  const { language, currency, notificationsEnabled, setLanguage, setCurrency, setNotificationsEnabled } =
    usePreferencesStore();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Ayarlar</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Dil */}
          <View style={styles.section}>
            <SectionHeader title="Dil" style={{ paddingLeft: Spacing[1] }} />
            <View>
              <OptionRow
                label="Türkçe"
                selected={language === 'tr'}
                onPress={() => { void setLanguage('tr'); }}
              />
              <View style={styles.separator} />
              <OptionRow
                label="English"
                selected={language === 'en'}
                onPress={() => { void setLanguage('en'); }}
              />
            </View>
          </View>

          {/* Para Birimi */}
          <View style={styles.section}>
            <SectionHeader title="Referans Para Birimi" style={{ paddingLeft: Spacing[1] }} />
            <View>
              {(['TRY', 'USD', 'EUR'] as Currency[]).map((c, idx) => (
                <React.Fragment key={c}>
                  {idx > 0 && <View style={styles.separator} />}
                  <OptionRow
                    label={c === 'TRY' ? '₺ Türk Lirası' : c === 'USD' ? '$ Amerikan Doları' : '€ Euro'}
                    selected={currency === c}
                    onPress={() => { void setCurrency(c); }}
                  />
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Bildirimler */}
          <View style={styles.section}>
            <SectionHeader title="Bildirimler" style={{ paddingLeft: Spacing[1] }} />
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Push Bildirimleri</Text>
                <Text style={styles.toggleSub}>Fiyat alarmları ve haberler</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => { void setNotificationsEnabled(val); }}
                trackColor={{ false: Colors.background.elevated, true: Colors.accent.primary }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : Colors.text.disabled}
              />
            </View>
          </View>
        </View>

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
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
  content: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
    gap: Spacing[5],
  },
  section: {
    gap: Spacing[2],
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 15,
    color: Colors.text.secondary,
  },
  optionLabelSelected: {
    fontFamily: FontFamily.inter.medium,
    color: Colors.text.primary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.text.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.accent.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  toggleLabel: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: 3,
  },
  toggleSub: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
