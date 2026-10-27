// cursorrules §3.3: Navigation parametreleri RootStackParamList'te merkezi tanımlanır.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchStackParamList } from '@/types/navigation';
import { SearchScreen } from '@/features/search/SearchScreen';
import { CurrencyDetailScreen } from '@/features/search/CurrencyDetailScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="CurrencyDetail" component={CurrencyDetailScreen} />
    </Stack.Navigator>
  );
}
