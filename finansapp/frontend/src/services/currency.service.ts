// cursorrules §3.2: Service katmanı — UI'dan çağrılır, doğrudan fetch yasak.
import { z } from 'zod';
import { apiClient } from './api';

export const CurrencySchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  name_en: z.string().optional(),
  unit: z.number().optional(),
  buy: z.number().nullable().optional(),
  sell: z.number().nullable().optional(),
  date: z.string().optional(),
  buy_1d_ago: z.number().nullable().optional(),
  buy_1w_ago: z.number().nullable().optional(),
});

export type Currency = z.infer<typeof CurrencySchema>;

const CurrenciesResponseSchema = z.object({
  ok: z.boolean(),
  data: z.array(CurrencySchema),
});

// Backend bağlanamadığında veya 401 döndüğünde kullanılan statik TCMB döviz listesi.
// Bu liste kur değeri içermez (buy/sell undefined) — sadece AddAssetModal döviz seçimi için.
export const STATIC_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'ABD Doları', name_en: 'US Dollar' },
  { code: 'EUR', name: 'Euro', name_en: 'Euro' },
  { code: 'GBP', name: 'İngiliz Sterlini', name_en: 'British Pound' },
  { code: 'JPY', name: 'Japon Yeni', name_en: 'Japanese Yen' },
  { code: 'CHF', name: 'İsviçre Frangı', name_en: 'Swiss Franc' },
  { code: 'AUD', name: 'Avustralya Doları', name_en: 'Australian Dollar' },
  { code: 'CAD', name: 'Kanada Doları', name_en: 'Canadian Dollar' },
  { code: 'SAR', name: 'Suudi Arabistan Riyali', name_en: 'Saudi Riyal' },
  { code: 'AED', name: 'Birleşik Arap Emirlikleri Dirhemi', name_en: 'UAE Dirham' },
  { code: 'KWD', name: 'Kuveyt Dinarı', name_en: 'Kuwaiti Dinar' },
  { code: 'SEK', name: 'İsveç Kronu', name_en: 'Swedish Krona' },
  { code: 'NOK', name: 'Norveç Kronu', name_en: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danimarka Kronu', name_en: 'Danish Krone' },
  { code: 'RUB', name: 'Rus Rublesi', name_en: 'Russian Ruble' },
  { code: 'CNY', name: 'Çin Yuanı', name_en: 'Chinese Yuan' },
];

// 401 veya network hatası durumunda statik liste döner — AddAssetModal çalışmaya devam eder.
export async function getCurrencies(): Promise<Currency[]> {
  try {
    const res = await apiClient.get('/api/v1/currencies');
    const parsed = CurrenciesResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) return STATIC_CURRENCIES;
    return parsed.data.data.length > 0 ? parsed.data.data : STATIC_CURRENCIES;
  } catch {
    return STATIC_CURRENCIES;
  }
}

// Verilen kod için anlık buy kurunu döner; bulunamazsa 0 döner.
export function findRate(currencies: Currency[], code: string): number {
  const cur = currencies.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return cur?.buy ?? cur?.sell ?? 0;
}

// Döviz kodu → emoji bayrak eşleşme tablosu
const FLAG_MAP: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CHF: '🇨🇭',
  AUD: '🇦🇺', CAD: '🇨🇦', SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰',
  SAR: '🇸🇦', AED: '🇦🇪', KWD: '🇰🇼', RUB: '🇷🇺', CNY: '🇨🇳',
  HUF: '🇭🇺', CZK: '🇨🇿', RON: '🇷🇴', BGN: '🇧🇬', PKR: '🇵🇰',
};

export function currencyFlag(code: string): string {
  return FLAG_MAP[code.toUpperCase()] ?? '🏳';
}
