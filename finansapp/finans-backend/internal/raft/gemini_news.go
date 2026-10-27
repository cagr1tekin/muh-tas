package raft

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	geminiNewsMaxTokens = 8192
	geminiNewsTemp      = 0.35
)

// DefaultRAGPlaceholder RAG henüz entegre edilmemişse kullanılacak metin.
func DefaultRAGPlaceholder() string {
	if v := strings.TrimSpace(os.Getenv("RAG_CONTEXT")); v != "" {
		return v
	}
	return "(Henüz Supabase pgvector üzerinden geçmiş tutanak veya haber çekilmedi; yalnızca güncel model çıktısı kullanılacak.)"
}

func geminiNewsModelID() string {
	if v := strings.TrimSpace(os.Getenv("GEMINI_NEWS_MODEL")); v != "" {
		return v
	}
	return "gemini-2.0-flash"
}

func geminiNewsMaxAttempts() int {
	n := 1
	if v := strings.TrimSpace(os.Getenv("GEMINI_NEWS_MAX_RETRIES")); v != "" {
		if x, err := strconv.Atoi(v); err == nil && x >= 1 {
			n = x
		}
	}
	if n > 5 {
		n = 5
	}
	return n
}

// ─── Global cron haberleştirme (portföy yok) ───────────────────────────────

func buildGlobalNewsSystemPrompt() string {
	return `Sen Türkiye ekonomisi üzerine uzmanlaşmış, profesyonel bir finans muhabirisin. Görevin, sana verilen yapay zeka analizini (JSON) kullanarak kullanıcıların anlayabileceği akıcı bir piyasa haberi yazmaktır.

Yazacağın haber, minimalist ve modern bir mobil uygulamada gösterilecek. Dil açık, net ve panik yaratmayan ama riskleri belirten profesyonel tonda olmalı.

Yanıtın yalnızca tek bir JSON nesnesi olsun (markdown fence yok). Şema:
{"haber_basligi":"en fazla 80 karakter Türkçe başlık","ozet":"en fazla 2 cümle","haber_icerigi":"paragraflar halinde akıcı detay metni, 250-400 kelimeye yakın"}

Analiz JSON'ındaki risk_bolgesi ve projeksiyon değerlerini metinde yansıt; bu alanları JSON çıktında tekrarlama.`
}

func buildGlobalNewsUserPrompt(qwen *QwenAnalysisResult, newsHeadlines []string) (string, error) {
	if qwen == nil {
		return "", errors.New("gemini global: qwen nil")
	}
	b, err := json.MarshalIndent(qwen, "", "  ")
	if err != nil {
		return "", fmt.Errorf("gemini global: marshal: %w", err)
	}
	var u strings.Builder
	u.WriteString("Qwen modelinden gelen güncel piyasa analizi:\n")
	u.Write(b)
	if len(newsHeadlines) > 0 {
		u.WriteString("\n\nBu analizle ilgili son piyasa haberleri:\n")
		for i, h := range newsHeadlines {
			if i >= 5 {
				break
			}
			u.WriteString("- ")
			u.WriteString(h)
			u.WriteString("\n")
		}
	}
	u.WriteString("\nBu verileri kullanarak güncel finans haberini oluştur.")
	return u.String(), nil
}

// EnrichGlobalWithGemini global cron için Qwen çıktısını haber metnine dönüştürür (portföy yok).
func EnrichGlobalWithGemini(ctx context.Context, qwen *QwenAnalysisResult, newsHeadlines []string) (*GeminiEnrichedResult, error) {
	key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if key == "" {
		return nil, errors.New("gemini: GEMINI_API_KEY yok")
	}
	sys := buildGlobalNewsSystemPrompt()
	user, err := buildGlobalNewsUserPrompt(qwen, newsHeadlines)
	if err != nil {
		return nil, err
	}
	raw, err := callGemini(ctx, key, geminiNewsModelID(), sys, user, geminiNewsMaxTokens, geminiNewsTemp)
	if err != nil {
		return nil, err
	}

	type globalPayload struct {
		HaberBasligi string `json:"haber_basligi"`
		Ozet         string `json:"ozet"`
		HaberIcerigi string `json:"haber_icerigi"`
	}
	txt := extractJSON(raw)
	var p globalPayload
	if err := json.Unmarshal([]byte(txt), &p); err != nil {
		return nil, fmt.Errorf("gemini global: parse: %w", err)
	}
	if strings.TrimSpace(p.HaberBasligi) == "" || strings.TrimSpace(p.HaberIcerigi) == "" {
		return nil, errors.New("gemini global: haber_basligi veya haber_icerigi boş")
	}
	if utf8.RuneCountInString(p.HaberBasligi) > 80 {
		r := []rune(p.HaberBasligi)
		p.HaberBasligi = string(r[:80])
	}
	return &GeminiEnrichedResult{
		HaberBasligi: p.HaberBasligi,
		Ozet:         p.Ozet,
		HaberIcerigi: p.HaberIcerigi,
	}, nil
}

// EnrichGlobalWithGeminiWithRetry retry ile global haberleştirme.
func EnrichGlobalWithGeminiWithRetry(ctx context.Context, qwen *QwenAnalysisResult, newsHeadlines []string) (*GeminiEnrichedResult, error) {
	maxAttempts := geminiNewsMaxAttempts()
	var lastErr error
	for i := range maxAttempts {
		res, err := EnrichGlobalWithGemini(ctx, qwen, newsHeadlines)
		if err == nil {
			return res, nil
		}
		lastErr = err
		log.Printf("[gemini global retry] attempt=%d/%d err=%v", i+1, maxAttempts, err)
		if i < maxAttempts-1 {
			time.Sleep(500 * time.Millisecond)
		}
	}
	return nil, fmt.Errorf("gemini global: %d deneme başarısız: %w", maxAttempts, lastErr)
}

// ─── Portföy analizi — tek çağrı, iki bölüm ───────────────────────────────

func buildPortfolioSystemPrompt() string {
	return `Sen Türkiye ekonomisi üzerine uzmanlaşmış bir finans muhabiri ve portföy danışmanısın. Görevin, sana verilen yapay zeka analizini ve kullanıcı portföyünü kullanarak:

1. Güncel piyasa haberi yazmak (haber bölümü)
2. Kullanıcının portföyü için AL/TUT/SAT kararlarını AÇIKLAMAK (portföy bölümü)

UYARI: AL/TUT/SAT kararları Qwen modeli tarafından verilmiştir ve değiştirilemez. Yalnızca bu kararları kullanıcı dostu dille açıkla.

Yanıtın yalnızca tek bir JSON nesnesi olsun (markdown fence yok). Şema:
{
  "haber_basligi": "en fazla 80 karakter Türkçe başlık",
  "ozet": "en fazla 2 cümle piyasa özeti",
  "haber_icerigi": "paragraflar halinde 250-400 kelime piyasa haberi",
  "portfoy_aciklamasi": "portföy hakkında 2-3 cümle genel değerlendirme",
  "doviz_aciklamalari": [
    {"doviz_kodu": "USD", "oneri": "TUT", "aciklama": "kullanıcı dostu 1-2 cümle açıklama"}
  ]
}

Kararı (AL/TUT/SAT) Qwen'den al, sadece aciklama metnini sen yaz.`
}

func buildPortfolioUserPrompt(qwen *QwenAnalysisResult, newsHeadlines []string, portfolio []PromptPortfolioItem) (string, error) {
	if qwen == nil {
		return "", errors.New("gemini portfolio: qwen nil")
	}
	b, err := json.MarshalIndent(qwen, "", "  ")
	if err != nil {
		return "", fmt.Errorf("gemini portfolio: marshal qwen: %w", err)
	}
	var u strings.Builder
	u.WriteString("Qwen modelinden gelen güncel piyasa analizi (kararlar bu JSON'dan alınacak):\n")
	u.Write(b)

	if len(newsHeadlines) > 0 {
		u.WriteString("\n\nSon piyasa haberleri (haberleştirmede kullan):\n")
		for i, h := range newsHeadlines {
			if i >= 5 {
				break
			}
			u.WriteString("- ")
			u.WriteString(h)
			u.WriteString("\n")
		}
	}

	if len(portfolio) > 0 {
		u.WriteString("\nKullanıcı portföyü (portföy açıklamasında kullan):\n")
		for _, p := range portfolio {
			karPct := 0.0
			if p.AlisKuru > 0 {
				karPct = (p.AnlikKur - p.AlisKuru) / p.AlisKuru * 100.0
			}
			u.WriteString(fmt.Sprintf(
				"- %s: %.2f adet | Alış: %.2f TL | Anlık: %.2f TL | K/Z: %+.1f%%\n",
				p.DovizKodu, p.Miktar, p.AlisKuru, p.AnlikKur, karPct,
			))
		}
	}

	u.WriteString("\nYukarıdaki verileri kullanarak hem piyasa haberini hem de portföy açıklamasını üret. ")
	u.WriteString("doviz_aciklamalari listesindeki oneri alanını Qwen'deki doviz_onerileri'nden kopyala, sadece aciklama yaz.")
	return u.String(), nil
}

type geminiPortfolioPayload struct {
	HaberBasligi      string          `json:"haber_basligi"`
	Ozet              string          `json:"ozet"`
	HaberIcerigi      string          `json:"haber_icerigi"`
	PortfoyAciklamasi string          `json:"portfoy_aciklamasi"`
	DovizAciklamalari []DovizAciklama `json:"doviz_aciklamalari"`
}

func parseGeminiPortfolioJSON(raw string) (*GeminiEnrichedResult, error) {
	txt := extractJSON(raw)
	if strings.TrimSpace(txt) == "" {
		return nil, fmt.Errorf("gemini portfolio: boş json (raw=%q)", trimForLog(raw, 120))
	}
	var p geminiPortfolioPayload
	if err := json.Unmarshal([]byte(txt), &p); err != nil {
		return nil, fmt.Errorf("gemini portfolio: parse: %w", err)
	}
	if strings.TrimSpace(p.HaberBasligi) == "" || strings.TrimSpace(p.HaberIcerigi) == "" {
		return nil, errors.New("gemini portfolio: haber_basligi veya haber_icerigi boş")
	}
	if utf8.RuneCountInString(p.HaberBasligi) > 80 {
		r := []rune(p.HaberBasligi)
		p.HaberBasligi = string(r[:80])
	}
	return &GeminiEnrichedResult{
		HaberBasligi:      p.HaberBasligi,
		Ozet:              p.Ozet,
		HaberIcerigi:      p.HaberIcerigi,
		PortfoyAciklamasi: p.PortfoyAciklamasi,
		DovizAciklamalari: p.DovizAciklamalari,
	}, nil
}

// EnrichWithGeminiSingleCall portföy analizi için tek Gemini çağrısında iki bölüm üretir:
// haber (AI haberleri) + portföy açıklaması (AL/TUT/SAT açıklamaları).
// Kararlar Qwen'den alınır; Gemini yalnızca açıklama metinlerini yazar.
func EnrichWithGeminiSingleCall(ctx context.Context, qwen *QwenAnalysisResult, newsHeadlines []string, portfolio []PromptPortfolioItem) (*GeminiEnrichedResult, error) {
	key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if key == "" {
		return nil, errors.New("gemini portfolio: GEMINI_API_KEY yok")
	}
	sys := buildPortfolioSystemPrompt()
	user, err := buildPortfolioUserPrompt(qwen, newsHeadlines, portfolio)
	if err != nil {
		return nil, err
	}
	raw, err := callGemini(ctx, key, geminiNewsModelID(), sys, user, geminiNewsMaxTokens, geminiNewsTemp)
	if err != nil {
		return nil, err
	}
	return parseGeminiPortfolioJSON(raw)
}

// EnrichWithGeminiSingleCallWithRetry retry ile portföy analizi.
func EnrichWithGeminiSingleCallWithRetry(ctx context.Context, qwen *QwenAnalysisResult, newsHeadlines []string, portfolio []PromptPortfolioItem) (*GeminiEnrichedResult, error) {
	maxAttempts := geminiNewsMaxAttempts()
	var lastErr error
	for i := range maxAttempts {
		res, err := EnrichWithGeminiSingleCall(ctx, qwen, newsHeadlines, portfolio)
		if err == nil {
			return res, nil
		}
		lastErr = err
		log.Printf("[gemini portfolio retry] attempt=%d/%d err=%v", i+1, maxAttempts, err)
		if i < maxAttempts-1 {
			time.Sleep(500 * time.Millisecond)
		}
	}
	return nil, fmt.Errorf("gemini portfolio: %d deneme başarısız: %w", maxAttempts, lastErr)
}
