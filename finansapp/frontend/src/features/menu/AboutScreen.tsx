// cursorrules §4.5: AboutScreen — versiyon, lisanslar, gizlilik politikası
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { MenuStackParamList } from '@/types/navigation';
import { Building2, Bot } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useStrings } from '@/services/i18n';

type Props = NativeStackScreenProps<MenuStackParamList, 'About'>;

const OPEN_SOURCE_LIBS = [
  { name: 'React Native', version: '0.76', license: 'MIT' },
  { name: 'Expo SDK', version: '54', license: 'MIT' },
  { name: 'TanStack Query', version: '5.x', license: 'MIT' },
  { name: 'Zustand', version: '5.x', license: 'MIT' },
  { name: 'Zod', version: '3.x', license: 'MIT' },
  { name: 'Axios', version: '1.x', license: 'MIT' },
  { name: 'React Navigation', version: '7.x', license: 'MIT' },
  { name: 'Inter Font', version: '-', license: 'SIL OFL 1.1' },
  { name: 'JetBrains Mono', version: '-', license: 'SIL OFL 1.1' },
];

export function AboutScreen({ navigation }: Props): React.JSX.Element {
  const strings = useStrings();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function openPrivacy() {
    const url = 'https://example.com/privacy';
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  }

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
        <Text style={styles.topBarTitle}>{strings.aboutTitle}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Logo & Versiyon */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoSymbol}>₺</Text>
          </View>
          <Text style={styles.appName}>Döviz App</Text>
          <Text style={styles.versionText}>{strings.version.replace('{version}', version)}</Text>
          <Text style={styles.buildText}>Nisan 2026 · Çağrı TEKİN</Text>
        </View>

        <View style={styles.content}>
          {/* Gizlilik */}
          <View style={styles.section}>
            <SectionHeader title={strings.legal} style={{ paddingLeft: Spacing[1] }} />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => { void openPrivacy(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.linkLabel}>{strings.privacyPolicy}</Text>
              <Text style={styles.externalIcon}>↗</Text>
            </TouchableOpacity>
          </View>

          {/* Açık kaynak */}
          <View style={styles.section}>
            <SectionHeader title={strings.openSource} style={{ paddingLeft: Spacing[1] }} />
            <View>
              {OPEN_SOURCE_LIBS.map((lib, idx) => (
                <React.Fragment key={lib.name}>
                  {idx > 0 && <View style={styles.separator} />}
                  <View style={styles.libRow}>
                    <View>
                      <Text style={styles.libName}>{lib.name}</Text>
                      <Text style={styles.libVersion}>v{lib.version}</Text>
                    </View>
                    <View style={styles.licenseBadge}>
                      <Text style={styles.licenseText}>{lib.license}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Veri kaynakları */}
          <View style={styles.section}>
            <SectionHeader title={strings.dataSources} style={{ paddingLeft: Spacing[1] }} />
            <View>
              <View style={styles.sourceRow}>
                <Building2 size={22} color={Colors.text.secondary} strokeWidth={1.5} />
                <View>
                  <Text style={styles.sourceName}>TCMB EVDS</Text>
                  <Text style={styles.sourceDesc}>{strings.tcmbDesc}</Text>
                </View>
              </View>
              <View style={styles.separator} />
              <View style={styles.sourceRow}>
                <Bot size={22} color={Colors.text.secondary} strokeWidth={1.5} />
                <View>
                  <Text style={styles.sourceName}>Ollama + Gemini AI</Text>
                  <Text style={styles.sourceDesc}>{strings.aiDesc}</Text>
                </View>
              </View>
            </View>
          </View>
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
    gap: Spacing[2],
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  logoSymbol: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 32,
    color: '#0A0A0A',
  },
  appName: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 24,
    color: Colors.text.primary,
  },
  versionText: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 14,
    color: Colors.accent.primary,
  },
  buildText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.disabled,
  },
  content: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[5],
  },
  section: {
    gap: Spacing[2],
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  linkLabel: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 15,
    color: Colors.text.primary,
  },
  externalIcon: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  libName: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 14,
    color: Colors.text.primary,
  },
  libVersion: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: Colors.text.disabled,
    marginTop: 2,
  },
  licenseBadge: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  licenseText: {
    fontFamily: FontFamily.mono.medium,
    fontSize: 10,
    color: Colors.text.secondary,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: Spacing[3],
  },
  sourceName: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 3,
  },
  sourceDesc: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
