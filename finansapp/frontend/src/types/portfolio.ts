// cursorrules §3.5: API yanıtı için ayrı DTO, UI için ayrı ViewModel — karıştırma.

// Backend /api/v1/portfolio dönen Asset kaydı (DTO)
export interface Asset {
  id: string;
  user_id: string;
  doviz_kodu: string;
  islem_turu: 'ALIS' | 'SATIS';
  miktar: number;
  alis_kuru: number;
  olusturulma: string;
}

// POST /api/v1/portfolio gövdesi
export interface AddAssetPayload {
  doviz_kodu: string;
  islem_turu: 'ALIS' | 'SATIS';
  miktar: number;
  alis_kuru: number;
}

// POST /api/v1/portfolio/analyze yanıtı
export interface DovizOneri {
  doviz_kodu: string;
  oneri: 'AL' | 'TUT' | 'SAT';
  gerekce: string;
}

export interface DovizAciklama {
  doviz_kodu: string;
  oneri: 'AL' | 'TUT' | 'SAT';
  aciklama: string;
}

export interface PortfolioAnalysis {
  risk_bolgesi: 'GUVENLI' | 'RISKLI' | 'NOTR';
  projeksiyon_3_ay: number;
  projeksiyon_6_ay: number;
  doviz_onerileri: DovizOneri[];
  haber_basligi: string;
  ozet: string;
  haber_icerigi: string;
  portfoy_aciklamasi: string;
  doviz_aciklamalari: DovizAciklama[];
}

// UI katmanında K/Z hesabı eklenmiş ViewModel
export interface AssetViewModel extends Asset {
  currentRate: number;   // anlık kur (buy fiyatı)
  currentValue: number;  // miktar × currentRate
  purchaseValue: number; // miktar × alis_kuru
  profitLoss: number;    // currentValue − purchaseValue
  profitLossPct: number; // (profitLoss / purchaseValue) × 100
}
