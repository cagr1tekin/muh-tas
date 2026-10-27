// cursorrules §3.4: Zustand — sadece cross-screen global state (auth, tercihler).
// JWT access token ve refresh token Keychain/SecureStore'da tutulur; Zustand'da yalnızca bellekte.
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web'de SecureStore çalışmaz — localStorage fallback kullan.
const secureGet = (key: string) =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.getItem(key))
    : SecureStore.getItemAsync(key);

const secureSet = (key: string, value: string) =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.setItem(key, value))
    : SecureStore.setItemAsync(key, value);

// Soft logout: token SecureStore'da kalır (biometrik için), sadece session kapatılır.
export const SOFT_LOGOUT_KEY = 'finans_soft_logout';

const SECURE_KEY_TOKEN = 'finans_access_token';
const SECURE_KEY_REFRESH = 'finans_refresh_token';
const SECURE_KEY_USER = 'finans_user';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;

  setAuth: (token: string, user: AuthUser, refreshToken?: string) => Promise<void>;
  updateAccessToken: (token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isHydrated: false,

  setAuth: async (token, user, refreshToken) => {
    await secureSet(SECURE_KEY_TOKEN, token);
    await secureSet(SECURE_KEY_USER, JSON.stringify(user));
    if (refreshToken) {
      await secureSet(SECURE_KEY_REFRESH, refreshToken);
    }
    // Soft logout bayrağını kaldır — yeni oturum açıldı
    await AsyncStorage.removeItem(SOFT_LOGOUT_KEY);
    set({ accessToken: token, user, refreshToken: refreshToken ?? null });
  },

  updateAccessToken: async (token) => {
    await secureSet(SECURE_KEY_TOKEN, token);
    set({ accessToken: token });
  },

  clearAuth: async () => {
    // Token'ları SecureStore'dan SİLME — biometrik giriş için lazım.
    // Sadece Zustand state'ini temizle ve soft logout bayrağı koy.
    await AsyncStorage.setItem(SOFT_LOGOUT_KEY, 'true');
    set({ accessToken: null, refreshToken: null, user: null });
  },

  hydrate: async () => {
    try {
      const [token, refreshToken, userRaw, softLogout] = await Promise.all([
        secureGet(SECURE_KEY_TOKEN),
        secureGet(SECURE_KEY_REFRESH),
        secureGet(SECURE_KEY_USER),
        AsyncStorage.getItem(SOFT_LOGOUT_KEY),
      ]);
      // Soft logout: kullanıcı çıkış yapmış — token olsa bile oturumu geri yükleme
      if (softLogout === 'true') {
        set({ accessToken: null, refreshToken: null, user: null, isHydrated: true });
        return;
      }
      const user: AuthUser | null = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
      set({ accessToken: token, refreshToken, user, isHydrated: true });
    } catch {
      set({ accessToken: null, refreshToken: null, user: null, isHydrated: true });
    }
  },
}));
