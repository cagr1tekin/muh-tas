-- Supabase schema initialization for EVDS macro + AI analysis

-- UUID generator
create extension if not exists pgcrypto;

-- Ham makro veri (Python fetcher/noise filter çıktısı)
create table if not exists public.ham_makro_veri (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  dolar_kuru numeric,
  rezervler numeric,
  cari_denge numeric,
  m2_para_arzi numeric,
  reel_efektif_kur numeric,
  politika_faizi numeric,
  altin_sapma boolean default false,
  olusturulma_tarihi timestamptz default now()
);

-- Yapay zeka analiz sonucu
create table if not exists public.ai_analiz_sonucu (
  id uuid primary key default gen_random_uuid(),
  risk_bolgesi text check (risk_bolgesi in ('GUVENLI','RISKLI','NOTR')),
  projeksiyon_3_ay numeric,
  projeksiyon_6_ay numeric,
  ozet text,
  haber_basligi text,
  haber_icerigi text,
  uretimi_tarihi timestamptz default now()
);

-- RLS enable
alter table public.ham_makro_veri enable row level security;
alter table public.ai_analiz_sonucu enable row level security;

-- Realtime publication adjustments
-- Bu yayın Supabase tarafında tanımlı olmalıdır (genellikle supabase_realtime).
alter publication supabase_realtime add table public.ai_analiz_sonucu;
alter table public.ai_analiz_sonucu replica identity full;

