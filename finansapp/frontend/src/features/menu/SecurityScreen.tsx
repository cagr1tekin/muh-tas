// cursorrules §4.5: SecurityScreen — şifre değiştir, biyometrik toggle
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MenuStackParamList } from '@/types/navigation';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useStrings } from '@/services/i18n';

type Props = NativeStackScreenProps<MenuStackParamList, 'Security'>;

const BIOMETRIC_KEY = 'finans_biometric_enabled';

export function SecurityScreen({ navigation }: Props): React.JSX.Element {
  const strings = useStrings();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    void checkBiometric();
    void loadBiometricPreference();
  }, []);

  async function checkBiometric() {
    try {
      const available = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(available && enrolled);
    } catch {
      setBiometricAvailable(false);
    }
  }

  async function loadBiometricPreference() {
    try {
      const val = await AsyncStorage.getItem(BIOMETRIC_KEY);
      setBiometricEnabled(val === 'true');
    } catch {
      // varsayılan: false
    }
  }

  async function toggleBiometric(enabled: boolean) {
    if (enabled && biometricAvailable) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: strings.biometricVerify,
          fallbackLabel: strings.biometricUsePassword,
        });
        if (!result.success) return;
      } catch {
        return;
      }
    }
    setBiometricEnabled(enabled);
    await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? 'true' : 'false');
  }

  function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(strings.error, strings.fillAllFields);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(strings.error, strings.passwordsMismatch);
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(strings.error, strings.passwordTooShort);
      return;
    }
    Alert.alert(
      strings.info,
      strings.changePasswordNotice,
      [{ text: strings.ok }],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>{strings.back}</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{strings.securityTitle}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Biyometrik */}
          <View style={styles.section}>
            <SectionHeader title={strings.biometricSection} style={{ paddingLeft: Spacing[1] }} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>
                  {biometricAvailable ? strings.biometricLabel : strings.biometricUnavailable}
                </Text>
                <Text style={styles.toggleSub}>
                  {biometricAvailable
                    ? strings.biometricDesc
                    : strings.biometricUnavailableDesc}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={(val) => { void toggleBiometric(val); }}
                disabled={!biometricAvailable}
                trackColor={{ false: Colors.background.elevated, true: Colors.accent.primary }}
                thumbColor={biometricEnabled ? '#FFFFFF' : Colors.text.disabled}
              />
            </View>
          </View>

          {/* Şifre değiştir */}
          <View style={styles.section}>
            <SectionHeader title={strings.changePasswordSection} style={{ paddingLeft: Spacing[1] }} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{strings.currentPassword}</Text>
              <TextInput
                style={styles.input}
                placeholder={strings.passwordPlaceholder}
                placeholderTextColor={Colors.text.disabled}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{strings.newPassword}</Text>
              <TextInput
                style={styles.input}
                placeholder={strings.newPasswordHint}
                placeholderTextColor={Colors.text.disabled}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{strings.newPasswordRepeat}</Text>
              <TextInput
                style={styles.input}
                placeholder={strings.passwordPlaceholder}
                placeholderTextColor={Colors.text.disabled}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{strings.changePasswordBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: Spacing[8] }} />
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: Spacing[3],
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
  inputGroup: {
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  inputLabel: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 12,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing[3],
    paddingVertical: 12,
    fontFamily: FontFamily.inter.regular,
    fontSize: 15,
    color: Colors.text.primary,
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
});
