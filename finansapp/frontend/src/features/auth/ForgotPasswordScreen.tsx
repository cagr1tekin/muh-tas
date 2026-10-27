import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/theme';

export function ForgotPasswordScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Şifremi Unuttum — Faz 2'de implement edilecek</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...Typography.bodyLarge,
  },
});
