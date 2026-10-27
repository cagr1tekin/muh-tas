// cursorrules §3.3: MenuStack — tüm menü alt sayfaları
// cursorrules §4.5: /menu/[slug] kuralı — her iç sayfa geri butonlu, bottom bar gizlenir
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MenuStackParamList } from '@/types/navigation';
import { MenuScreen } from '@/features/menu/MenuScreen';
import { ProfileScreen } from '@/features/menu/ProfileScreen';
import { SettingsScreen } from '@/features/menu/SettingsScreen';
import { AlertsScreen } from '@/features/menu/AlertsScreen';
import { NotificationsScreen } from '@/features/menu/NotificationsScreen';
import { ThemeScreen } from '@/features/menu/ThemeScreen';
import { SecurityScreen } from '@/features/menu/SecurityScreen';
import { AboutScreen } from '@/features/menu/AboutScreen';

const Stack = createNativeStackNavigator<MenuStackParamList>();

export function MenuStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Theme" component={ThemeScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
