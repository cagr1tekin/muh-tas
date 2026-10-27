import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BellRing, Bell } from 'lucide-react-native';
import { navigateTo } from '@/services/navigation';
import { Colors, Spacing } from '@/theme';
import { FontFamily } from '@/theme/typography';

interface Props {
  title: string;
}

export function AppHeader({ title }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.rightActions}>
        <TouchableOpacity
          onPress={() => navigateTo('AlertsModal')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.5}
        >
          <BellRing size={21} color={Colors.text.primary} strokeWidth={1.75} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigateTo('NotificationsModal')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.5}
        >
          <Bell size={21} color={Colors.text.primary} strokeWidth={1.75} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.inter.bold,
    fontSize: 24,
    color: Colors.text.primary,
    marginRight: Spacing[3],
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[6],
  },
});
