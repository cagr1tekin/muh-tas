// Mevcut kurları fiyat alarmlarıyla karşılaştırır; eşik aşılırsa lokal bildirim gönderir.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocalAlert } from '@/services/push.service';
import { Currency } from '@/services/currency.service';
import { PriceAlert } from '@/features/menu/AlertsScreen';

const ALERTS_KEY = 'finans_price_alerts';
const FIRED_KEY = 'finans_alerts_fired';   // hangi alarm ID'leri zaten tetiklendi
const CHECK_INTERVAL_MS = 60_000;

export function useAlertChecker(): void {
  const qc = useQueryClient();

  useEffect(() => {
    async function check() {
      try {
        const [alertsRaw, firedRaw] = await Promise.all([
          AsyncStorage.getItem(ALERTS_KEY),
          AsyncStorage.getItem(FIRED_KEY),
        ]);

        const alerts: PriceAlert[] = alertsRaw ? (JSON.parse(alertsRaw) as PriceAlert[]) : [];
        const fired: Record<string, boolean> = firedRaw
          ? (JSON.parse(firedRaw) as Record<string, boolean>)
          : {};

        if (alerts.length === 0) return;

        const currencies = qc.getQueryData<Currency[]>(['currencies']);
        if (!currencies || currencies.length === 0) return;

        const newFired = { ...fired };
        let didFire = false;

        for (const alert of alerts) {
          if (fired[alert.id]) continue;

          const cur = currencies.find(
            (c) => c.code.toUpperCase() === alert.code.toUpperCase(),
          );
          const rate = cur?.buy ?? cur?.sell;
          if (rate == null) continue;

          const triggered =
            (alert.direction === 'above' && rate >= alert.threshold) ||
            (alert.direction === 'below' && rate <= alert.threshold);

          if (triggered) {
            await sendLocalAlert(alert, rate);
            newFired[alert.id] = true;
            didFire = true;
          }
        }

        if (didFire) {
          await AsyncStorage.setItem(FIRED_KEY, JSON.stringify(newFired));
        }
      } catch {
        // sessizce geç
      }
    }

    void check();
    const timer = setInterval(() => { void check(); }, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [qc]);
}
