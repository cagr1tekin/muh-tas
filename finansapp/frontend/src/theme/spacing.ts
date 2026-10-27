// cursorrules §5.5 — Spacing sistemi. Temel birim: 4px. Magic number yasak.
export const Spacing = {
  '0.5': 2,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

// Sabit layout değerleri
export const Layout = {
  screenPaddingH: 16,   // ekran horizontal padding (sabit)
  cardPadding: 16,      // kart iç boşluk
  cardGap: 12,          // kart arası boşluk
  sectionTitleMT: 20,   // section başlık üst margin
  sectionTitleMB: 12,   // section başlık alt margin
  bottomBarHeight: 80,  // bottom bar yükseklik (safe area inset ayrı)
} as const;

export const BorderRadius = {
  button: 14,
  card: 16,
  badge: 6,
  avatar: 9999,
  input: 12,
} as const;
