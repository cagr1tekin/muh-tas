// cursorrules §6.3: history staleTime period'e göre (1w=30sn)
import { useQuery, useQueries } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/services/api';

export type HistoryPeriod = '1d' | '1w' | '1m' | '3m' | '1y';

export const ALL_PERIODS: HistoryPeriod[] = ['1d', '1w', '1m', '3m', '1y'];

const PricePointSchema = z.object({
  date: z.string(),
  rate: z.number(),
});

export type PricePoint = z.infer<typeof PricePointSchema>;

const HistoryResponseSchema = z.object({
  ok: z.boolean(),
  data: z.array(PricePointSchema),
});

export async function fetchHistory(code: string, period: HistoryPeriod): Promise<PricePoint[]> {
  try {
    const res = await apiClient.get(`/api/v1/currencies/${code}/history`, {
      params: { period },
    });
    const parsed = HistoryResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) return [];
    return parsed.data.data;
  } catch {
    return [];
  }
}

// Tek period için hook (SparklineChart gibi tek period gerektiren yerlerde kullanılır)
export function useCurrencyHistory(code: string, period: HistoryPeriod = '1w') {
  return useQuery({
    queryKey: ['currencies', code, 'history', period],
    queryFn: () => fetchHistory(code, period),
    staleTime: 30_000,
    gcTime: 2 * 60 * 1000,
    enabled: code.length > 0,
    retry: 1,
  });
}

// Tüm periodları aynı anda prefetch eder — CurrencyDetailScreen'de period
// değiştirince cache'den anında gösterilir, spinner çıkmaz.
export function useAllCurrencyHistory(code: string) {
  const results = useQueries({
    queries: ALL_PERIODS.map((period) => ({
      queryKey: ['currencies', code, 'history', period],
      queryFn: () => fetchHistory(code, period),
      staleTime: 30_000,
      gcTime: 2 * 60 * 1000,
      enabled: code.length > 0,
      retry: 1,
    })),
  });

  // İlk yükleme: en az bir period henüz fetching'de mi?
  const isInitialLoading = results.some((r) => r.isLoading);

  // Period → data map
  const dataMap = Object.fromEntries(
    ALL_PERIODS.map((period, i) => [period, results[i]?.data ?? []]),
  ) as Record<HistoryPeriod, PricePoint[]>;

  return { dataMap, isInitialLoading };
}
