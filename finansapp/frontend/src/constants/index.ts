// cursorrules §3.5: Tüm sabitler constants/ veya theme/ altında. Magic number yasak.

import { Platform } from 'react-native';

// Geliştirmede cihaz ağından erişilebilir bir backend adresi gerekir.
// Öncelik: EXPO_PUBLIC_API_BASE > platform fallback
// Not:
// - Fiziksel cihaz / Expo Go: EXPO_PUBLIC_API_BASE zorunlu (örn: http://192.168.1.50:8080)
// - Android emülatör: 10.0.2.2
// - iOS simülatör: localhost
const envBase = process.env.EXPO_PUBLIC_API_BASE?.trim();

export const API_BASE = envBase
  ? envBase
  : __DEV__
    ? Platform.select({
        android: 'http://10.0.2.2:8080',
        ios: 'http://localhost:8080',
        default: 'http://localhost:8080',
      }) ?? 'http://localhost:8080'
    : 'https://api.doviz.app'; // üretim URL'i

export const QUERY_STALE_TIMES = {
  currencies: 0,                // anlık polling — refetchInterval yönetir
  currencyDetail: 0,            // anlık polling — refetchInterval yönetir
  newsAI: 5 * 60 * 1000,       // 5 dakika
  newsMarket: 5 * 60 * 1000,   // 5 dakika
  portfolio: 0,                 // her seferinde taze
} as const;

export const POLL_INTERVALS = {
  currencies: 60 * 1000,       // WS push yokken fallback polling (60 saniye)
} as const;

// API_BASE'deki http(s) → ws(s) dönüşümü
export const WS_BASE = API_BASE
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://');

export const SECURE_STORE_KEYS = {
  accessToken: 'finans_access_token',
  user: 'finans_user',
} as const;
