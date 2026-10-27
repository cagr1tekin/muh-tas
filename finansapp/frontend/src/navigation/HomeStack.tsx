// cursorrules §3.3: Navigation parametreleri RootStackParamList'te merkezi tanımlanır.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@/types/navigation';
import { HomeScreen } from '@/features/home/HomeScreen';
import { CurrencyDetailScreen } from '@/features/search/CurrencyDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CurrencyDetail" component={CurrencyDetailScreen} />
    </Stack.Navigator>
  );
}
