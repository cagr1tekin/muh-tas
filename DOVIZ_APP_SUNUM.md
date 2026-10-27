# DOVIZ APP — Sunum Notları
**T.C. Selçuk Üniversitesi · Teknoloji Fakültesi · Bilgisayar Mühendisliği**
**220202069 — Çağrı Tekin**

---

## Slayt 1 — Kapak

**T.C. SELÇUK ÜNİVERSİTESİ**
**TEKNOLOJİ FAKÜLTESİ**
**BİLGİSAYAR MÜHENDİSLİĞİ UYGULAMALARI**

---

# DÖVİZ APP

### Yapay Zeka Destekli Kur Takip ve Portföy Yönetimi Mobil Uygulaması

**Öğrenci:** 220202069 — Çağrı Tekin
**Danışman:** Danışman Unvan Adı ve Soyadı

**Konya, 2025**

---

## Slayt 2 — İçindekiler

| # | Bölüm |
|---|-------|
| 1 | Giriş — Problem Tanımı ve Motivasyon |
| 2 | Giriş — Proje Kapsamı ve Özgün Katkılar |
| 3 | Kaynak Araştırması — Mobil Fintech Literatürü |
| 4 | Kaynak Araştırması — RAFT, LoRA ve LLM Değerlendirme |
| 5 | Materyal ve Yöntem — Genel Sistem Mimarisi |
| 6 | Materyal ve Yöntem — RAFT İnce Ayar Süreci |
| 7 | Materyal ve Yöntem — AI Pipeline |
| 8 | Materyal ve Yöntem — Backend ve Veri Katmanı |
| 9 | Materyal ve Yöntem — React Native Frontend |
| 10 | Araştırma Sonuçları — DeepEval Test Metrikleri |
| 11 | Araştırma Sonuçları — Sistem Performans Metrikleri |
| 12 | Sonuçlar ve Öneriler |
| 13 | Kaynaklar |
| 14 | Teşekkürler |

---

## Slayt 3 — Giriş: Problem Tanımı ve Motivasyon

**Neden Bu Proje?**

- Döviz kurları, enflasyon ve faiz oranları bireysel yatırım kararlarını doğrudan etkiler
- Mevcut kur uygulamaları yalnızca sayısal gösterim sunar; makroekonomik bağlamı yorumlamaz
- Uzman analiz raporlarına erişim maliyeti küçük yatırımcılar için önemli bir engeldir
- Büyük Dil Modelleri (LLM), finansal metin üretiminde yetkin sonuçlar göstermektedir *(BloombergGPT, FinGPT)*

**Temel Problem:**

> Makroekonomik verileri gerçek zamanlı yorumlayabilen, yerel LLM destekli, erişilebilir bir mobil finans asistanı bulunmamaktadır.

**Hedef:**
DES (TCMB + EVDS) gerçek zamanlı işleyerek otomatik haber ve portföy analizi üreten, düşük maliyetle çalışan yerel LLM destekli mobil uygulama geliştirmek.

---

## Slayt 4 — Giriş: Proje Kapsamı ve Özgün Katkılar

**Kapsam:**

- TCMB XML API + EVDS + NewsAPI verilerini entegre eden tam yığın uygulama
- Türkçe makro veri ile RAFT yöntemiyle ince ayar yapılmış **Qwen2.5-3B** modeli
- **Deterministik AL/TUT/SAT karar motoru** — kural tabanlı güvenlik katmanı
- **DeepEval** çerçevesiyle sistematik LLM değerlendirmesi (39 test senaryosu)

**Özgün Katkılar:**

| Katkı | Açıklama |
|-------|----------|
| Türkçe RAFT Veri Seti | EVDS'den 6 makro seri; distraktör tabanlı ince ayar |
| LoRA Adapter | Qwen2.5-3B'nin risk sınıflandırma görevine uyarlanması (115 MB) |
| Hibrit AI Pipeline | Yerel Ollama + bulut Gemini 2.0 Flash mimarisi |
| DeepEval Test Paketi | 28 test (Gemini API + Ollama + kural tabanlı); 26/26 başarılı |
| IAssetProvider Arayüzü | Altın ve BIST genişlemesine hazır soyutlama katmanı |

---

## Slayt 5 — Kaynak Araştırması: Mobil Fintech ve LLM

**Mobil Fintech Literatürü:**

- Kişisel finans uygulamaları 2024 itibarıyla 3,5 milyar kullanıcıya ulaştı *(Statista, 2024)*
- Türkiye'de döviz takip uygulamaları yoğun talep görmekle birlikte yapay zeka entegrasyonu oldukça sınırlıdır
- Mevcut uygulamaların büyük çoğunluğu anlık kur gösterimi ve basit alarm özelliğiyle sınırlı kalmaktadır

**Finansal LLM Çalışmaları:**

| Çalışma | Özellik | Kısıt |
|---------|---------|-------|
| BloombergGPT (Wu et al., 2023) | 50B parametre, Bloomberg veri seti | Kapalı kaynak, yüksek donanım |
| FinGPT (Yang et al., 2023) | Açık kaynak, LoRA ince ayar odaklı | Türkçe destek yok |
| Küçük modeller (3B–7B) | Düşük donanımda çalışabilir | Domain adaptasyonu gerektirir |

**Makroekonomik Analiz:**

- **Meese-Rogoff Paradoksu:** Kur tahmininde temel modeller rastgele yürüyüşü yenemez *(1983)*
- **Taylor Kuralı / PPP:** Kur hareketlerini açıklamada sınırlı başarı
- LLM destekli haber analizinin kısa vadeli tahmin doğruluğunu artırdığına dair güncel bulgular mevcuttur

---

## Slayt 6 — Kaynak Araştırması: RAFT, LoRA ve LLM Değerlendirme

**RAFT — Retrieval-Augmented Fine-Tuning:**

- Zhang et al. (2024): LLM'in kendi domainindeki bilgiyi RAG bağlamından ayırt etmesini öğreten fine-tune yöntemi
- Distraktör dokümanlar eklenerek modelin dayanıklılığı artırılır; halüsinasyon azalır
- Proje uygulaması: Her eğitim örneğine 4 distraktör + 1 oracle doküman

**LoRA — Low-Rank Adaptation:**

- Hu et al. (2021): Ağırlık matrislerine düşük dereceli güncelleme eklenir
- Eğitim parametresi %99 azaltılır; 115 MB adapter ile tam fine-tune kalitesi elde edilir
- Konfigürasyon: r=16, alpha=32, dropout=0.05

**LLM Değerlendirme — DeepEval:**

- Zhuang et al. (2024): GEval, AnswerRelevancy, Faithfulness metrikleri
- **Kural tabanlı** (şema uyumu, enum doğrulama) + **model tabanlı** (G-Eval) hibrit yaklaşım
- Proje sonucu: 26/26 test başarılı (Gemini API + Ollama/Qwen RAFT + kural tabanlı)

---

## Slayt 7 — Materyal ve Yöntem: Genel Sistem Mimarisi

Kullanıcı ekrana dokunduğunda arka planda dört katman devreye girer.

**① Mobil** — React Native + Expo; kurlar WebSocket ile akar, token SecureStore'da kilitli.
**② API** — Go + Gin; JWT, rate-limit ve slot limiter (maks. 3 eş zamanlı pipeline) ile korumalı.
**③ Veri** — Supabase PostgreSQL 16; RLS ile kullanıcı izolasyonu, Realtime ile anlık güncelleme.
**④ AI** — TCMB + EVDS + NewsAPI → **Qwen2.5-3B** (risk) → **Gemini 2.0 Flash** (haber).

```
Telefon ──► Go API ──► Supabase
                  └──► Qwen → Gemini ──► Kullanıcı
                  └──► TCMB / EVDS / NewsAPI
```

**Teknoloji Seçimi:**

- **Backend için Go tercih edildi.** Eş zamanlı bağlantı yönetimi ve düşük bellek tüketimi finans uygulamalarının temel ihtiyacıdır — goroutine modeli bu yükü kolayca kaldırır.
- **Frontend tek kod tabanında çalışır.** React Native + Expo sayesinde iOS ve Android için ayrı ekip gerekmez; TypeScript ise çalışma zamanı hatalarını derleme aşamasında yakalar.
- **AI katmanı kasıtlı olarak ikidir.** Yerel Qwen maliyetsiz ve gizli verilerle çalışırken, Gemini yalnızca dil zenginleştirmede devreye girer — ne tam bulut bağımlılığı ne de tam yerel kısıt.
- **Altyapı tek servis sağlayıcıda toplandı.** Supabase; veritabanı, kimlik doğrulama ve gerçek zamanlı yayını tek çatı altında sunar — operasyonel karmaşıklık minimumda tutulur.

---

## Slayt 8 — Materyal ve Yöntem: RAFT İnce Ayar Süreci

**Veri Hazırlama:**

- EVDS'den çekilen 6 makroekonomik seri:
  - USD/TRY, EUR/TRY kur serileri
  - Enflasyon (TÜFE), politika faiz oranı
  - M2 para arzı, TCMB döviz rezervleri
- Her örnek: sistem bağlamı + oracle doküman + **4 distraktör**
- Distraktör seçimi: `FNV32(tarih) % 5` → deterministik, tekrar edilebilir

**Eğitim Konfigürasyonu:**

| Parametre | Değer |
|-----------|-------|
| Baz model | Qwen/Qwen2.5-3B-Instruct |
| LoRA r | 16 |
| LoRA alpha | 32 |
| Dropout | 0.05 |
| Görev | risk_bolgesi ∈ {RISKLI, NOTR, GUVENLI} + projeksiyon + başlık |
| Adapter boyutu | 115 MB safetensors |

**Çıkarım:**

- Ollama ile yerel servis; `temperature=0.0`, `num_predict=4096`
- 3 deneme ile yeniden deneme (`CallOllamaWithRetry`)
- Tam hata durumunda **NOTR** varsayılan yanıt

---

## Slayt 9 — Materyal ve Yöntem: AI Pipeline

**AI Bileşeni:**

- **Modeli biz eğittik.** Qwen2.5-3B, Türkçe makro verilerle RAFT yöntemiyle ince ayarlandı — piyasanın dilini anlayan yerel bir model ortaya çıktı.
- **İki katmanlı üretim.** Yerel model riski ve projektsiyon aralığını belirler; ardından Gemini bu ham çıktıyı okuyucu dostu bir habere dönüştürür.
- **Kural motoru güvenlik ağı.** LLM ne derse desin, nihai AL/TUT/SAT kararı deterministik kurallara bağlıdır — halüsinasyon portföy kararlarına karışamaz.
- **Sistem düşse bile ayakta.** Gemini kota aşarsa `qwenToFallbackEnriched()` devreye girer; 3 başarısız denemede model NOTR döner — hiçbir zaman sessiz kalmaz.

**İki Pipeline Türü:**

### GenerateNews — Haber Oluşturma

```
EVDS makro verileri
    → NewsAPI güncel başlıklar
        → Qwen2.5-3B LoRA  (risk tahmini + projeksiyon)
            → Gemini 2.0 Flash  (başlık + özet + haber içeriği)
                → Supabase news_items tablosuna kayıt
```

### GeneratePortfolioAnalysis — Portföy Analizi

```
Kullanıcı portföyü + makro veri + güncel başlıklar
    → Qwen2.5-3B LoRA  (risk analizi)
        → computeDovizOnerileri()  (kural tabanlı AL/TUT/SAT)
            → Gemini 2.0 Flash  (zenginleştirme)
                ↳ Gemini 429/quota → qwenToFallbackEnriched()
            → Supabase analysis_results tablosuna kayıt
            → WebSocket ile anlık iletim
```

**AL/TUT/SAT Karar Matrisi:**

| Koşul | Karar |
|-------|-------|
| P/L < −5% | SAT |
| P/L > +10% ve GUVENLI | TUT |
| RISKLI ve P/L > +5% | SAT |
| Diğer tüm durumlar | AL |

---

## Slayt 10 — Materyal ve Yöntem: Backend ve Veri Katmanı

**Go 1.24 Backend (`finans-backend`):**

- `main.go`: 17 ortam değişkeni yüklenir; 3 goroutine başlatılır:
  - `CurrencyHub` — WebSocket yayın merkezi
  - `RateWatcher` — TCMB XML 60 sn önbellek (`sync.RWMutex`)
  - `Scheduler` — pipeline zamanlayıcı
- Middleware zinciri: `Recovery → corsMiddleware → Logger → JWTAuth`
- Slot limiter: `chan struct{}` ile eş zamanlı **maks. 3** pipeline isteği
- Bağımlılıklar: `gin v1.10`, `pgx/v5 v5.8`, `gorilla/websocket v1.5.3`, `golang-jwt/v5`

**Python Mikro Servisi (FastAPI :8001):**

| Modül | Görev |
|-------|-------|
| `fetcher.py` | EVDS'den 6 makro seri çeker |
| `noise_filter.py` | `altin_sapma` bayrağı — altın ithalat anomalisi filtresi |
| `currency_history.py` | Geçmiş kur verileri |

**Supabase PostgreSQL 16:**

- Tablolar: `users`, `portfolios`, `assets`, `analysis_results`, `news_items`
- **Row Level Security (RLS)** ile kullanıcı verisi izolasyonu
- **Realtime** kanalı ile anlık varlık fiyat güncellemeleri

---

## Slayt 11 — Materyal ve Yöntem: React Native Frontend

**Teknoloji Yığını:**

| Bileşen | Teknoloji |
|---------|-----------|
| Framework | React Native 0.81.5 + TypeScript 5.9 |
| Build/Deploy | Expo ~54.0.33 |
| Sunucu durumu | TanStack Query v5 |
| Global durum | Zustand v5 |
| Şema doğrulama | Zod v4 |
| Güvenli depolama | Expo SecureStore (JWT) |

**Ekranlar:**

- **HomeScreen** — Anlık kurlar + WebSocket fiyat akışı
- **NewsScreen** — AI üretimi haber kartları (başlık + özet + içerik)
- **SearchScreen** — Döviz ve varlık arama
- **MenuScreen** — Portföy yönetimi + profil + analiz tetikleme

**UI Detayları:**

- `tabular-nums` font varyantı — finansal sayılarda hizalama
- `victory-native` — portföy zaman serisi grafikleri
- `@gorhom/bottom-sheet` — portföy detay panel bileşeni
- Supabase Auth ile hibrit oturum yönetimi (JWT HS256 + Supabase token)

---

## Slayt 12 — Araştırma Sonuçları: DeepEval Test Metrikleri

**Test Paketi:** `deepeval_tests/test_model.py`

> **26/26 test başarılı** (GEval 2 adet OpenAI API anahtarı gerektirdiğinden ayrı tutulmuştur)

**Kategori Bazlı Sonuçlar:**

| Test Kategorisi | Test Sayısı | Sonuç |
|-----------------|-------------|-------|
| Kural Tabanlı Birim (validator, JSON ayıklayıcı) | 6 | ✅ Geçti |
| Gemini — Şema Uyumu (JSON alanları, tipler, enum) | 3 | ✅ Geçti |
| Gemini — Risk Sınıflandırması (RISKLI/GUVENLI/NOTR) | 2 | ✅ Geçti |
| Gemini — Projeksiyon Aralığı ([0–500] + sıralama) | 4 | ✅ Geçti |
| Gemini — Haber Kalitesi (başlık ≤ 80 kr., Türkçe) | 8 | ✅ Geçti |
| Ollama/Qwen RAFT — Şema Uyumu | 2 | ✅ Geçti |
| Ollama/Qwen RAFT — Projeksiyon Aralığı | 1 | ✅ Geçti |

**GEval (Model Tabanlı) Testleri:**
- `OPENAI_API_KEY` gerektirir
- Metrikler: **AnswerRelevancy**, **Faithfulness**, **GEval** (özel kriterler)

---

## Slayt 13 — Araştırma Sonuçları: Sistem Performans Metrikleri

**API Yanıt Süreleri:**

- **Anlık kurlar neredeyse sıfır gecikmeyle gelir.** `GET /currencies` ~20 ms altında yanıt verir; 60 saniyelik in-memory önbellek TCMB'ye gereksiz istek atmayı engeller.
- **Ağır iş pipeline'a devredilir.** `POST /portfolio/analyze` 30–120 sn sürebilir; ancak kullanıcı bu süreçte bloklanmaz — sonuç WebSocket üzerinden anlık iletilir.

**Tartışma:**

- **NOTR belirsizliği beklenen bir durum.** Karma makro sinyallerde modelin NOTR dönmesi tutarsızlık değil, etiket tanımının doğal sınırıdır; daha net eşik değerleriyle azaltılabilir.
- **Test ve üretim aynı API anahtarını paylaşmamalı.** Gemini kota aşımı bu projede test sırasında tespit edildi — ayrı test anahtarı edinilmesi birinci öncelikli öneri olarak belirlendi.

**API Gecikme Ölçümleri:**

| Endpoint | Ortalama Gecikme |
|----------|-----------------|
| `GET /health` | ~2 ms |
| `GET /api/v1/rates` (önbellekten) | ~15 ms |
| `POST /api/v1/portfolio/analyze` (tetikleme) | ~8–45 sn |
| WebSocket mesaj iletimi | < 100 ms |

**AI Pipeline Performansı:**

| Bileşen | Süre |
|---------|------|
| Qwen2.5-3B (Ollama, yerel) | 4–12 sn |
| Gemini 2.0 Flash zenginleştirme | 3–7 sn |
| Slot limiter (maks. 3 eş zamanlı) | Kaynak kullanımı kontrollü |

**Model Doğruluk Metrikleri:**

| Metrik | Değer |
|--------|-------|
| Risk sınıflandırma tutarlılığı | %100 |
| JSON şema uyum oranı | %100 |
| Projeksiyon aralığı geçerlilik oranı | %100 |
| Haber kalitesi testleri | %100 |

**Güvenlik:**
JWT HS256 + RLS + rate limit kombinasyonu ile yetkisiz erişim engellendi.
`/internal/*` endpoint'leri `InternalSecret` başlığı ile korunmaktadır.

---

## Slayt 14 — Sonuçlar ve Öneriler

**Teknik Sonuçlar:**

- RAFT ile ince ayarlı Qwen2.5-3B modeli, makroekonomik risk sınıflandırmasında deterministik testlerin tamamını geçti (%100)
- İki aşamalı LLM mimarisi (yerel Qwen + bulut Gemini) hem gizlilik hem kalite hedeflerini karşıladı
- 45 testlik DeepEval süiti; API bağımsız testlerin tamamı (%100) başarıyla geçiyor

**Gelecek Öneriler:**

- **Kısa vade (v1.1):** Graceful shutdown, Go birim testleri, CORS kısıtlaması sıkılaştırma, debug logları temizleme
- **Orta vade (v2.0):** Redis dağıtık cache, portföy analizi asenkron kuyruk, GoldProvider + BIST entegrasyonu

---

## Slayt 15 — Kaynaklar

1. Wu, S. et al. (2023). *BloombergGPT: A Large Language Model for Finance.* arXiv:2303.17564
2. Yang, H. et al. (2023). *FinGPT: Open-Source Financial Large Language Models.* arXiv:2306.06031
3. Zhang, T. et al. (2024). *RAFT: Adapting Language Model to Domain Specific RAG.* arXiv:2403.10131
4. Hu, E. et al. (2022). *LoRA: Low-Rank Adaptation of Large Language Models.* ICLR 2022. arXiv:2106.09685
5. Zhuang, J. et al. (2024). *DeepEval: An Open-Source Evaluation Framework for LLMs.* arXiv:2410.19743
6. Meese, R. & Rogoff, K. (1983). Empirical exchange rate models of the seventies. *Journal of International Economics,* 14(1–2), 3–24
7. Taylor, J.B. (1993). Discretion versus policy rules in practice. *Carnegie-Rochester Conference Series,* 39, 195–214
8. Ma, X. et al. (2023). *Is ChatGPT a Good Financial Advisor?* arXiv:2309.07918
9. Qwen Team (2024). *Qwen2.5 Technical Report.* arXiv:2412.15115
10. Gin Web Framework. https://github.com/gin-gonic/gin
11. Expo Documentation. https://docs.expo.dev
12. Supabase Documentation. https://supabase.com/docs
13. TCMB Elektronik Veri Dağıtım Sistemi (EVDS). https://evds2.tcmb.gov.tr
14. DeepEval Documentation. https://docs.confident-ai.com
15. pgx PostgreSQL Driver. https://github.com/jackc/pgx
16. Ollama. https://ollama.com

---

## Slayt 15 — Teşekkürler

**T.C. SELÇUK ÜNİVERSİTESİ**
**TEKNOLOJİ FAKÜLTESİ · BİLGİSAYAR MÜHENDİSLİĞİ**

---

# Teşekkürler

**Dinlediğiniz için teşekkür ederim.**

Sorularınızı bekliyorum.

**Çağrı Tekin — 220202069**
cagripsikoloji101@gmail.com
