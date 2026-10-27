import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { SplashScreen } from '@/features/auth/SplashScreen';
import { AlertsScreen } from '@/features/menu/AlertsScreen';
import { NotificationsScreen } from '@/features/menu/NotificationsScreen';
import { AddAssetScreen } from '@/features/home/AddAssetScreen';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { Colors } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// cursorrules §3.3: SplashScreen JWT kontrolü yapar: geçerli token → Main, yok → Auth.
export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ contentStyle: { backgroundColor: Colors.background.primary } }}
      />
      <Stack.Screen
        name="AlertsModal"
        component={AlertsScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background.primary },
        }}
      />
      <Stack.Screen
        name="NotificationsModal"
        component={NotificationsScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background.primary },
        }}
      />
      <Stack.Screen
        name="AddAsset"
        component={AddAssetScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background.primary },
        }}
      />
    </Stack.Navigator>
  );
}
