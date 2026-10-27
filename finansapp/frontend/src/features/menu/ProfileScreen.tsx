// cursorrules §4.5: ProfileScreen — /menu/profil: Ad, email, avatar, üyelik tarihi
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MenuStackParamList } from '@/types/navigation';
import { useAuthStore } from '@/store/authStore';
import { Colors, Spacing } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings } from '@/services/i18n';

type Props = NativeStackScreenProps<MenuStackParamList, 'Profile'>;

function getAvatarColor(email: string): string {
  const colors = [
    Colors.accent.primary,
    '#00C896',
    '#9B59B6',
    '#E74C3C',
    '#F39C12',
    '#1ABC9C',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? Colors.accent.primary;
}

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const strings = useStrings();
  const user = useAuthStore((s) => s.user);

  const email = user?.email ?? 'demo@finansapp.dev';
  const avatarLetter = email[0]?.toUpperCase() ?? 'U';
  const avatarColor = getAvatarColor(email);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>{strings.back}</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{strings.profileTitle}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarLarge, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarLetterLarge}>{avatarLetter}</Text>
        </View>
        <View style={styles.avatarGlow} />
      </View>

      {/* Bilgiler */}
      <View style={styles.content}>
        <InfoRow label={strings.email} value={email} />
        <View style={styles.separator} />
        <InfoRow label={strings.userId} value={user?.id ? `...${user.id.slice(-8)}` : '—'} />
        <View style={styles.separator} />
        <InfoRow label={strings.accountType} value={email.includes('demo') ? strings.demoAccount : strings.standardAccount} />

        {email.includes('demo') && (
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>
              {strings.demoNotice}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  backText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  topBarTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 17,
    color: Colors.text.primary,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  avatarGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.accent.glow,
    top: Spacing[8] - 11,
  },
  avatarLetterLarge: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 36,
    color: '#0A0A0A',
  },
  content: {
    paddingHorizontal: Spacing[4],
    gap: 0,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoLabel: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 14,
    color: Colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  demoNotice: {
    marginTop: Spacing[4],
    backgroundColor: 'rgba(255,180,0,0.1)',
    borderRadius: 12,
    borderColor: 'rgba(255,180,0,0.3)',
    padding: Spacing[3],
  },
  demoNoticeText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.warning,
    textAlign: 'center',
    lineHeight: 20,
  },
});
