package pipeline

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"finans-backend/internal/currency"
	"finans-backend/internal/datasource"
	"finans-backend/internal/news"
	"finans-backend/internal/portfolio"
	"finans-backend/internal/raft"
	"finans-backend/internal/store"
)

// GenerateNews global cron pipeline: makro + haberler → Qwen → Gemini → Supabase.
// Portföy bağımsız; genel piyasa analizi + AI haber üretir.
func GenerateNews(ctx context.Context) (*raft.AnalysisResult, error) {
	if strings.TrimSpace(os.Getenv("OLLAMA_MODEL")) == "" {
		return nil, errors.New("pipeline: OLLAMA_MODEL gerekli")
	}
	if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) == "" {
		return nil, errors.New("pipeline: GEMINI_API_KEY gerekli")
	}

	path := strings.TrimSpace(os.Getenv("CLEAN_MACRO_PATH"))
	records, err := datasource.LoadCleanMacroFromPath(path)
	if err != nil {
		return nil, fmt.Errorf("pipeline: clean macro: %w", err)
	}
	if len(records) == 0 {
		return nil, errors.New("pipeline: makro kaydı bulunamadı")
	}

	// Haber başlıklarını çek (NewsAPI); hata durumunda boş liste ile devam et
	headlines := fetchNewsHeadlines(ctx, 5)

	userPrompt := raft.BuildOllamaUserPrompt(records, headlines)
	qwen, err := raft.CallOllamaWithRetry(ctx, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("pipeline: ollama: %w", err)
	}

	enriched, geminiErr := raft.EnrichGlobalWithGeminiWithRetry(ctx, qwen, headlines)
	if geminiErr != nil {
		log.Printf("[pipeline] gemini global başarısız, Qwen çıktısıyla devam: %v", geminiErr)
		enriched = &raft.GeminiEnrichedResult{
			HaberBasligi: "Piyasa Analizi",
			Ozet:         qwen.Ozet,
			HaberIcerigi: qwen.Ozet,
		}
	}

	result := raft.MergeToAnalysisResult(qwen, enriched)

	if err := persistAnalysis(ctx, result); err != nil {
		return nil, fmt.Errorf("pipeline: supabase: %w", err)
	}

	return result, nil
}

// GeneratePortfolioAnalysis kullanıcıya özgü on-demand pipeline:
// portföy + makro + haberler → Qwen (karar) → Gemini (açıklama) → DB.
func GeneratePortfolioAnalysis(ctx context.Context, userID string) (*raft.AnalysisResult, error) {
	if strings.TrimSpace(os.Getenv("OLLAMA_MODEL")) == "" {
		return nil, errors.New("pipeline: OLLAMA_MODEL gerekli")
	}
	if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) == "" {
		return nil, errors.New("pipeline: GEMINI_API_KEY gerekli")
	}

	// 1. Kullanıcı portföyünü çek
	assets, err := portfolio.DefaultService.GetByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("pipeline: portföy: %w", err)
	}

	// 2. Makro veriyi yükle
	path := strings.TrimSpace(os.Getenv("CLEAN_MACRO_PATH"))
	records, err := datasource.LoadCleanMacroFromPath(path)
	if err != nil {
		return nil, fmt.Errorf("pipeline: clean macro: %w", err)
	}
	if len(records) == 0 {
		return nil, errors.New("pipeline: makro kaydı bulunamadı")
	}

	// 3. Haber başlıklarını çek
	headlines := fetchNewsHeadlines(ctx, 5)

	// 4. Portföydeki dövizlerin anlık kurlarını çek
	promptPortfolio := buildPromptPortfolio(ctx, assets)

	// 5. Ollama (Qwen) — risk + projeksiyon (AL/TUT/SAT Go'da hesaplanır)
	userPrompt := raft.BuildOllamaPortfolioPrompt(records, headlines, promptPortfolio)
	qwen, err := raft.CallOllamaWithRetry(ctx, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("pipeline: ollama: %w", err)
	}

	// 6. AL/TUT/SAT kararlarını deterministik kurallarla hesapla (model güvenilir değil)
	qwen.DovizOnerileri = computeDovizOnerileri(qwen.RiskBolgesi, promptPortfolio)

	// 7. Gemini — haber + portföy açıklaması (429/quota hatasında Qwen çıktısıyla devam et)
	enriched, geminiErr := raft.EnrichWithGeminiSingleCallWithRetry(ctx, qwen, headlines, promptPortfolio)
	if geminiErr != nil {
		log.Printf("[pipeline] gemini portfolio başarısız, Qwen çıktısıyla devam: %v", geminiErr)
		enriched = qwenToFallbackEnriched(qwen)
	}

	// 8. Birleştir: Qwen kararları + Gemini açıklamaları
	result := raft.MergeToAnalysisResult(qwen, enriched)

	// 8. Supabase'e yaz (userID ile)
	if err := persistPortfolioAnalysis(ctx, result, userID); err != nil {
		// DB yazım hatası non-fatal: kullanıcıya sonucu yine de dön
		log.Printf("[pipeline] portfolio analysis DB yazımı başarısız (userID=%s): %v", userID, err)
	}

	return result, nil
}

// qwenToFallbackEnriched Gemini 429/quota hatasında Qwen çıktısından minimal GeminiEnrichedResult üretir.
func qwenToFallbackEnriched(qwen *raft.QwenAnalysisResult) *raft.GeminiEnrichedResult {
	aciklamalar := make([]raft.DovizAciklama, 0, len(qwen.DovizOnerileri))
	for _, d := range qwen.DovizOnerileri {
		aciklamalar = append(aciklamalar, raft.DovizAciklama{
			DovizKodu: d.DovizKodu,
			Oneri:     d.Oneri,
			Aciklama:  d.Gerekce,
		})
	}
	return &raft.GeminiEnrichedResult{
		HaberBasligi:      "Portföy Analizi",
		Ozet:              qwen.Ozet,
		HaberIcerigi:      qwen.Ozet,
		PortfoyAciklamasi: "",
		DovizAciklamalari: aciklamalar,
	}
}

// computeDovizOnerileri risk bölgesi + K/Z oranına göre AL/TUT/SAT kararı verir.
// Model çıktısına güvenmek yerine deterministik kural tabanlı hesaplama yapılır.
func computeDovizOnerileri(risk string, portfolio []raft.PromptPortfolioItem) []raft.DovizOneri {
	result := make([]raft.DovizOneri, 0, len(portfolio))
	for _, p := range portfolio {
		karPct := 0.0
		if p.AlisKuru > 0 {
			karPct = (p.AnlikKur - p.AlisKuru) / p.AlisKuru * 100.0
		}

		var oneri, gerekce string
		switch {
		case risk == "RISKLI" && karPct >= 10:
			oneri = "SAT"
			gerekce = fmt.Sprintf("Risk bölgesi yüksek; %+.1f%% kârı kilitle.", karPct)
		case risk == "RISKLI" && karPct >= 0:
			oneri = "TUT"
			gerekce = "Risk yüksek; küçük kârla çıkmak yerine pozisyonu koru."
		case risk == "RISKLI" && karPct < 0:
			oneri = "TUT"
			gerekce = fmt.Sprintf("Risk yüksek ama zarar %+.1f%%; realize etme, toparlanma bekle.", karPct)
		case risk == "GUVENLI" && karPct < -5:
			oneri = "AL"
			gerekce = fmt.Sprintf("Güvenli bölgede %+.1f%% zararda; ortalama maliyeti düşür.", karPct)
		case risk == "GUVENLI" && karPct >= 15:
			oneri = "SAT"
			gerekce = fmt.Sprintf("Güvenli bölgede %+.1f%% kâr; kısmen realize et.", karPct)
		case risk == "GUVENLI":
			oneri = "TUT"
			gerekce = "Piyasa olumlu; mevcut pozisyonu koru."
		default: // NOTR
			if karPct >= 20 {
				oneri = "SAT"
				gerekce = fmt.Sprintf("Nötr bölgede %+.1f%% yüksek kâr; kısmi satış değerlendirilebilir.", karPct)
			} else {
				oneri = "TUT"
				gerekce = "Piyasa yönü belirsiz; mevcut pozisyonu koru."
			}
		}

		result = append(result, raft.DovizOneri{
			DovizKodu: p.DovizKodu,
			Oneri:     oneri,
			Gerekce:   gerekce,
		})
	}
	return result
}

// buildPromptPortfolio portföy varlıklarını anlık kurlarla zenginleştirir.
func buildPromptPortfolio(ctx context.Context, assets []portfolio.Asset) []raft.PromptPortfolioItem {
	if len(assets) == 0 {
		return nil
	}

	// Her döviz için bir kez kur sorgula (dedup)
	rateCache := make(map[string]float64)
	for _, a := range assets {
		code := strings.ToUpper(a.DovizKodu)
		if _, seen := rateCache[code]; seen {
			continue
		}
		c, err := currency.DefaultService.GetOne(ctx, code)
		if err != nil {
			log.Printf("[pipeline] kur çekilemedi (%s): %v", code, err)
			rateCache[code] = 0
			continue
		}
		rateCache[code] = c.Buy
	}

	items := make([]raft.PromptPortfolioItem, 0, len(assets))
	for _, a := range assets {
		if a.IslemTuru != "ALIS" {
			continue // sadece aktif alış pozisyonları
		}
		items = append(items, raft.PromptPortfolioItem{
			DovizKodu: strings.ToUpper(a.DovizKodu),
			Miktar:    a.Miktar,
			AlisKuru:  a.AlisKuru,
			AnlikKur:  rateCache[strings.ToUpper(a.DovizKodu)],
		})
	}
	return items
}

// fetchNewsHeadlines NewsAPI'den haber başlığı + açıklamasını birleştirilmiş string olarak döner.
func fetchNewsHeadlines(ctx context.Context, limit int) []string {
	items, err := news.DefaultMarketService.Fetch(ctx)
	if err != nil {
		log.Printf("[pipeline] haber çekilemedi (devam edilecek): %v", err)
		return nil
	}
	result := make([]string, 0, limit)
	for i, item := range items {
		if i >= limit {
			break
		}
		h := strings.TrimSpace(item.Title)
		if item.Description != "" {
			h += ": " + strings.TrimSpace(item.Description)
		}
		result = append(result, h)
	}
	return result
}

// persistAnalysis global cron analizi için DB yazımı.
func persistAnalysis(ctx context.Context, analysis *raft.AnalysisResult) error {
	supabaseURL := strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
	supabaseKey := strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_KEY"))
	if supabaseURL == "" || supabaseKey == "" {
		return errors.New("SUPABASE_URL veya SUPABASE_SERVICE_KEY eksik")
	}

	if dbErr := store.WriteAnalysisDB(ctx, analysis, ""); dbErr == nil {
		return nil
	} else {
		log.Printf("[pipeline] pgx yazımı başarısız, REST fallback: %v", dbErr)
	}

	if restErr := store.WriteAnalysis(analysis); restErr == nil {
		return nil
	} else {
		return fmt.Errorf("db ve REST yazılamadı: %w", restErr)
	}
}

// persistPortfolioAnalysis kullanıcıya özgü analizi DB'ye yazar.
func persistPortfolioAnalysis(ctx context.Context, analysis *raft.AnalysisResult, userID string) error {
	supabaseURL := strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
	supabaseKey := strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_KEY"))
	if supabaseURL == "" || supabaseKey == "" {
		return errors.New("SUPABASE_URL veya SUPABASE_SERVICE_KEY eksik")
	}

	if dbErr := store.WriteAnalysisDB(ctx, analysis, userID); dbErr == nil {
		return nil
	} else {
		log.Printf("[pipeline] portfolio pgx yazımı başarısız, REST fallback: %v", dbErr)
	}

	return store.WriteAnalysis(analysis)
}
