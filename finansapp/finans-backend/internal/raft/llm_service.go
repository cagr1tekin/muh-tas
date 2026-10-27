package raft

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// DovizOneri Qwen modelinin portföydeki bir döviz için verdiği AL/TUT/SAT kararıdır.
// Karar Qwen'e aittir; Gemini bu alanı değiştiremez.
type DovizOneri struct {
	DovizKodu string `json:"doviz_kodu"` // "USD", "EUR", "GBP" …
	Oneri     string `json:"oneri"`      // "AL" | "TUT" | "SAT"
	Gerekce   string `json:"gerekce"`    // 1 cümle, Qwen'in mantığı
}

// DovizAciklama Gemini'nin DovizOneri'yi kullanıcı diline çevirdiği açıklamadır.
type DovizAciklama struct {
	DovizKodu string `json:"doviz_kodu"`
	Oneri     string `json:"oneri"`    // Qwen'den kopyalanır, Gemini değiştirmez
	Aciklama  string `json:"aciklama"` // Gemini'nin kullanıcı dostu metni
}

// QwenAnalysisResult Ollama (Qwen) modelinin ham çıktısıdır — tüm kararlar buradan gelir.
type QwenAnalysisResult struct {
	RiskBolgesi    string       `json:"risk_bolgesi"`    // GUVENLI | RISKLI | NOTR
	Projeksiyon3Ay float64      `json:"projeksiyon_3_ay"` // dinamik, makro+haber bazlı
	Projeksiyon6Ay float64      `json:"projeksiyon_6_ay"`
	Ozet           string       `json:"ozet"`             // 2 cümle analiz özeti
	DovizOnerileri []DovizOneri `json:"doviz_onerileri"`  // portföydeki her döviz için
}

// GeminiEnrichedResult Gemini'nin tek çağrıda ürettiği iki bölümlü açıklamadır.
type GeminiEnrichedResult struct {
	HaberBasligi      string          `json:"haber_basligi"`
	Ozet              string          `json:"ozet"`
	HaberIcerigi      string          `json:"haber_icerigi"`
	PortfoyAciklamasi string          `json:"portfoy_aciklamasi"`
	DovizAciklamalari []DovizAciklama `json:"doviz_aciklamalari"`
}

// AnalysisResult Qwen kararları + Gemini açıklamalarının birleşik nihai çıktısıdır.
// DB ve API response olarak kullanılır.
type AnalysisResult struct {
	// Qwen kararları — değişmez
	RiskBolgesi    string       `json:"risk_bolgesi"`
	Projeksiyon3Ay float64      `json:"projeksiyon_3_ay"`
	Projeksiyon6Ay float64      `json:"projeksiyon_6_ay"`
	DovizOnerileri []DovizOneri `json:"doviz_onerileri"`
	// Gemini açıklamaları
	HaberBasligi      string          `json:"haber_basligi"`
	Ozet              string          `json:"ozet"`
	HaberIcerigi      string          `json:"haber_icerigi"`
	PortfoyAciklamasi string          `json:"portfoy_aciklamasi"`
	DovizAciklamalari []DovizAciklama `json:"doviz_aciklamalari"`
}

const (
	geminiAnalysisModel = "gemini-2.0-flash"
	analysisMaxTokens   = 4000
	analysisTemp        = 0.3
)

// CallLLMWithContext Gemini ile analiz JSON'u üretir; ctx iptal sinyali için kullanılır.
func CallLLMWithContext(ctx context.Context, systemPrompt, userPrompt string) (*AnalysisResult, error) {
	key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if key == "" {
		return nil, errors.New("llm: GEMINI_API_KEY eksik")
	}

	raw, err := callGemini(ctx, key, geminiAnalysisModel, systemPrompt, userPrompt, analysisMaxTokens, analysisTemp)
	if err != nil {
		return nil, err
	}
	return validateAnalysis(raw)
}

// CallLLMWithRetry 3 deneme yapar; hepsi başarısız olursa NOTR varsayılanı döner.
func CallLLMWithRetry(ctx context.Context, systemPrompt, userPrompt string) (*AnalysisResult, error) {
	var lastErr error
	for i := range 3 {
		res, err := CallLLMWithContext(ctx, systemPrompt, userPrompt)
		if err == nil {
			return res, nil
		}
		lastErr = err
		log.Printf("[llm retry] attempt=%d err=%v", i+1, err)
		time.Sleep(500 * time.Millisecond)
	}
	log.Printf("[llm retry] 3 denemede başarısız, NOTR varsayılanı. lastErr=%v", lastErr)
	return defaultNOTR(), nil
}

// validateQwenOutput ham Ollama çıktısını QwenAnalysisResult'a çevirip doğrular.
func validateQwenOutput(raw string) (*QwenAnalysisResult, error) {
	jsonText := extractJSON(raw)
	if strings.TrimSpace(jsonText) == "" {
		return nil, fmt.Errorf("qwen: boş json (raw=%q)", trimForLog(raw, 120))
	}

	var res QwenAnalysisResult
	if err := json.Unmarshal([]byte(jsonText), &res); err != nil {
		return nil, fmt.Errorf("qwen: json parse: %w (jsonText=%q)", err, trimForLog(jsonText, 220))
	}

	switch res.RiskBolgesi {
	case "GUVENLI", "RISKLI", "NOTR":
	default:
		return nil, fmt.Errorf("qwen: risk_bolgesi geçersiz=%q", res.RiskBolgesi)
	}
	// Projeksiyon 0 gelirse son dolar kuru yerine makul varsayılan ata
	if res.Projeksiyon3Ay == 0 {
		res.Projeksiyon3Ay = 40.0
	}
	if res.Projeksiyon6Ay == 0 {
		res.Projeksiyon6Ay = 42.0
	}
	if res.Projeksiyon3Ay < 0 || res.Projeksiyon3Ay > 500 {
		return nil, fmt.Errorf("qwen: projeksiyon_3_ay aralık dışı=%v", res.Projeksiyon3Ay)
	}
	if res.Projeksiyon6Ay < 0 || res.Projeksiyon6Ay > 500 {
		return nil, fmt.Errorf("qwen: projeksiyon_6_ay aralık dışı=%v", res.Projeksiyon6Ay)
	}
	for i, d := range res.DovizOnerileri {
		switch d.Oneri {
		case "AL", "TUT", "SAT":
		default:
			return nil, fmt.Errorf("qwen: doviz_onerileri[%d].oneri geçersiz=%q", i, d.Oneri)
		}
	}
	return &res, nil
}

// validateAnalysis Gemini haberleştirme çıktısını doğrular (geriye dönük uyumluluk için).
func validateAnalysis(raw string) (*AnalysisResult, error) {
	jsonText := extractJSON(raw)
	if strings.TrimSpace(jsonText) == "" {
		return nil, fmt.Errorf("llm: boş json (raw=%q)", trimForLog(raw, 120))
	}
	var res AnalysisResult
	if err := json.Unmarshal([]byte(jsonText), &res); err != nil {
		return nil, fmt.Errorf("llm: json parse: %w (jsonText=%q)", err, trimForLog(jsonText, 220))
	}
	switch res.RiskBolgesi {
	case "GUVENLI", "RISKLI", "NOTR":
	default:
		return nil, fmt.Errorf("llm: risk_bolgesi geçersiz=%q", res.RiskBolgesi)
	}
	if res.Projeksiyon3Ay < 0 || res.Projeksiyon3Ay > 500 {
		return nil, fmt.Errorf("llm: projeksiyon_3_ay aralık dışı=%v", res.Projeksiyon3Ay)
	}
	if res.Projeksiyon6Ay < 0 || res.Projeksiyon6Ay > 500 {
		return nil, fmt.Errorf("llm: projeksiyon_6_ay aralık dışı=%v", res.Projeksiyon6Ay)
	}
	if utf8.RuneCountInString(res.HaberBasligi) > 80 {
		return nil, fmt.Errorf("llm: haber_basligi çok uzun=%d karakter", utf8.RuneCountInString(res.HaberBasligi))
	}
	return &res, nil
}

// MergeToAnalysisResult Qwen kararlarını Gemini açıklamalarıyla birleştirir.
func MergeToAnalysisResult(q *QwenAnalysisResult, g *GeminiEnrichedResult) *AnalysisResult {
	out := &AnalysisResult{
		RiskBolgesi:    q.RiskBolgesi,
		Projeksiyon3Ay: q.Projeksiyon3Ay,
		Projeksiyon6Ay: q.Projeksiyon6Ay,
		DovizOnerileri: q.DovizOnerileri,
		HaberBasligi:   g.HaberBasligi,
		Ozet:           g.Ozet,
		HaberIcerigi:   g.HaberIcerigi,
		PortfoyAciklamasi: g.PortfoyAciklamasi,
	}
	// Gemini'nin doviz_aciklamalari listesini oluştur; oneri alanı Qwen'den kopyalanır
	aciklamalar := make([]DovizAciklama, 0, len(g.DovizAciklamalari))
	qwenMap := make(map[string]string, len(q.DovizOnerileri))
	for _, d := range q.DovizOnerileri {
		qwenMap[d.DovizKodu] = d.Oneri
	}
	for _, da := range g.DovizAciklamalari {
		if o, ok := qwenMap[da.DovizKodu]; ok {
			da.Oneri = o // Qwen kararını zorla; Gemini'nin yazdığını geçersiz kıl
		}
		aciklamalar = append(aciklamalar, da)
	}
	out.DovizAciklamalari = aciklamalar
	return out
}

func defaultNOTRQwen() *QwenAnalysisResult {
	return &QwenAnalysisResult{RiskBolgesi: "NOTR"}
}

func defaultNOTR() *AnalysisResult {
	return &AnalysisResult{RiskBolgesi: "NOTR"}
}

// callGemini Gemini generateContent HTTP çağrısı yapar; ctx ile iptal edilebilir.
func callGemini(ctx context.Context, apiKey, modelID, systemPrompt, userPrompt string, maxOut int, temp float64) (string, error) {
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		modelID, apiKey,
	)

	reqBody := map[string]any{
		"systemInstruction": map[string]any{
			"parts": []map[string]string{{"text": systemPrompt}},
		},
		"contents": []map[string]any{
			{"role": "user", "parts": []map[string]string{{"text": userPrompt}}},
		},
		"generationConfig": map[string]any{
			"temperature":     temp,
			"maxOutputTokens": maxOut,
		},
	}

	b, _ := json.Marshal(reqBody)

	httpTimeout := 30 * time.Second
	if maxOut > 4000 {
		httpTimeout = 120 * time.Second
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return "", fmt.Errorf("gemini: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: httpTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini: call: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("gemini: read resp: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini: status=%d body=%s", resp.StatusCode, trimForLog(string(body), 200))
	}

	var parsed struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("gemini: unmarshal: %w", err)
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("gemini: boş yanıt")
	}

	var sb strings.Builder
	for _, p := range parsed.Candidates[0].Content.Parts {
		sb.WriteString(p.Text)
	}
	return sb.String(), nil
}

// extractJSON ham metinden JSON bloğunu çıkarır.
func extractJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	re := regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)\\s*```")
	if m := re.FindStringSubmatch(raw); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}
	first := strings.Index(raw, "{")
	last := strings.LastIndex(raw, "}")
	if first >= 0 && last > first {
		return raw[first : last+1]
	}
	return raw
}

func trimForLog(s string, n int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= n {
		return string(r)
	}
	return string(r[:n]) + "..."
}
