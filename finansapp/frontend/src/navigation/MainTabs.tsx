import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, Plus, Newspaper, Menu } from 'lucide-react-native';
import { MainTabParamList } from '@/types/navigation';
import { navigateTo } from '@/services/navigation';
import { Colors, BorderRadius, Layout } from '@/theme';
import { HomeStack } from './HomeStack';
import { SearchStack } from './SearchStack';
import { NewsStack } from './NewsStack';
import { MenuStack } from './MenuStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Boş ekran — AddTab hiçbir zaman render edilmez
function EmptyScreen(): React.JSX.Element {
  return <View />;
}

export function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.background.secondary,
          borderTopWidth: 0,
          height: Layout.bottomBarHeight,
          paddingBottom: 16,
          paddingTop: 8,
          borderTopLeftRadius: BorderRadius.card,
          borderTopRightRadius: BorderRadius.card,
        },
        tabBarActiveTintColor: Colors.text.primary,
        tabBarInactiveTintColor: Colors.text.disabled,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={EmptyScreen}
        options={{
          tabBarButton: () => (
            <TouchableOpacity
              style={styles.fabWrap}
              onPress={() => navigateTo('AddAsset')}
              activeOpacity={0.85}
            >
              <View style={styles.addBtn}>
                <Plus size={26} color="#0A0A0A" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="NewsTab"
        component={NewsStack}
        options={{
          tabBarIcon: ({ color, size }) => <Newspaper color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tab.Screen
        name="MenuTab"
        component={MenuStack}
        options={{
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -16 }],
  },
});
