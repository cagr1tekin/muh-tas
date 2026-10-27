// cursorrules §3.2: Asset Provider Abstraction — Döviz → Altın → Borsa geçişini kırmadan sağlar.
// UI katmanı kaynağı bilmez; sadece bu interface'i kullanır.

export type Period = '1d' | '1w' | '1m' | '3m' | '1y';

export interface Asset {
  code: string;
  name?: string;
  name_en?: string;
  buy?: number | null;
  sell?: number | null;
}

export interface AssetDetail extends Asset {
  unit?: number;
  date?: string;
}

export interface PricePoint {
  date: string;
  value: number;
}

export interface IAssetProvider {
  getList(): Promise<Asset[]>;
  getDetail(code: string): Promise<AssetDetail>;
  getHistory(code: string, period: Period): Promise<PricePoint[]>;
}
