// cursorrules §3.4: Zustand — kullanıcı tercihleri (cross-screen global state).
// AsyncStorage ile persist edilir.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'finans_preferences';

export type Language = 'tr' | 'en';
export type Currency = 'TRY' | 'USD' | 'EUR';
export type Theme = 'dark' | 'light';

interface PreferencesState {
  language: Language;
  currency: Currency;
  notificationsEnabled: boolean;
  theme: Theme;
  isHydrated: boolean;

  setLanguage: (lang: Language) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  hydrate: () => Promise<void>;
}

async function persist(state: Partial<PreferencesState>) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...state }));
  } catch {
    // depolama hatası — sessizce geç
  }
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  language: 'tr',
  currency: 'TRY',
  notificationsEnabled: true,
  theme: 'dark',
  isHydrated: false,

  setLanguage: async (language) => {
    set({ language });
    await persist({ language });
  },

  setCurrency: async (currency) => {
    set({ currency });
    await persist({ currency });
  },

  setTheme: async (theme) => {
    set({ theme });
    await persist({ theme });
  },

  setNotificationsEnabled: async (notificationsEnabled) => {
    set({ notificationsEnabled });
    await persist({ notificationsEnabled });
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PreferencesState>;
        set({
          language: saved.language ?? get().language,
          currency: saved.currency ?? get().currency,
          notificationsEnabled: saved.notificationsEnabled ?? get().notificationsEnabled,
          theme: saved.theme ?? 'dark',
        });
      }
    } catch {
      // hata — varsayılanlar kalır
    } finally {
      set({ isHydrated: true });
    }
  },
}));
