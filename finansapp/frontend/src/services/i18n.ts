import { usePreferencesStore, type Language } from '@/store/preferencesStore';
import type { Currency } from '@/services/currency.service';

// ── Türkçe ────────────────────────────────────────────────────────────────────
const TR = {
  // Ortak
  back: '‹ Geri',
  cancel: 'İptal',
  save: 'Kaydet',
  delete: 'Sil',
  ok: 'Tamam',
  error: 'Hata',
  info: 'Bilgi',
  clear: 'Temizle',

  // Selamlama
  goodMorning: 'Günaydın',
  goodAfternoon: 'İyi Günler',
  goodEvening: 'İyi Akşamlar',

  // HomeScreen
  totalPortfolioValue: 'Toplam Portföy Değeri',
  myAssets: 'Varlıklarım',
  watchlist: 'Takip Listesi',
  noAssets: 'Henüz varlık eklenmedi. Alttaki + butonuna basarak ilk dövizini ekle.',

  // SearchScreen
  discover: 'Keşfet',
  searchPlaceholder: 'Döviz kodu veya ülke ara...',
  noResults: '"{query}" için sonuç bulunamadı',
  featured: 'Öne Çıkan',
  recentSearches: 'Son Aramalar',
  clearRecents: 'Temizle',
  allCurrencies: 'Tüm Dövizler',

  // NewsScreen
  news: 'Haberler',
  marketTab: 'Piyasa',
  aiTab: 'AI Üretildi',
  noAiNews: 'Henüz AI haberi yok',
  noMarketNews: 'Henüz piyasa haberi yok',
  aiNewsSubtitle: 'AI pipeline her 6 saatte bir çalışır. Kısa süre içinde haberler burada görünecek.',
  marketNewsSubtitle: 'Piyasa haberleri yüklenemedi. İnternet bağlantınızı kontrol edin.',

  // MenuScreen
  menu: 'Menü',
  account: 'Hesap',
  profile: 'Profil',
  logout: 'Çıkış Yap',
  preferences: 'Tercihler',
  settings: 'Ayarlar',
  priceAlerts: 'Fiyat Alarmları',
  notifications: 'Bildirimler',
  theme: 'Tema',
  security: 'Güvenlik',
  about: 'Hakkında',
  accountManagement: 'Hesap Yönetimi',
  logoutTitle: 'Çıkış Yap',
  logoutMessage: 'Hesabından çıkmak istediğine emin misin?',

  // ProfileScreen
  profileTitle: 'Profil',
  email: 'E-posta',
  userId: 'Kullanıcı ID',
  accountType: 'Hesap Türü',
  demoAccount: 'Demo Hesap',
  standardAccount: 'Standart',
  demoNotice: 'Demo hesabıyla giriş yapıldı. Gerçek hesap için kayıt olun.',

  // SecurityScreen
  securityTitle: 'Güvenlik',
  biometricSection: 'Biyometrik Giriş',
  biometricLabel: 'Face ID / Parmak İzi',
  biometricUnavailable: 'Biyometrik Yok',
  biometricDesc: 'Hızlı ve güvenli giriş için kullan',
  biometricUnavailableDesc: 'Cihazınızda biyometrik doğrulama ayarlı değil',
  biometricVerify: 'Biyometrik girişi etkinleştirmek için doğrulayın',
  biometricUsePassword: 'Şifre kullan',
  changePasswordSection: 'Şifre Değiştir',
  currentPassword: 'Mevcut Şifre',
  newPassword: 'Yeni Şifre',
  newPasswordHint: 'En az 6 karakter',
  newPasswordRepeat: 'Yeni Şifre (Tekrar)',
  changePasswordBtn: 'Şifreyi Değiştir',
  passwordPlaceholder: '••••••••',
  fillAllFields: 'Tüm alanları doldurun.',
  passwordsMismatch: 'Yeni şifreler eşleşmiyor.',
  passwordTooShort: 'Şifre en az 6 karakter olmalı.',
  changePasswordNotice: 'Şifre değiştirme özelliği yakında backend ile entegre edilecek.',

  // AboutScreen
  aboutTitle: 'Hakkında',
  version: 'Versiyon {version}',
  legal: 'Yasal',
  privacyPolicy: 'Gizlilik Politikası',
  openSource: 'Açık Kaynak Kütüphaneler',
  dataSources: 'Veri Kaynakları',
  tcmbDesc: 'Döviz kurları ve makroekonomik veriler',
  aiDesc: 'RAFT tabanlı finansal haber analizi',

  // AlertsScreen
  priceAlertsTitle: 'Fiyat Alarmları',
  addBtn: '+ Ekle',
  newAlert: 'Yeni Alarm',
  currencyLabel: 'Döviz',
  directionLabel: 'Yön',
  above: '↑ Üzerine Çıkarsa',
  below: '↓ Altına Düşerse',
  priceThreshold: 'Fiyat Eşiği (TL)',
  thresholdPlaceholder: 'Örn: 35.50',
  createAlert: 'Alarm Oluştur',
  noAlerts: 'Henüz alarm eklenmedi',
  noAlertsSub: '+ Ekle butonuna basarak alarm oluşturun',
  notifPermTitle: 'Bildirim İzni',
  notifPermMsg: 'Fiyat alarmlarının çalışması için bildirim iznine ihtiyaç var. Ayarlardan izin verebilirsin.',
  invalidThreshold: 'Geçerli bir fiyat eşiği girin.',
  deleteAlertTitle: 'Alarm Sil',
  deleteAlertMsg: 'Bu alarmı silmek istediğine emin misin?',

  // NotificationsScreen
  notificationsTitle: 'Bildirimler',
  noNotifications: 'Bildirim yok',
  noNotificationsSub: 'Fiyat alarmları tetiklendiğinde burada görünecek.',
  clearHistoryTitle: 'Geçmişi Temizle',
  clearHistoryMsg: 'Tüm bildirim geçmişini silmek istiyor musun?',

  // AddAssetModal / AddAssetScreen
  selectCurrency: 'Döviz Seç',
  addCurrency: '{code} Ekle',
  addToPortfolio: 'Portföye Ekle',
  searchCurrencyPlaceholder: 'Kod veya ülke ara...',
  quantityLabel: 'Miktar (adet)',
  quantityPlaceholder: 'örn: 1000',
  buyRateLabel: 'Alış Kuru (₺)',
  buyRatePlaceholder: 'örn: 38.50',
  invalidQuantity: 'Geçerli bir miktar girin',
  invalidRate: 'Geçerli bir alış kuru girin',
  offlineBanner: '⚠ Backend bağlantısı yok — gerçek kurlar görünmüyor. Alış kurunu manuel girebilirsiniz.',
  noCurrencyList: 'Döviz listesi yüklenemedi.\nBackend bağlantısını kontrol edin.',
  noCurrencyFound: 'Döviz bulunamadı',
  addAssetTitle: 'Varlık Ekle',
  anErrorOccurred: 'Bir hata oluştu',

  // AssetCard / AssetActionSheet
  buy: 'Al',
  sell: 'Sat',
  units: 'adet',
  deleteAsset: 'Varlığı Sil',
  deleteAssetMsg: '{code} varlığını silmek istediğinizden emin misiniz?',
  remove: 'Çıkar',

  // CurrencyDetailScreen
  statistics: 'İstatistikler',
  periodHigh: 'Dönem Yüksek',
  weekHigh: '52H Yüksek',
  periodLow: 'Dönem Düşük',
  weekLow: '52H Düşük',
  changeAbs: 'Değişim ₺',
  changePct: 'Değişim %',
  periodAvg: 'Dönem Ortalaması',
  volatility: 'Volatilite',
  instantBuy: 'Anlık Alış',
  instantSell: 'Anlık Satış',
  noChartData: 'Bu dönem için grafik verisi bulunamadı.\nBackend bağlantısını kontrol edin.',
} as const;

// ── İngilizce ─────────────────────────────────────────────────────────────────
const EN: typeof TR = {
  back: '‹ Back',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  ok: 'OK',
  error: 'Error',
  info: 'Info',
  clear: 'Clear',

  goodMorning: 'Good Morning',
  goodAfternoon: 'Good Afternoon',
  goodEvening: 'Good Evening',

  totalPortfolioValue: 'Total Portfolio Value',
  myAssets: 'My Assets',
  watchlist: 'Watchlist',
  noAssets: 'No assets yet. Tap the + button below to add your first currency.',

  discover: 'Discover',
  searchPlaceholder: 'Search by currency code or country...',
  noResults: 'No results for "{query}"',
  featured: 'Featured',
  recentSearches: 'Recent Searches',
  clearRecents: 'Clear',
  allCurrencies: 'All Currencies',

  news: 'News',
  marketTab: 'Market',
  aiTab: 'AI Generated',
  noAiNews: 'No AI news yet',
  noMarketNews: 'No market news yet',
  aiNewsSubtitle: 'The AI pipeline runs every 6 hours. News will appear here shortly.',
  marketNewsSubtitle: 'Market news could not be loaded. Check your internet connection.',

  menu: 'Menu',
  account: 'Account',
  profile: 'Profile',
  logout: 'Log Out',
  preferences: 'Preferences',
  settings: 'Settings',
  priceAlerts: 'Price Alerts',
  notifications: 'Notifications',
  theme: 'Theme',
  security: 'Security',
  about: 'About',
  accountManagement: 'Account Management',
  logoutTitle: 'Log Out',
  logoutMessage: 'Are you sure you want to log out?',

  profileTitle: 'Profile',
  email: 'Email',
  userId: 'User ID',
  accountType: 'Account Type',
  demoAccount: 'Demo Account',
  standardAccount: 'Standard',
  demoNotice: 'Logged in with a demo account. Register for a real account.',

  securityTitle: 'Security',
  biometricSection: 'Biometric Login',
  biometricLabel: 'Face ID / Fingerprint',
  biometricUnavailable: 'Not Available',
  biometricDesc: 'Use for fast and secure login',
  biometricUnavailableDesc: 'Biometric authentication is not set up on this device',
  biometricVerify: 'Verify to enable biometric login',
  biometricUsePassword: 'Use password',
  changePasswordSection: 'Change Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  newPasswordHint: 'At least 6 characters',
  newPasswordRepeat: 'Repeat New Password',
  changePasswordBtn: 'Change Password',
  passwordPlaceholder: '••••••••',
  fillAllFields: 'Please fill in all fields.',
  passwordsMismatch: 'New passwords do not match.',
  passwordTooShort: 'Password must be at least 6 characters.',
  changePasswordNotice: 'Password change will be integrated with the backend soon.',

  aboutTitle: 'About',
  version: 'Version {version}',
  legal: 'Legal',
  privacyPolicy: 'Privacy Policy',
  openSource: 'Open Source Libraries',
  dataSources: 'Data Sources',
  tcmbDesc: 'Exchange rates and macroeconomic data',
  aiDesc: 'RAFT-based financial news analysis',

  priceAlertsTitle: 'Price Alerts',
  addBtn: '+ Add',
  newAlert: 'New Alert',
  currencyLabel: 'Currency',
  directionLabel: 'Direction',
  above: '↑ Rises Above',
  below: '↓ Falls Below',
  priceThreshold: 'Price Threshold (TL)',
  thresholdPlaceholder: 'e.g. 35.50',
  createAlert: 'Create Alert',
  noAlerts: 'No alerts yet',
  noAlertsSub: 'Tap + Add to create an alert',
  notifPermTitle: 'Notification Permission',
  notifPermMsg: 'Notification permission is required for price alerts. You can grant it from Settings.',
  invalidThreshold: 'Please enter a valid price threshold.',
  deleteAlertTitle: 'Delete Alert',
  deleteAlertMsg: 'Are you sure you want to delete this alert?',

  notificationsTitle: 'Notifications',
  noNotifications: 'No notifications',
  noNotificationsSub: 'Price alert notifications will appear here when triggered.',
  clearHistoryTitle: 'Clear History',
  clearHistoryMsg: 'Are you sure you want to clear all notification history?',

  selectCurrency: 'Select Currency',
  addCurrency: 'Add {code}',
  addToPortfolio: 'Add to Portfolio',
  searchCurrencyPlaceholder: 'Search by code or country...',
  quantityLabel: 'Quantity (units)',
  quantityPlaceholder: 'e.g. 1000',
  buyRateLabel: 'Buy Rate (₺)',
  buyRatePlaceholder: 'e.g. 38.50',
  invalidQuantity: 'Please enter a valid quantity',
  invalidRate: 'Please enter a valid buy rate',
  offlineBanner: '⚠ No backend connection — live rates unavailable. You can enter the rate manually.',
  noCurrencyList: 'Currency list could not be loaded.\nCheck your backend connection.',
  noCurrencyFound: 'No currencies found',
  addAssetTitle: 'Add Asset',
  anErrorOccurred: 'An error occurred',

  buy: 'Buy',
  sell: 'Sell',
  units: 'units',
  deleteAsset: 'Delete Asset',
  deleteAssetMsg: 'Are you sure you want to delete {code}?',
  remove: 'Remove',

  statistics: 'Statistics',
  periodHigh: 'Period High',
  weekHigh: '52W High',
  periodLow: 'Period Low',
  weekLow: '52W Low',
  changeAbs: 'Change ₺',
  changePct: 'Change %',
  periodAvg: 'Period Average',
  volatility: 'Volatility',
  instantBuy: 'Live Buy',
  instantSell: 'Live Sell',
  noChartData: 'No chart data for this period.\nCheck your backend connection.',
};

export type Strings = typeof TR;

export function useStrings(): Strings {
  const language = usePreferencesStore((s) => s.language);
  return language === 'en' ? EN : TR;
}

export function useGreeting(): string {
  const language = usePreferencesStore((s) => s.language);
  const s = language === 'en' ? EN : TR;
  const hour = new Date().getHours();
  if (hour < 12) return s.goodMorning;
  if (hour < 18) return s.goodAfternoon;
  return s.goodEvening;
}

/** Dil tercihine göre döviz adını döndürür */
export function localizedCurrencyName(
  currency: Currency | undefined,
  language: Language,
): string {
  if (!currency) return '';
  return (language === 'en' ? currency.name_en : currency.name) ?? currency.name ?? currency.code;
}

/** Hook: döviz adı localizer — bileşen içinde kullanım için */
export function useLocalizedCurrencyName(): (currency: Currency | undefined) => string {
  const language = usePreferencesStore((s) => s.language);
  return (currency) => localizedCurrencyName(currency, language);
}
