import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors } from '@/theme';
import { FontFamily } from '@/theme/typography';

interface SectionHeaderProps {
  title: string;
  style?: TextStyle;
}

export function SectionHeader({ title, style }: SectionHeaderProps): React.JSX.Element {
  return <Text style={[styles.heading, style]}>{title}</Text>;
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 18,
    color: Colors.text.primary,
  },
});
