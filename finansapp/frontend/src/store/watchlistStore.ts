// cursorrules §3.4: Zustand — cross-screen global state: kullanıcı tercihleri.
// Takip listesi: satın alınmamış, sadece izlenen döviz kodları.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'finans_watchlist';

interface WatchlistState {
  codes: string[];
  add: (code: string) => Promise<void>;
  remove: (code: string) => Promise<void>;
  has: (code: string) => boolean;
  hydrate: () => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  codes: [],

  add: async (code: string) => {
    const upper = code.toUpperCase();
    const current = get().codes;
    if (current.includes(upper)) return;
    const next = [...current, upper];
    set({ codes: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  remove: async (code: string) => {
    const upper = code.toUpperCase();
    const next = get().codes.filter((c) => c !== upper);
    set({ codes: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  has: (code: string) => {
    return get().codes.includes(code.toUpperCase());
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        set({ codes: Array.isArray(parsed) ? parsed : [] });
      }
    } catch {
      // AsyncStorage okuma hatası — varsayılan boş liste ile devam
    }
  },
}));
