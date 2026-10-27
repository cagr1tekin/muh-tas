import { useQuery } from '@tanstack/react-query';
import { getCurrencies } from '@/services/currency.service';
import { QUERY_STALE_TIMES, POLL_INTERVALS } from '@/constants';

const CURRENCIES_KEY = ['currencies'] as const;

// NOT: useWebSocketCurrencies() App.tsx'te TEK seferlik çağrılır.
// Buradan çağırılırsa her ekran kendi WS bağlantısını açar → gereksiz çoklama.

export function useCurrencies() {
  return useQuery({
    queryKey: CURRENCIES_KEY,
    queryFn: getCurrencies,
    staleTime: QUERY_STALE_TIMES.currencies,
    gcTime: 5 * 60 * 1000,
    // WS bağlantısı aktifken polling gerekmez.
    // 60s fallback: WS yoksa veya uygulama arka plandan döndüğünde devreye girer.
    refetchInterval: POLL_INTERVALS.currencies,
    refetchIntervalInBackground: false,
    retry: 2,
  });
}
