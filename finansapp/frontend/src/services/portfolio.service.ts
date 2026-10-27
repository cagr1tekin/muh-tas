// cursorrules §3.2: UI bileşeni asla doğrudan API çağrısı yapmaz — service katmanı.
import { z } from 'zod';
import { apiClient } from './api';
import { Asset, AddAssetPayload, PortfolioAnalysis } from '@/types/portfolio';

const AssetSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  doviz_kodu: z.string(),
  islem_turu: z.enum(['ALIS', 'SATIS']),
  miktar: z.number(),
  alis_kuru: z.number(),
  olusturulma: z.string(),
});

const PortfolioResponseSchema = z.object({
  ok: z.boolean(),
  data: z.array(AssetSchema),
});

const AddAssetResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({ id: z.string() }).optional(),
});

// 401 veya network hatası durumunda boş liste döner — uygulama çökmez.
export async function getPortfolio(): Promise<Asset[]> {
  try {
    const res = await apiClient.get('/api/v1/portfolio');
    const parsed = PortfolioResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) return [];
    return parsed.data.data as Asset[];
  } catch {
    return [];
  }
}

export async function addAsset(payload: AddAssetPayload): Promise<string> {
  const res = await apiClient.post('/api/v1/portfolio', payload);
  const parsed = AddAssetResponseSchema.safeParse(res.data);
  if (!parsed.success || !parsed.data.ok) {
    throw new Error('Varlık eklenemedi');
  }
  return parsed.data.data?.id ?? '';
}

export async function deleteAsset(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/portfolio/${id}`);
}

export async function analyzePortfolio(): Promise<PortfolioAnalysis> {
  // Ollama + Gemini toplam ~2-3 dakika sürebilir, özel timeout gerekli
  const res = await apiClient.post('/api/v1/portfolio/analyze', null, { timeout: 300_000 });
  if (!res.data?.ok) throw new Error('Analiz alınamadı');
  return res.data.data as PortfolioAnalysis;
}
