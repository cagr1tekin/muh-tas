// cursorrules §3.3 — Tüm navigasyon parametreleri burada merkezi tanımlanır.
// Inline type tanımı yasak.

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  AlertsModal: undefined;
  NotificationsModal: undefined;
  AddAsset: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  AddTab: undefined;
  NewsTab: undefined;
  MenuTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  AssetDetail: { code: string };
  CurrencyDetail: { code: string };
};

export type SearchStackParamList = {
  Search: undefined;
  CurrencyDetail: { code: string };
};

export type NewsStackParamList = {
  News: undefined;
  NewsDetail: { id: string };
};

export type MenuStackParamList = {
  Menu: undefined;
  Profile: undefined;
  Settings: undefined;
  Alerts: undefined;
  Notifications: undefined;
  Theme: undefined;
  Security: undefined;
  About: undefined;
};
