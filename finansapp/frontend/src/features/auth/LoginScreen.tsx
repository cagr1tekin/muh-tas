// cursorrules §4.1 — LoginScreen: email + şifre, Zod validasyon, auth servis katmanı.
import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation';
import { useAuthStore, SOFT_LOGOUT_KEY } from '@/store/authStore';
import { login, demoLogin } from '@/services/auth.service';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { Colors, Typography, Layout, BorderRadius, Spacing } from '@/theme';

const BIOMETRIC_KEY = 'finans_biometric_enabled';
const SECURE_KEY_TOKEN = 'finans_access_token';
const SECURE_KEY_REFRESH = 'finans_refresh_token';
const SECURE_KEY_USER = 'finans_user';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    void checkBiometricAvailability();
  }, []);

  async function checkBiometricAvailability() {
    try {
      const [hasHardware, isEnrolled, supportedTypes, isEnabled, storedToken] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
        AsyncStorage.getItem(BIOMETRIC_KEY),
        SecureStore.getItemAsync(SECURE_KEY_TOKEN),
      ]);

      // Gerçek biyometrik (Face ID veya parmak izi) kayıtlı mı?
      const hasFaceID = supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      );
      const hasFingerprint = supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      );

      setBiometricAvailable(
        hasHardware && isEnrolled && (hasFaceID || hasFingerprint) &&
        isEnabled === 'true' && !!storedToken,
      );
    } catch {
      setBiometricAvailable(false);
    }
  }

  async function handleBiometricLogin() {
    setError(null);
    try {
      const [storedToken, userRaw, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEY_TOKEN),
        SecureStore.getItemAsync(SECURE_KEY_USER),
        SecureStore.getItemAsync(SECURE_KEY_REFRESH),
      ]);

      if (!storedToken || !userRaw) {
        setBiometricAvailable(false);
        setError('Oturum bilgisi bulunamadı, lütfen e-posta ile giriş yapın.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Finansapp\'a giriş yap',
        cancelLabel: 'İptal',
        // Expo Go'da NSFaceIDUsageDescription olmadığından Face ID izni alınamaz.
        // disableDeviceFallback: false (varsayılan) ile iOS passcode fallback çalışır.
        // Production build'de (EAS) app.json'daki infoPlist ile Face ID doğrudan çalışır.
      });
      if (!result.success) return;

      const user = JSON.parse(userRaw) as { id: string; email: string };
      // setAuth soft logout bayrağını da temizler
      await setAuth(storedToken, user, refreshToken ?? undefined);
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch {
      setError('Biyometrik doğrulama başarısız');
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setLoading(true);
    try {
      // Demo giriş: backend'den gerçek 24 saatlik JWT alır.
      const data = await demoLogin();
      await setAuth(
        data.access_token,
        { id: 'demo-user-00000000-0000-0000-0000-000000000001', email: 'demo@finansapp.dev' },
        data.refresh_token,
      );
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Demo girişte bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError(null);

    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Geçersiz form');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      await setAuth(
        data.access_token,
        { id: 'unknown', email: email.trim() },
        data.refresh_token,
      );
      // Navigation interceptor SplashScreen'den gelir;
      // doğrudan Main'e navigate ediyoruz (replace ile geri tuşu engellenir).
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={styles.logo}>₺</Text>
          <Text style={styles.title}>Tekrar Hoş Geldin</Text>
          <Text style={styles.subtitle}>Hesabına giriş yap</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor={Colors.text.disabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.text.disabled}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            label="Giriş Yap"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />

          <PrimaryButton
            label="Demo Giriş (Bypass)"
            onPress={handleDemoLogin}
            loading={loading}
            style={styles.demoButton}
          />

          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={handleBiometricLogin}
              activeOpacity={0.75}
            >
              <Text style={styles.biometricIcon}>🔒</Text>
              <Text style={styles.biometricText}>Face ID / Parmak İzi ile Giriş</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Alt kayıt linki */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabın yok mu? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Layout.screenPaddingH,
    justifyContent: 'center',
    paddingVertical: Spacing['8'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['8'],
  },
  logo: {
    fontSize: 56,
    color: Colors.accent.primary,
    marginBottom: Spacing['3'],
  },
  title: {
    ...Typography.h2,
  },
  subtitle: {
    ...Typography.bodyLarge,
    marginTop: Spacing['1'],
  },
  form: {
    gap: Spacing['4'],
  },
  field: {
    gap: Spacing['2'],
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  input: {
    height: 52,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing['4'],
    color: Colors.text.primary,
    fontSize: 16,
  },
  forgotRow: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    ...Typography.bodySmall,
    color: Colors.accent.primary,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.danger,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing['2'],
  },
  demoButton: {
    marginTop: Spacing['2'],
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    marginTop: Spacing['3'],
    paddingVertical: Spacing['3'],
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  biometricIcon: {
    fontSize: 20,
  },
  biometricText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing['8'],
  },
  footerText: {
    ...Typography.bodySmall,
  },
  footerLink: {
    ...Typography.bodySmall,
    color: Colors.accent.primary,
    fontWeight: '600',
  },
});
