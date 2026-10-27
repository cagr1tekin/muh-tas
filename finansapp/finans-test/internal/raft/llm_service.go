package raft

import (
	"bytes"
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

type AnalysisResult struct {
	RiskBolgesi     string  `json:"risk_bolgesi"`
	Projeksiyon3Ay  float64 `json:"projeksiyon_3_ay"`
	Projeksiyon6Ay  float64 `json:"projeksiyon_6_ay"`
	Ozet            string  `json:"ozet"`
	HaberBasligi    string  `json:"haber_basligi"`
	HaberIcerigi    string  `json:"haber_icerigi"`
}

const (
	openAIModel = "gpt-4o-mini"
	// Gemini 3
	geminiModel = "gemini-3-flash-preview"
	// Haberleştirme (Qwen çıktısı sonrası ikinci aşama)
	geminiNewsModelDefault = "gemini-3.1-pro-preview"
	temperature = 0.3
	// haber_icerigi 250-400 kelime istediğimiz için token limitini artırıyoruz.
	maxTokens = 4000
)

func ensureEnvLoaded() {
	// Varsayılan davranış: Go process'i başlatılırken env set edilmemişse .env'den yükle.
	// .env zaten set edilmiş env var'ları override etmiyor.
	// Not: Bu basit parser; KEY=VALUE satırlarını destekler.
	if os.Getenv("OPENAI_API_KEY") != "" || os.Getenv("GEMINI_API_KEY") != "" {
		return
	}
	b, err := os.ReadFile(".env")
	if err != nil {
		return
	}
	lines := strings.Split(string(b), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		k := strings.TrimSpace(parts[0])
		v := strings.TrimSpace(parts[1])
		if k == "" {
			continue
		}
		v = strings.Trim(v, `"'`)
		// if set değilse set et.
		if os.Getenv(k) == "" && v != "" {
			_ = os.Setenv(k, v)
		}
	}
}

// CallLLM LLM'den JSON analiz sonucu getirir.
func CallLLM(systemPrompt, userPrompt string) (*AnalysisResult, error) {
	ensureEnvLoaded()

	geminiKey := os.Getenv("GEMINI_API_KEY")

	if geminiKey == "" {
		return nil, errors.New("llm service: GEMINI_API_KEY bulunamadı")
	}

	raw, err := callGemini(geminiKey, geminiModel, systemPrompt, userPrompt, maxTokens, temperature)
	if err != nil {
		return nil, err
	}
	return validate(raw)
}

func validate(raw string) (*AnalysisResult, error) {
	jsonText := extractJSON(raw)
	if strings.TrimSpace(jsonText) == "" {
		return nil, fmt.Errorf("llm service: empty json (raw trimmed=%q)", trimForLog(raw, 120))
	}

	var res AnalysisResult
	if err := json.Unmarshal([]byte(jsonText), &res); err != nil {
		// parse fail olduğunda ham metin kırpılmış halde hataya ekliyoruz.
		return nil, fmt.Errorf("llm service: json parse: %w (jsonText trimmed=%q)", err, trimForLog(jsonText, 220))
	}

	switch res.RiskBolgesi {
	case "GUVENLI", "RISKLI", "NOTR":
	default:
		return nil, fmt.Errorf("llm service: risk_bolgesi invalid=%q", res.RiskBolgesi)
	}

	if res.Projeksiyon3Ay < 0 || res.Projeksiyon3Ay > 500 {
		return nil, fmt.Errorf("llm service: projeksiyon_3_ay out of range=%v", res.Projeksiyon3Ay)
	}
	if res.Projeksiyon6Ay < 0 || res.Projeksiyon6Ay > 500 {
		return nil, fmt.Errorf("llm service: projeksiyon_6_ay out of range=%v", res.Projeksiyon6Ay)
	}

	if utf8.RuneCountInString(res.HaberBasligi) > 80 {
		return nil, fmt.Errorf("llm service: haber_basligi too long=%d", utf8.RuneCountInString(res.HaberBasligi))
	}

	return &res, nil
}

// CallWithRetry 3 deneme yapar. 3'ünde de fail olursa NOTR default döner.
func CallWithRetry(systemPrompt, userPrompt string) (*AnalysisResult, error) {
	var lastErr error
	for i := 0; i < 3; i++ {
		res, err := CallLLM(systemPrompt, userPrompt)
		if err == nil {
			return res, nil
		}
		lastErr = err
		log.Printf("[llm retry] attempt=%d err=%v", i+1, err)
		// Kısa bekleme (rate-limit durumlarına tolerans)
		time.Sleep(500 * time.Millisecond)
	}

	// Fail-safe: panic etme.
	log.Printf("[llm retry] failed 3 times. returning default NOTR. lastErr=%v", lastErr)
	return &AnalysisResult{
		RiskBolgesi:    "NOTR",
		Projeksiyon3Ay: 0,
		Projeksiyon6Ay: 0,
		Ozet:           "",
		HaberBasligi:   "",
		HaberIcerigi:   "",
	}, nil
}

func extractJSON(raw string) string {
	raw = strings.TrimSpace(raw)

	// 1) ```json ... ``` veya ``` ... ```
	re := regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)\\s*```")
	if m := re.FindStringSubmatch(raw); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}

	// 2) Fallback: en dış {} parçasını kes.
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

func callOpenAI(apiKey, systemPrompt, userPrompt string) (string, error) {
	url := "https://api.openai.com/v1/chat/completions"

	reqBody := map[string]any{
		"model":       openAIModel,
		"temperature": temperature,
		"max_tokens":  maxTokens,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
	}

	// Bazı servislerde json_object zorlayıcı ek alanlar desteklenir; burada yumuşak davranalım.
	reqBody["response_format"] = map[string]string{"type": "json_object"}

	b, _ := json.Marshal(reqBody)
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return "", fmt.Errorf("llm service: openai new request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	httpClient := &http.Client{Timeout: 20 * time.Second}
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("llm service: openai call: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("llm service: openai read resp: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("llm service: openai status=%d body=%s", resp.StatusCode, trimForLog(string(body), 200))
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("llm service: openai unmarshal: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("llm service: openai empty choices")
	}
	return parsed.Choices[0].Message.Content, nil
}

// callGemini generateContent çağrısı; modelId örn. gemini-3-flash-preview veya gemini-3.1-pro-preview.
func callGemini(apiKey, modelID, systemPrompt, userPrompt string, maxOut int, temp float64) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelID, apiKey)

	reqBody := map[string]any{
		"systemInstruction": map[string]any{
			"parts": []map[string]string{{"text": systemPrompt}},
		},
		"contents": []map[string]any{
			{
				"role": "user",
				"parts": []map[string]string{{"text": userPrompt}},
			},
		},
		"generationConfig": map[string]any{
			"temperature":      temp,
			"maxOutputTokens": maxOut,
		},
	}

	b, _ := json.Marshal(reqBody)
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return "", fmt.Errorf("llm service: gemini new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpTimeout := 20 * time.Second
	if maxOut > 4000 {
		httpTimeout = 120 * time.Second
	}
	httpClient := &http.Client{Timeout: httpTimeout}
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("llm service: gemini call: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("llm service: gemini read resp: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("llm service: gemini status=%d body=%s", resp.StatusCode, trimForLog(string(body), 200))
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
		return "", fmt.Errorf("llm service: gemini unmarshal: %w", err)
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("llm service: gemini empty content")
	}
	// Gemini bazen output'u birden fazla part'a bölerek döndürüyor.
	// Sadece parts[0] almak JSON'u eksik bırakabiliyor.
	sb := strings.Builder{}
	for _, p := range parsed.Candidates[0].Content.Parts {
		sb.WriteString(p.Text)
	}
	return sb.String(), nil
}

