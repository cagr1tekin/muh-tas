import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/services/api';
import { CurrencySchema, type Currency } from '@/services/currency.service';
import { POLL_INTERVALS } from '@/constants';

const CurrencyDetailResponseSchema = z.object({
  ok: z.boolean(),
  data: CurrencySchema,
});

async function fetchCurrencyDetail(code: string): Promise<Currency | null> {
  try {
    const res = await apiClient.get(`/api/v1/currencies/${code}`);
    const parsed = CurrencyDetailResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) return null;
    return parsed.data.data;
  } catch {
    return null;
  }
}

export function useCurrencyDetail(code: string) {
  return useQuery({
    queryKey: ['currencies', code],
    queryFn: () => fetchCurrencyDetail(code),
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    refetchInterval: POLL_INTERVALS.currencies,
    refetchIntervalInBackground: false,
    enabled: code.length > 0,
    retry: 1,
  });
}
