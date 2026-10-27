// cursorrules §3.2: Service katmanı — UI'dan çağrılır, doğrudan fetch yasak.
// cursorrules §3.5: API yanıtları Zod şema ile doğrulanır.
import { z } from 'zod';
import { apiClient } from './api';

// ── AI Haber ─────────────────────────────────────────────────────────────────

export const AINewsSchema = z.object({
  id: z.string(),
  risk_bolgesi: z.enum(['GUVENLI', 'RISKLI', 'NOTR']),
  projeksiyon_3_ay: z.number(),
  projeksiyon_6_ay: z.number(),
  ozet: z.string(),
  haber_basligi: z.string(),
  haber_icerigi: z.string(),
  uretim_tarihi: z.string(),
});

export type AINews = z.infer<typeof AINewsSchema>;

const AINewsResponseSchema = z.object({
  ok: z.boolean(),
  data: z.array(AINewsSchema),
});

export async function getAINews(): Promise<AINews[]> {
  try {
    const res = await apiClient.get('/api/v1/news/ai');
    const parsed = AINewsResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) return [];
    return parsed.data.data;
  } catch {
    return [];
  }
}

// ── Piyasa Haberi ─────────────────────────────────────────────────────────────

export const MarketNewsSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  source: z.string(),
  published_at: z.string(),
});

export type MarketNews = z.infer<typeof MarketNewsSchema>;

const MarketNewsResponseSchema = z.object({
  ok: z.boolean(),
  data: z.array(MarketNewsSchema),
});

export async function getMarketNews(): Promise<MarketNews[]> {
  try {
    const res = await apiClient.get('/api/v1/news/market');
    const parsed = MarketNewsResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) return [];
    return parsed.data.data;
  } catch {
    return [];
  }
}
