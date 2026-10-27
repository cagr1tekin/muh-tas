package raft

import (
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

// DefaultRAGPlaceholder, pgvector / Supabase RAG henüz yokken kullanıcı promptuna giden metin.
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
	return geminiNewsModelDefault
}

// geminiNewsMaxAttempts haberleştirme için deneme sayısı (varsayılan 1). 429 kota gibi
// kalıcı hatalarda fazla deneme gereksizdir; GEMINI_NEWS_MAX_RETRIES ile 2-5 artırılabilir.
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

// BuildGeminiNewsSystemPrompt haberleştirme aşaması için Gemini systemInstruction metnidir.
func BuildGeminiNewsSystemPrompt() string {
	return `Sen Türkiye ekonomisi üzerine uzmanlaşmış, profesyonel bir finans muhabirisin. Görevin, sana verilen ham yapay zeka analizini (JSON) ve geçmiş piyasa bağlamını (RAG) kullanarak, son kullanıcıların kolayca anlayabileceği akıcı bir piyasa haberi yazmaktır.

Yazacağın haber metni, 'Premium Industrial' tasarıma sahip, minimalist ve modern bir mobil uygulamada gösterilecektir. Bu nedenle dilin çok karmaşık olmamalı; temiz, net, panik yaratmayan ama riskleri de açıkça belirten profesyonel bir tonda olmalıdır.

Lütfen haberi bir başlık, kısa bir özet ve detaylı analiz paragrafları şeklinde yapılandır.

Yanıtın yalnızca tek bir JSON nesnesi olsun (başka metin veya markdown fence yok). Şema:
{"haber_basligi":"en fazla 80 karakter Türkçe başlık","ozet":"en fazla 2 cümle","haber_icerigi":"paragraflar halinde akıcı detay metni, 250-400 kelimeye yakın"}

Analiz JSON'ındaki risk_bolgesi ve projeksiyon değerlerini metinde tutarlı şekilde yansıt; bu alanları JSON çıktında tekrarlamana gerek yok (yalnızca haber_basligi, ozet, haber_icerigi döndür).`
}

// BuildGeminiNewsUserPrompt Qwen/Ollama çıktısı ve RAG bloğunu birleştirir.
func BuildGeminiNewsUserPrompt(analysis *AnalysisResult, ragContext string) (string, error) {
	if analysis == nil {
		return "", errors.New("gemini news: analysis nil")
	}
	b, err := json.MarshalIndent(analysis, "", "  ")
	if err != nil {
		return "", fmt.Errorf("gemini news: marshal analysis: %w", err)
	}
	rag := strings.TrimSpace(ragContext)
	if rag == "" {
		rag = DefaultRAGPlaceholder()
	}
	var u strings.Builder
	u.WriteString("İşte Qwen modelinden gelen güncel piyasa analizi:\n")
	u.Write(b)
	u.WriteString("\n\nİşte bu durumla benzerlik gösteren geçmiş bağlamlar (RAG Verisi):\n")
	u.WriteString(rag)
	u.WriteString("\n\nBu verileri harmanlayarak güncel finans haberini oluştur.")
	return u.String(), nil
}

type geminiNewsPayload struct {
	HaberBasligi string `json:"haber_basligi"`
	Ozet         string `json:"ozet"`
	HaberIcerigi string `json:"haber_icerigi"`
}

func parseGeminiNewsJSON(raw string) (*geminiNewsPayload, error) {
	txt := extractJSON(raw)
	if strings.TrimSpace(txt) == "" {
		return nil, fmt.Errorf("gemini news: boş json (raw=%q)", trimForLog(raw, 120))
	}
	var p geminiNewsPayload
	if err := json.Unmarshal([]byte(txt), &p); err != nil {
		return nil, fmt.Errorf("gemini news: parse: %w", err)
	}
	if strings.TrimSpace(p.HaberBasligi) == "" || strings.TrimSpace(p.HaberIcerigi) == "" {
		return nil, errors.New("gemini news: haber_basligi veya haber_icerigi boş")
	}
	if utf8.RuneCountInString(p.HaberBasligi) > 80 {
		r := []rune(p.HaberBasligi)
		p.HaberBasligi = string(r[:80])
	}
	return &p, nil
}

// EnrichAnalysisWithGeminiNews, sayısal/risk alanlarını koruyup yalnızca haber metinlerini Gemini 3.1 Pro ile yeniden yazar.
func EnrichAnalysisWithGeminiNews(base *AnalysisResult, ragContext string) (*AnalysisResult, error) {
	ensureEnvLoaded()
	key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if key == "" {
		return nil, errors.New("gemini news: GEMINI_API_KEY yok")
	}
	sys := BuildGeminiNewsSystemPrompt()
	user, err := BuildGeminiNewsUserPrompt(base, ragContext)
	if err != nil {
		return nil, err
	}
	raw, err := callGemini(key, geminiNewsModelID(), sys, user, geminiNewsMaxTokens, geminiNewsTemp)
	if err != nil {
		return nil, err
	}
	payload, err := parseGeminiNewsJSON(raw)
	if err != nil {
		return nil, err
	}
	out := *base
	out.HaberBasligi = payload.HaberBasligi
	out.Ozet = payload.Ozet
	out.HaberIcerigi = payload.HaberIcerigi
	return &out, nil
}

// EnrichAnalysisWithGeminiNewsWithRetry birden fazla deneme yapabilir (varsayılan 1, env: GEMINI_NEWS_MAX_RETRIES).
func EnrichAnalysisWithGeminiNewsWithRetry(base *AnalysisResult, ragContext string) (*AnalysisResult, error) {
	max := geminiNewsMaxAttempts()
	var last error
	for i := 0; i < max; i++ {
		res, err := EnrichAnalysisWithGeminiNews(base, ragContext)
		if err == nil {
			return res, nil
		}
		last = err
		log.Printf("[gemini news retry] attempt=%d/%d err=%v", i+1, max, err)
		if i < max-1 {
			time.Sleep(500 * time.Millisecond)
		}
	}
	return nil, fmt.Errorf("gemini news: %d deneme başarısız: %w", max, last)
}
