import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, rightIcon, onRightIconPress, style, ...rest },
  ref,
) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          ref={ref}
          style={[styles.input, rightIcon ? styles.inputWithIcon : null, style]}
          placeholderTextColor={Colors.text.disabled}
          {...rest}
        />
        {rightIcon ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing[2],
  },
  label: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.input ?? BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    height: 52,
  },
  inputRowError: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
    color: Colors.text.primary,
  },
  inputWithIcon: {
    paddingRight: 0,
  },
  iconBtn: {
    paddingHorizontal: Spacing[3],
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.danger,
  },
});
