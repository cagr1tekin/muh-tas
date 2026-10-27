import { TextStyle } from 'react-native';

export const FontFamily = {
  // IBM Plex Sans — fintech standardı (IBM, banking app'ler)
  // Mevcut bileşenler FontFamily.inter.* ile referans veriyor — alias korundu
  inter: {
    regular: 'IBMPlexSans_400Regular',
    medium: 'IBMPlexSans_500Medium',
    semiBold: 'IBMPlexSans_600SemiBold',
    bold: 'IBMPlexSans_700Bold',
  },
  // serif alias — IBM Plex Sans'a yönlendirildi
  serif: {
    regular: 'IBMPlexSans_400Regular',
  },
  mono: {
    medium: 'JetBrainsMono_500Medium',
  },
} as const;

export const Typography = {
  h1: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 28,
    color: '#FFFFFF',
  } satisfies TextStyle,

  h2: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 22,
    color: '#FFFFFF',
  } satisfies TextStyle,

  h3: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 18,
    color: '#FFFFFF',
  } satisfies TextStyle,

  bodyLarge: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
    color: '#A0A0A0',
  } satisfies TextStyle,

  bodySmall: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: '#A0A0A0',
  } satisfies TextStyle,

  bodySerif: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
    lineHeight: 26,
    color: '#E0E0E0',
  } satisfies TextStyle,

  numberLarge: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 36,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  numberTable: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 16,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  currencyCode: {
    fontFamily: FontFamily.mono.medium,
    fontSize: 14,
    color: '#00BFFF',
  } satisfies TextStyle,

  badge: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  } satisfies TextStyle,
} as const;
