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
	"strings"
	"time"
)

const (
	defaultOllamaBaseURL = "http://127.0.0.1:11434"
	ollamaNumPredict     = 4096
	ollamaChatTimeout    = 120 * time.Second
)

func ollamaBaseURL() string {
	u := strings.TrimSpace(os.Getenv("OLLAMA_BASE_URL"))
	if u == "" {
		return defaultOllamaBaseURL
	}
	return strings.TrimRight(u, "/")
}

func ollamaModel() string {
	return strings.TrimSpace(os.Getenv("OLLAMA_MODEL"))
}

// CallOllama, Modelfile SYSTEM kullanan modele yalnızca user mesajı gönderir (/api/chat, stream=false).
func CallOllama(userPrompt string) (*AnalysisResult, error) {
	model := ollamaModel()
	if model == "" {
		return nil, errors.New("ollama: OLLAMA_MODEL boş")
	}
	if strings.TrimSpace(userPrompt) == "" {
		return nil, errors.New("ollama: user prompt boş")
	}

	base := ollamaBaseURL()
	url := base + "/api/chat"

	reqBody := map[string]any{
		"model":    model,
		"stream":   false,
		"messages": []map[string]string{{"role": "user", "content": userPrompt}},
		"options": map[string]any{
			"temperature": 0.0,
			"num_predict": ollamaNumPredict,
		},
	}

	b, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("ollama: marshal: %w", err)
	}

	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, fmt.Errorf("ollama: new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: ollamaChatTimeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("ollama: call: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ollama: read body: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ollama: status=%d body=%s", resp.StatusCode, trimForLog(string(body), 200))
	}

	var parsed struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("ollama: unmarshal: %w", err)
	}
	raw := strings.TrimSpace(parsed.Message.Content)
	if raw == "" {
		return nil, errors.New("ollama: boş message.content")
	}

	return validate(raw)
}

// CallOllamaWithRetry en fazla 3 deneme yapar; hepsi başarısızsa NOTR varsayılanı döner (Gemini ile aynı güvenli davranış).
func CallOllamaWithRetry(userPrompt string) (*AnalysisResult, error) {
	var lastErr error
	for i := 0; i < 3; i++ {
		res, err := CallOllama(userPrompt)
		if err == nil {
			return res, nil
		}
		lastErr = err
		log.Printf("[ollama retry] attempt=%d err=%v", i+1, err)
		time.Sleep(500 * time.Millisecond)
	}

	log.Printf("[ollama retry] failed 3 times. returning default NOTR. lastErr=%v", lastErr)
	return &AnalysisResult{
		RiskBolgesi:    "NOTR",
		Projeksiyon3Ay: 0,
		Projeksiyon6Ay: 0,
		Ozet:           "",
		HaberBasligi:   "",
		HaberIcerigi:   "",
	}, nil
}
