// Supabase JS client — sadece Realtime aboneliği için kullanılır.
// cursorrules §3.4: Sunucu verisi TanStack Query'de tutulur; Supabase Realtime sadece invalidate tetikler.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Key eksikse client oluşturma — uygulama crash olmasın, Realtime olmadan çalışsın.
let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
} else {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY eksik — Realtime devre dışı.\n' +
    'frontend/.env dosyasına Supabase Dashboard → Settings → API → anon key ekleyin.',
  );
}

export { supabase };
