// cursorrules §4.1 — RegisterScreen: email + şifre + onay, Zod validasyon.
import React, { useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation';
import { register } from '@/services/auth.service';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { Colors, Typography, Layout, BorderRadius, Spacing } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterSchema = z
  .object({
    email: z.string().email('Geçerli bir e-posta adresi girin'),
    password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirm'],
  });

export function RegisterScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);

    const result = RegisterSchema.safeParse({ email, password, confirm });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Geçersiz form');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password);
      navigation.navigate('Login');
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
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Portföyünü yönetmeye başla</Text>
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
              placeholder="En az 8 karakter"
              placeholderTextColor={Colors.text.disabled}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Şifre Tekrar</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Şifreni tekrar gir"
              placeholderTextColor={Colors.text.disabled}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            label="Kayıt Ol"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />
        </View>

        {/* Alt giriş linki */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Giriş Yap</Text>
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
  errorText: {
    ...Typography.bodySmall,
    color: Colors.danger,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing['2'],
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
