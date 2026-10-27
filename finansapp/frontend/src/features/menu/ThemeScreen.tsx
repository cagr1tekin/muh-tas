import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MenuStackParamList } from '@/types/navigation';
import { usePreferencesStore } from '@/store/preferencesStore';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';

type Props = NativeStackScreenProps<MenuStackParamList, 'Theme'>;

export function ThemeScreen({ navigation }: Props): React.JSX.Element {
  const { theme, setTheme } = usePreferencesStore();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tema</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        {/* Koyu tema */}
        <TouchableOpacity
          style={[styles.themeCard, theme === 'dark' && styles.themeCardActive]}
          activeOpacity={0.85}
          onPress={() => { void setTheme('dark'); }}
        >
          <View style={styles.themePreview}>
            <View style={styles.previewBg}>
              <View style={styles.previewBar} />
              <View style={styles.previewCard} />
            </View>
          </View>
          <View style={styles.themeInfo}>
            <View style={styles.themeHeader}>
              <Text style={styles.themeLabel}>Koyu Tema</Text>
              {theme === 'dark' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Aktif</Text>
                </View>
              )}
            </View>
            <Text style={styles.themeDesc}>Göz dostu, düşük ışık ortamları için ideal</Text>
          </View>
        </TouchableOpacity>

        {/* Açık tema — yakında */}
        <View style={[styles.themeCard, styles.themeCardDisabled]}>
          <View style={[styles.themePreview, styles.themePreviewLight]}>
            <View style={[styles.previewBg, styles.previewBgLight]}>
              <View style={[styles.previewBar, styles.previewBarLight]} />
              <View style={[styles.previewCard, styles.previewCardLight]} />
            </View>
          </View>
          <View style={styles.themeInfo}>
            <View style={styles.themeHeader}>
              <Text style={[styles.themeLabel, styles.themeLabelDisabled]}>Açık Tema</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>v2'de</Text>
              </View>
            </View>
            <Text style={[styles.themeDesc, styles.themeDescDisabled]}>
              Parlak ortamlar için yüksek kontrast
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
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
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  themeCard: {
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    gap: Spacing[4],
  },
  themeCardActive: {
    borderColor: Colors.accent.primary,
    backgroundColor: 'rgba(0,191,255,0.05)',
  },
  themeCardDisabled: {
    opacity: 0.5,
  },
  themePreview: {
    width: 64,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
    padding: 6,
    justifyContent: 'space-between',
  },
  themePreviewLight: {
    backgroundColor: '#F5F5F5',
  },
  previewBg: {
    flex: 1,
    gap: 4,
  },
  previewBgLight: {
    // açık arka plan
  },
  previewBar: {
    height: 6,
    backgroundColor: Colors.accent.primary,
    borderRadius: 3,
    width: '70%',
  },
  previewBarLight: {
    backgroundColor: Colors.accent.primary,
  },
  previewCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
  },
  previewCardLight: {
    backgroundColor: '#FFFFFF',
  },
  themeInfo: {
    flex: 1,
    gap: 5,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  themeLabel: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 15,
    color: Colors.text.primary,
  },
  themeLabelDisabled: {
    color: Colors.text.secondary,
  },
  themeDesc: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  themeDescDisabled: {
    color: Colors.text.disabled,
  },
  activeBadge: {
    backgroundColor: Colors.accent.primary,
    borderRadius: BorderRadius.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 10,
    color: '#0A0A0A',
  },
  comingSoonBadge: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonBadgeText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 10,
    color: Colors.text.disabled,
  },
});
