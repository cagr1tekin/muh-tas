// cursorrules §3.3: Navigation parametreleri RootStackParamList'te merkezi tanımlanır.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NewsStackParamList } from '@/types/navigation';
import { NewsScreen } from '@/features/news/NewsScreen';
import { NewsDetailScreen } from '@/features/news/NewsDetailScreen';

const Stack = createNativeStackNavigator<NewsStackParamList>();

export function NewsStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="News" component={NewsScreen} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
    </Stack.Navigator>
  );
}
