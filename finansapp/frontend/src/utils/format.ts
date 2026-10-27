const TL_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** TL para formatı: 1.234,56 */
export function formatTL(value: number): string {
  return TL_FORMATTER.format(value);
}

/**
 * Döviz kuru formatı:
 * >= 1000 → 2 ondalık (ör. 38.450,24)
 * < 1000  → 4 ondalık (ör. 34,8742)
 */
export function formatRate(value: number): string {
  if (value >= 1000) {
    return TL_FORMATTER.format(value);
  }
  return value.toFixed(4);
}

/** Projeksiyon değeri — 2 ondalık sabit */
export function formatProjection(value: number): string {
  return value.toFixed(2);
}

/** Yüzde değişim: +1,23% veya -0,45% */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** Saate göre Türkçe selamlama — dil desteği için useGreeting() tercih edilmeli */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi Günler';
  return 'İyi Akşamlar';
}

/** TRY tutarı → hedef para birimine çevir (buy kur kullanılır) */
export function convertFromTRY(
  amountTRY: number,
  to: 'TRY' | 'USD' | 'EUR',
  fxRates: { USD: number; EUR: number },
): number {
  if (to === 'USD') return fxRates.USD > 0 ? amountTRY / fxRates.USD : 0;
  if (to === 'EUR') return fxRates.EUR > 0 ? amountTRY / fxRates.EUR : 0;
  return amountTRY;
}

/** Para birimi sembolü */
export function currencySymbol(code: 'TRY' | 'USD' | 'EUR'): string {
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  return '₺';
}

/** E-posta adresinden görünen ad üretir */
export function displayName(user: { email: string } | null): string {
  if (!user) return '';
  const local = user.email.split('@')[0] ?? user.email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}
