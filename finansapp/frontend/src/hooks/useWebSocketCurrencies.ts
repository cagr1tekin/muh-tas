import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { WS_BASE } from '@/constants';
import { CurrencySchema } from '@/services/currency.service';
import { useAuthStore } from '@/store/authStore';

const WsMessageSchema = z.object({
  ok: z.literal(true),
  data: z.array(CurrencySchema),
});

const CURRENCIES_KEY = ['currencies'] as const;
const MIN_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 60_000;

// Modül düzeyinde retry sayacı — React Strict Mode'un çift mount'undan etkilenmez.
let globalRetry = 0;

export function useWebSocketCurrencies() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const activeRef = useRef(false);

  const connect = useCallback(() => {
    if (!activeRef.current) return;
    // Önceki bağlantı açıksa kapat
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const token = accessToken ?? '';
    const url = `${WS_BASE}/ws/currencies${token ? `?token=${token}` : ''}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      globalRetry = 0;
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const raw: unknown = JSON.parse(e.data as string);
        const parsed = WsMessageSchema.safeParse(raw);
        if (!parsed.success) return;

        const currencies = parsed.data.data;

        // Tüm liste — useCurrencies(), SearchScreen, AddAssetScreen, WatchlistCard
        queryClient.setQueryData(CURRENCIES_KEY, currencies);

        // Tekil kurlar — CurrencyDetailScreen (useCurrencyDetail → ['currencies', code])
        for (const currency of currencies) {
          queryClient.setQueryData(['currencies', currency.code], currency);
        }
      } catch {
        // JSON parse hatası — sessizce geç
      }
    };

    ws.onclose = () => {
      if (!activeRef.current) return;
      const delay = Math.min(MIN_BACKOFF_MS * 2 ** globalRetry, MAX_BACKOFF_MS);
      globalRetry += 1;
      timeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose zaten reconnect yapar; burada close yeterli
      ws.close();
    };
  }, [accessToken, queryClient]);

  useEffect(() => {
    activeRef.current = true;
    // Bağlantı öncesi kısa gecikme — React Strict Mode çift mount'unu absorbe eder
    timeoutRef.current = setTimeout(connect, 100);

    return () => {
      activeRef.current = false;
      clearTimeout(timeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
