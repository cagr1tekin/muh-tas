# finans-backend — Doviz App API Sunucusu

Bu depo, **Doviz App** mobil uygulamasının arka uç katmanıdır: **Go (Gin)** ana HTTP API, **Python (FastAPI)** EVDS/makro veri servisi, **Supabase PostgreSQL** kalıcılık ve **Ollama + Gemini** ile AI haber üretim hattı.

Proje kuralları ve mimari tek kaynak: depo kökündeki [`.cursorrules`](../.cursorrules) (Doviz App Proje Kural Kitabı).

---

## İçindekiler

1. [Mimari genel bakış](#1-mimari-genel-bakış)
2. [Klasör yapısı](#2-klasör-yapısı)
3. [Gereksinimler](#3-gereksinimler)
4. [Kurulum](#4-kurulum)
5. [Ortam değişkenleri (.env)](#5-ortam-değişkenleri-env)
6. [Çalıştırma](#6-çalıştırma)
7. [HTTP API referansı](#7-http-api-referansı)
8. [Veri akışları](#8-veri-akışları)
9. [Veritabanı ve Supabase](#9-veritabanı-ve-supabase)
10. [Yerel test ve JWT](#10-yerel-test-ve-jwt)
11. [Docker](#11-docker)
12. [Sorun giderme](#12-sorun-giderme)

---

## 1. Mimari genel bakış

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mobil istemci │────▶│  Go API (Gin)    │────▶│  TCMB XML       │  ← Anlık döviz (kur listesi)
│  (React Native) │     │  :PORT (8080)    │     │  (auth yok)     │
└────────┬────────┘     └────────┬─────────┘     └─────────────────┘
         │                     │
         │                     ├──────────────────▶ Python :8001     ← Makro + tarihsel kur (EVDS)
         │                     │
         │                     └──────────────────▶ Supabase PG    ← Portföy, AI sonuçları
         │
         └──────────────────────▶ Supabase Auth (register/login)
```

**Katman özeti**

| Katman | Teknoloji | Görev |
|--------|-----------|--------|
| API | Go 1.24+, Gin | REST, JWT, rate limit yok (middleware hazır), slot limitli pipeline |
| Veri servisi | Python 3.12+, FastAPI | `clean_macro.json`, EVDS fetcher/noise_filter, döviz tarihçesi |
| AI pipeline | Go → Ollama → Gemini | `internal/pipeline`, `internal/raft` |
| Kalıcılık | pgx / REST | `internal/store`, `internal/db` (portföy) |
| Zamanlayıcı | Go `time.Ticker` | Periyodik `POST /internal/generate-news` |

**Önemli kural (`.cursorrules`)**

- `internal/api/handlers` içinden **doğrudan** `internal/store` kullanılmaz; AI yazımı **`pipeline.GenerateNews`** üzerinden gider.
- Portföy işlemleri **`internal/portfolio`** servis katmanı üzerinden `pgxpool` ile yapılır.

---

## 2. Klasör yapısı

```
finans-backend/
├── main.go                 # .env anahtar yükleme + scheduler goroutine + api.Run()
├── go.mod
├── .env.example            # Örnek ortam (kopyalayıp .env yapın)
├── .gitignore
├── docker-compose.yml      # Go + Python (kök Dockerfile gerekir — bkz. [Docker](#11-docker))
├── README.md               # Bu dosya
├── cmd/
│   └── mintjwt/            # Yerel test için HS256 JWT üretici
├── internal/
│   ├── api/
│   │   ├── server.go       # Gin router, db.Init, route grupları
│   │   └── handlers/       # health, auth, currencies, portfolio, news, generate_news
│   ├── currency/           # TCMB XML + Python history istemcisi
│   ├── db/                 # pgxpool singleton
│   ├── datasource/         # Makro JSON yükleme, Python /latest, /refresh
│   ├── middleware/         # JWT (Bearer), rate limit (hazır)
│   ├── pipeline/           # GenerateNews sıralı akış
│   ├── portfolio/          # Portföy CRUD (Supabase tablosu)
│   ├── raft/               # Ollama, Gemini haberleştirme, prompt
│   ├── scheduler/          # CRON_INTERVAL_HOURS ile generate-news tetikleme
│   └── store/              # ai_analiz_sonucu: pgx önce, REST fallback
├── python/
│   ├── server.py           # FastAPI :8001
│   ├── fetcher.py          # EVDS → raw_macro.json
│   ├── noise_filter.py     # raw → clean_macro.json
│   ├── currency_history.py  # EVDS döviz tarihçesi
│   ├── requirements.txt
│   ├── Dockerfile
│   └── data/               # clean_macro.json vb. (gitignore’da olabilir)
└── supabase/
    └── migrations/         # SQL şema
```

---

## 3. Gereksinimler

| Bileşen | Sürüm / not |
|---------|-------------|
| Go | 1.24+ (`go.mod`) |
| Python | 3.11+ önerilir (3.12 uyumlu) |
| PostgreSQL | Supabase proje veritabanı |
| (İsteğe bağlı) | Ollama, Gemini API, EVDS API anahtarı |

---

## 4. Kurulum

### 4.1 Go API

```powershell
cd finans-backend
go mod download
go build -o finans-backend.exe .
```

### 4.2 Python servisi

```powershell
cd finans-backend\python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4.3 Ortam dosyası

```powershell
cd finans-backend
copy .env.example .env
# .env dosyasını düzenleyin (aşağıdaki tabloya göre)
```

`main.go` içindeki `loadDotEnvKeys`, yalnızca **listelenen anahtarları** `.env` dosyasından okur; sistem ortamında zaten tanımlı olan değerleri **ezmez**.

---

## 5. Ortam değişkenleri (.env)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `PORT` | Hayır | Varsayılan `8080` |
| `JWT_SECRET` | **Evet** (korumalı API için) | HS256 imza; en az ~32 karakter önerilir |
| `DATABASE_URL` | Portföy için **Evet** | `postgres://...?sslmode=require` (Supabase) |
| `PYTHON_SERVICE_URL` | Hayır | Varsayılan `http://localhost:8001` |
| `CLEAN_MACRO_PATH` | Hayır | Varsayılan `python/data/clean_macro.json` (çalışma dizinine göre) |
| `SUPABASE_URL` | Auth + AI REST için | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Auth + AI REST için | Service role JWT |
| `GEMINI_API_KEY` | `/internal/generate-news` için | Gemini API |
| `OLLAMA_HOST` | Pipeline için | Örn. `http://localhost:11434` |
| `OLLAMA_MODEL` | Pipeline için | Örn. `qwen-raft-finans` |
| `PIPELINE_MAX_CONCURRENT` | Hayır | Varsayılan `3` — ağır pipeline eşzamanlılığı |
| `CRON_INTERVAL_HOURS` | Hayır | Varsayılan `6` — scheduler aralığı |
| `NEWSAPI_KEY` | Piyasa haberleri için | [newsapi.org](https://newsapi.org/register) ücretsiz plan; yoksa `/news/market` **503** döner |

**Python tarafı (`.env` kökte veya `finans-backend/.env` — scriptler `ROOT.parent / ".env"` okuyabilir)**

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `EVDS_API_KEY` | Makro + tarihçe için | TCMB EVDS; kod içinde hardcode yok |

`.env.example` dosyasına `EVDS_API_KEY` satırını eklemeniz önerilir; şu an README’de belgelenmiştir.

---

## 6. Çalıştırma

### 6.1 İki süreç (önerilen geliştirme modu)

**Terminal 1 — Python**

```powershell
cd finans-backend\python
$env:EVDS_API_KEY="62yOttpumF"   # veya kök .env
python server.py
# Dinler: http://0.0.0.0:8001
```

**Terminal 2 — Go**

```powershell
cd finans-backend
$env:JWT_SECRET = "nq5Zkx7jN3ml6JDdiXcgAetrCWKoT2L8BhbHaFzRfpGQ9vUy"
# Değerde başta DATABASE_URL= kullanmayın — yalnızca postgresql://... bağlantı dizesi
$env:DATABASE_URL = "postgresql://postgres:...@db.xxx.supabase.co:5432/postgres?sslmode=require"
.\finans-backend.exe
# veya: go run .
```

### 6.2 Makro veriyi ilk kez üretmek

Python çalışırken:

```powershell
Invoke-RestMethod -Method Post http://localhost:8001/refresh
# 202 Accepted — arka planda fetcher.py → noise_filter.py
```

Ardından `GET http://localhost:8001/latest` ile `clean_macro.json` içeriğini doğrulayın.

### 6.3 Scheduler

`main.go` başlarken `go scheduler.Start()` çalışır. İlk tetikleme **hemen değil**, `CRON_INTERVAL_HOURS` kadar bekledikten sonra `http://localhost:{PORT}/internal/generate-news` çağrılır. Yerel test için süreyi kısaltabilir veya manuel POST atabilirsiniz.

---

## 7. HTTP API referansı

Tüm JSON yanıtlarında hedef format: **`{ "ok": bool, "data": ..., "error": "..." }`** (hata durumunda `ok: false`).

### 7.1 Genel

| Method | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/health` | Hayır | Sunucu canlılığı |

### 7.2 Kimlik doğrulama (Supabase Auth REST)

| Method | Yol | Gövde | Açıklama |
|--------|-----|--------|----------|
| POST | `/auth/register` | `{ "email", "password" }` | Supabase signup |
| POST | `/auth/login` | `{ "email", "password" }` | Supabase password grant |
| POST | `/auth/refresh` | `{ "refresh_token" }` | Yeni access + Go’nun ürettiği JWT |

**Mobil istemci notu:** API, Supabase’den dönen `refresh_token` ile birlikte **kendi imzalı** kısa ömürlü `access_token` (JWT) da üretir. Korumalı rotalar **`Authorization: Bearer <Go JWT>`** bekler (`internal/middleware/auth.go`).

### 7.3 Korumalı API — `Authorization: Bearer <token>` gerekli

| Method | Yol | Açıklama |
|--------|-----|----------|
| GET | `/api/v1/currencies` | TCMB günlük XML, **60 sn** sunucu içi cache |
| GET | `/api/v1/currencies/:code` | Tek döviz |
| GET | `/api/v1/currencies/:code/history?period=1d\|1w\|1m\|3m\|1y` | Python → EVDS tarihsel seri |
| GET | `/api/v1/news/market` | NewsAPI: önce `everything` (geniş OR sorgusu), sonuç yoksa TR `top-headlines` iş; **5 dk** cache, boş sonuç cache’lenmez (`NEWSAPI_KEY` gerekli) |
| GET | `/api/v1/news/ai` | Supabase `ai_analiz_sonucu` tablosundan son 20 AI haber (`DATABASE_URL` gerekli) |
| GET | `/api/v1/portfolio` | Kullanıcı portföy listesi (`DATABASE_URL` yoksa **503**) |
| POST | `/api/v1/portfolio` | `{ "doviz_kodu", "islem_turu": "ALIS"\|"SATIS", "miktar", "alis_kuru" }` |
| DELETE | `/api/v1/portfolio/:id` | Kayıt silme |

### 7.4 Dahili (scheduler / operasyon)

| Method | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| POST | `/internal/generate-news` | Yok (üretimde ağ ile kapatılmalı) | AI pipeline — slot sınırlı |

**Güvenlik uyarısı:** `/internal/generate-news` herkese açıktır; üretimde reverse proxy ile IP kısıtı veya paylaşımlı secret header ekleyin.

---

## 8. Veri akışları

### 8.1 Anlık döviz listesi (Go → TCMB)

- Kaynak: `https://www.tcmb.gov.tr/kurlar/today.xml`
- Paket: `internal/currency/tcmb.go`
- Cache: `sync.RWMutex` + **60 saniye** TTL
- Dönüş alanları: `code`, `name`, `name_en`, `unit`, `buy`, `sell`, `date` (ISO `YYYY-MM-DD`)

### 8.2 Tarihsel kur (Go → Python → EVDS)

1. İstemci: `GET /api/v1/currencies/USD/history?period=1m`
2. Go: `internal/currency/history.go` → `GET {PYTHON_SERVICE_URL}/currencies/USD/history?period=1m`
3. Python: `currency_history.py` — `EVDS_API_KEY` ile EVDS serisi (ör. `TP.DK.USD.A.YTL`)
4. Yanıt: `[{ "date": "...", "value": ... }, ...]` (ham JSON dizi)

Desteklenen kodlar `python/currency_history.py` içindeki `CURRENCY_SERIES` sözlüğündedir.

### 8.3 Makro pipeline (AI haber)

1. `clean_macro.json` (`CLEAN_MACRO_PATH` veya Python `/latest`)
2. `raft.BuildOllamaUserPrompt` → `OLLAMA_HOST` üzerinden Ollama
3. `raft.EnrichWithGeminiNewsWithRetry` → Gemini
4. `store.WriteAnalysisDB` başarısızsa `store.WriteAnalysis` (REST)

Handler **`handlers/generate_news.go`** → yalnızca `pipeline.GenerateNews(ctx)` çağırır; store’a doğrudan gitmez.

---

## 9. Veritabanı ve Supabase

- Şema: [`supabase/migrations/`](supabase/migrations/) altındaki SQL dosyaları.
- Portföy tablosu: `public.portfoy_islemleri` (`kullanici_id`, `doviz_kodu`, `islem_turu`, `miktar`, `alis_kuru`, …).
- Go bağlantısı: `DATABASE_URL` set edildiğinde `internal/db/pool.go` içinde `pgxpool` oluşturulur; `api.Run()` başında `db.Init` çağrılır — **başarısızsa süreç sonlanır** (`log.Fatal`).

RLS politikaları migration’da tanımlıdır; bağlantı dizesi genelde **Supabase `postgres` kullanıcısı** ile RLS kurallarını uygular.

---

## 10. Yerel test ve JWT

Korumalı endpoint’ler için geçerli bir JWT gerekir. Yerel geliştirmede:

```powershell
# Önemli: go.mod burada — depo kökünden (finansapp\) çalıştırmayın.
cd finans-backend
$env:JWT_SECRET = "local-dev-secret-32chars-minimum!!"   # çalışan API ile birebir aynı olmalı
$tok = (go run ./cmd/mintjwt).Trim()
if ([string]::IsNullOrWhiteSpace($tok)) {
  throw "Token üretilemedi: önce JWT_SECRET ayarlayın; hata için: go run ./cmd/mintjwt"
}

$h = @{ Authorization = "Bearer $tok" }
Invoke-RestMethod http://localhost:8080/api/v1/currencies -Headers $h

# Haber endpoint'leri (NEWSAPI_KEY ve DATABASE_URL .env veya ortamda)
Invoke-RestMethod http://localhost:8080/api/v1/news/ai -Headers $h
Invoke-RestMethod http://localhost:8080/api/v1/news/market -Headers $h
```

**Sık hata:** `finansapp` kökünde `go run ./cmd/mintjwt` veya stderr'i `2>$null` ile gizlemek → çıktı boş kalır, PowerShell `.Trim()` için null hatası verir veya `Bearer ` ile yetkisiz kalırsınız.

`cmd/mintjwt` parametreleri:

- `-user` — JWT `user_id` (varsayılan sabit UUID)
- `-email` — e-posta claim
- `-hours` — geçerlilik süresi (varsayılan 24)

**Portföy testi:** `DATABASE_URL` tanımlı değilse `503` ve `portfolio: veritabanı bağlantısı hazır değil` mesajı döner (panic yok).

**Tarihçe testi:** Python çalışıyor olmalı ve `EVDS_API_KEY` set edilmeli.

---

## 11. Docker

`docker-compose.yml` şu servisleri tanımlar:

- `go-api` — kök dizinde **`Dockerfile`** bekler (şu an repoda yalnızca `python/Dockerfile` var).
- `python-service` — `python/Dockerfile` kullanılır.

**Seçenekler:**

1. Kök dizine uygun bir `Dockerfile` ekleyerek `docker compose up --build` kullanın.
2. Ya da Docker olmadan [Çalıştırma](#6-çalıştırma) bölümündeki iki süreç modelini kullanın.

---

## 12. Sorun giderme

| Belirti | Olası neden | Çözüm |
|---------|-------------|--------|
| `JWT_SECRET eksik` | Ortam değişkeni yok | `$env:JWT_SECRET=...` veya `.env` |
| `401 token geçersiz` | Yanlış secret veya süresi dolmuş | `mintjwt` ile yeniden üretin; sunucu ile aynı secret |
| `503` portföy | `DATABASE_URL` yok veya DB kapalı | Supabase connection string ekleyin |
| `user=... database=` ve **localhost:5432** | PowerShell’de `$env:DATABASE_URL="DATABASE_URL=postgresql://..."` — anahtar değerin içine girmiş | Yalnızca URL verin: `$env:DATABASE_URL="postgresql://..."` (kod artık çift `DATABASE_URL=` önekini de temizler) |
| Döviz listesi boş / hata | TCMB erişim veya XML parse | Ağ/firewall; TCMB dönüşünü kontrol edin |
| `history` 404/500 | Python kapalı veya `EVDS_API_KEY` eksik | `python server.py` ve `.env` |
| `clean_macro` 404 | Henüz refresh yok | `POST /refresh` sonra bekleyin |
| Pipeline hata | Ollama/Gemini/makro eksik | `.env` ve `clean_macro.json` |
| Scheduler hemen çalışmıyor | İlk tick N saat sonra | `CRON_INTERVAL_HOURS=1` veya manuel `POST /internal/generate-news` |
| `503` `/news/market` | `NEWSAPI_KEY` tanımlı değil | [newsapi.org](https://newsapi.org/register)'dan ücretsiz key alın; `.env`'e `NEWSAPI_KEY=...` ekleyin |
| `503` `/news/ai` | `DATABASE_URL` yok | Supabase connection string'i `.env`'e ekleyin |

---

## Ek kaynaklar

- Proje kuralları ve mobil mimari: [`.cursorrules`](../.cursorrules)
- Örnek ortam şablonu: [`.env.example`](.env.example)

Sorularınız veya üretim sertleştirme (TLS, internal route koruması, rate limit bağlama) için issue açabilirsiniz.
