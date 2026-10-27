import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  LogOut,
  Settings,
  Bell,
  Inbox,
  Moon,
  Lock,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { MenuStackParamList, RootStackParamList } from '@/types/navigation';
import { useAuthStore } from '@/store/authStore';
import { Colors, Spacing } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useStrings } from '@/services/i18n';

type MenuNav = NativeStackNavigationProp<MenuStackParamList>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

interface MenuItem {
  label: string;
  Icon: LucideIcon;
  screen?: keyof MenuStackParamList;
  onPress?: () => void;
  danger?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export function MenuScreen(): React.JSX.Element {
  const strings = useStrings();
  const navigation = useNavigation<MenuNav>();
  const rootNavigation = useNavigation<RootNav>();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  function handleLogout() {
    Alert.alert(strings.logoutTitle, strings.logoutMessage, [
      { text: strings.cancel, style: 'cancel' },
      {
        text: strings.logout,
        style: 'destructive',
        onPress: () => {
          void clearAuth().then(() => {
            rootNavigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
          });
        },
      },
    ]);
  }

  const groups: MenuGroup[] = [
    {
      title: strings.account,
      items: [
        { label: strings.profile, Icon: User, screen: 'Profile' },
        { label: strings.logout, Icon: LogOut, onPress: handleLogout, danger: true },
      ],
    },
    {
      title: strings.preferences,
      items: [
        { label: strings.settings, Icon: Settings, screen: 'Settings' },
        { label: strings.priceAlerts, Icon: Bell, screen: 'Alerts' },
        { label: strings.notifications, Icon: Inbox, screen: 'Notifications' },
        { label: strings.theme, Icon: Moon, screen: 'Theme' },
      ],
    },
    {
      title: strings.security,
      items: [
        { label: strings.security, Icon: Lock, screen: 'Security' },
      ],
    },
    {
      title: strings.about,
      items: [
        { label: strings.about, Icon: Info, screen: 'About' },
      ],
    },
  ];

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerEmail} numberOfLines={1}>
              {user?.email ?? 'Kullanıcı'}
            </Text>
            <Text style={styles.headerSub}>{strings.accountManagement}</Text>
          </View>
        </View>

        {/* Gruplar */}
        <View style={styles.content}>
          {groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <SectionHeader title={group.title} style={{ paddingLeft: Spacing[1] }} />
              <View>
                {group.items.map((item, index) => (
                  <React.Fragment key={item.label}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        if (item.onPress) {
                          item.onPress();
                        } else if (item.screen) {
                          navigation.navigate(item.screen);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <item.Icon
                          size={18}
                          color={item.danger ? Colors.danger : Colors.text.secondary}
                          strokeWidth={1.75}
                        />
                        <Text style={[styles.menuItemLabel, item.danger && styles.dangerText]}>
                          {item.label}
                        </Text>
                      </View>
                      {!item.danger && (
                        <ChevronRight size={16} color={Colors.text.disabled} strokeWidth={1.75} />
                      )}
                    </TouchableOpacity>
                    {index < group.items.length - 1 && (
                      <View style={styles.separator} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[5],
    gap: Spacing[3],
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 22,
    color: '#000000',
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  headerEmail: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.text.primary,
  },
  headerSub: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  content: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    gap: Spacing[4],
  },
  group: {
    gap: Spacing[2],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[1],
    paddingVertical: 15,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 34,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  menuItemLabel: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 15,
    color: Colors.text.primary,
  },
  dangerText: {
    color: Colors.danger,
  },
});
