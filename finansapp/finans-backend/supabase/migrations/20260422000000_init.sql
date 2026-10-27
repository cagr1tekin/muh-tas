-- ============================================================
-- finans-backend Supabase şema başlatma
-- cursorrules §7 — tam tablo listesi
-- ============================================================

create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────
-- 1. kullanici_profili — Supabase auth.users üzerine ek profil
-- ────────────────────────────────────────────────────────────
create table if not exists public.kullanici_profili (
  id               uuid primary key references auth.users(id) on delete cascade,
  ad_soyad         text,
  avatar_url       text,
  para_birimi      text    not null default 'TRY',
  dil              text    not null default 'tr',
  bildirim_aktif   boolean not null default true,
  olusturulma      timestamptz not null default now(),
  guncelleme       timestamptz not null default now()
);

alter table public.kullanici_profili enable row level security;

-- Kullanıcı sadece kendi profilini okuyabilir / güncelleyebilir
create policy "Kullanici kendi profilini okur"
  on public.kullanici_profili for select
  using (auth.uid() = id);

create policy "Kullanici kendi profilini gunceller"
  on public.kullanici_profili for update
  using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. portfoy_islemleri — kullanıcı varlık alım/satım kaydı
-- ────────────────────────────────────────────────────────────
create table if not exists public.portfoy_islemleri (
  id               uuid    primary key default gen_random_uuid(),
  kullanici_id     uuid    not null references auth.users(id) on delete cascade,
  doviz_kodu       text    not null,
  islem_turu       text    not null check (islem_turu in ('ALIS', 'SATIS')),
  miktar           numeric not null check (miktar > 0),
  alis_kuru        numeric not null check (alis_kuru > 0),
  olusturulma      timestamptz not null default now()
);

alter table public.portfoy_islemleri enable row level security;

create policy "Kullanici kendi portfoyunu okur"
  on public.portfoy_islemleri for select
  using (auth.uid() = kullanici_id);

create policy "Kullanici kendi portfoyune ekler"
  on public.portfoy_islemleri for insert
  with check (auth.uid() = kullanici_id);

create policy "Kullanici kendi portfoyunden siler"
  on public.portfoy_islemleri for delete
  using (auth.uid() = kullanici_id);

create index if not exists idx_portfoy_kullanici
  on public.portfoy_islemleri (kullanici_id);

-- ────────────────────────────────────────────────────────────
-- 3. ham_makro_veri — Python fetcher çıktısı
-- ────────────────────────────────────────────────────────────
create table if not exists public.ham_makro_veri (
  id               uuid    primary key default gen_random_uuid(),
  tarih            date    not null,
  dolar_kuru       numeric,
  rezervler        numeric,
  cari_denge       numeric,
  m2_para_arzi     numeric,
  reel_efektif_kur numeric,
  politika_faizi   numeric,
  altin_sapma      boolean not null default false,
  olusturulma      timestamptz not null default now(),

  unique (tarih)
);

alter table public.ham_makro_veri enable row level security;

-- Service role yazabilir; anonim okuyabilir
create policy "Herkes ham_makro okur"
  on public.ham_makro_veri for select
  using (true);

-- ────────────────────────────────────────────────────────────
-- 4. temiz_veri_havuzu — noise_filter çıktısı
-- ────────────────────────────────────────────────────────────
create table if not exists public.temiz_veri_havuzu (
  id               uuid    primary key default gen_random_uuid(),
  tarih            date    not null,
  dolar_kuru       numeric,
  rezervler        numeric,
  cari_denge       numeric,
  m2_para_arzi     numeric,
  reel_efektif_kur numeric,
  politika_faizi   numeric,
  altin_sapma      boolean not null default false,
  olusturulma      timestamptz not null default now(),

  unique (tarih)
);

alter table public.temiz_veri_havuzu enable row level security;

create policy "Herkes temiz_veri okur"
  on public.temiz_veri_havuzu for select
  using (true);

-- ────────────────────────────────────────────────────────────
-- 5. ai_analiz_sonucu — Go pipeline çıktısı (Realtime)
-- cursorrules §7.2 birebir şema
-- ────────────────────────────────────────────────────────────
create table if not exists public.ai_analiz_sonucu (
  id               uuid    primary key default gen_random_uuid(),
  risk_bolgesi     text    not null check (risk_bolgesi in ('GUVENLI', 'RISKLI', 'NOTR')),
  projeksiyon_3_ay numeric,
  projeksiyon_6_ay numeric,
  ozet             text,
  haber_basligi    text,
  haber_icerigi    text,
  uretim_tarihi    timestamptz not null default now()
);

alter table public.ai_analiz_sonucu enable row level security;

-- Tüm kimliği doğrulanmış kullanıcılar okuyabilir
create policy "Auth kullanicilar ai_analiz okur"
  on public.ai_analiz_sonucu for select
  using (auth.role() = 'authenticated');

-- Supabase Realtime (cursorrules §7.2)
alter publication supabase_realtime add table public.ai_analiz_sonucu;
alter table public.ai_analiz_sonucu replica identity full;

create index if not exists idx_ai_analiz_uretim
  on public.ai_analiz_sonucu (uretim_tarihi desc);

-- ────────────────────────────────────────────────────────────
-- 6. fiyat_alarmlari — kullanıcı fiyat alarm kuralları
-- ────────────────────────────────────────────────────────────
create table if not exists public.fiyat_alarmlari (
  id               uuid    primary key default gen_random_uuid(),
  kullanici_id     uuid    not null references auth.users(id) on delete cascade,
  doviz_kodu       text    not null,
  esik_deger       numeric not null check (esik_deger > 0),
  yon              text    not null check (yon in ('YUKARI', 'ASAGI')),
  aktif            boolean not null default true,
  tetiklendi_mi    boolean not null default false,
  olusturulma      timestamptz not null default now()
);

alter table public.fiyat_alarmlari enable row level security;

create policy "Kullanici kendi alarmlarini okur"
  on public.fiyat_alarmlari for select
  using (auth.uid() = kullanici_id);

create policy "Kullanici alarm ekler"
  on public.fiyat_alarmlari for insert
  with check (auth.uid() = kullanici_id);

create policy "Kullanici alarm gunceller"
  on public.fiyat_alarmlari for update
  using (auth.uid() = kullanici_id);

create policy "Kullanici alarm siler"
  on public.fiyat_alarmlari for delete
  using (auth.uid() = kullanici_id);

create index if not exists idx_alarmlar_kullanici
  on public.fiyat_alarmlari (kullanici_id);
