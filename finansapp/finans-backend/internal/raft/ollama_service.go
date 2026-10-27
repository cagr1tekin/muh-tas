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
	"strings"
	"time"
)

const (
	defaultOllamaHost    = "http://127.0.0.1:11434"
	ollamaNumPredict     = 4096
	ollamaChatTimeout    = 120 * time.Second
)

func ollamaHost() string {
	u := strings.TrimSpace(os.Getenv("OLLAMA_HOST"))
	if u == "" {
		return defaultOllamaHost
	}
	return strings.TrimRight(u, "/")
}

func ollamaModel() string {
	return strings.TrimSpace(os.Getenv("OLLAMA_MODEL"))
}

// CallOllamaWithContext Ollama /api/chat'e user prompt gönderir; QwenAnalysisResult döner.
// ctx ile iptal edilebilir.
func CallOllamaWithContext(ctx context.Context, userPrompt string) (*QwenAnalysisResult, error) {
	model := ollamaModel()
	if model == "" {
		return nil, errors.New("ollama: OLLAMA_MODEL boş")
	}
	if strings.TrimSpace(userPrompt) == "" {
		return nil, errors.New("ollama: user prompt boş")
	}

	url := ollamaHost() + "/api/chat"

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

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, fmt.Errorf("ollama: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: ollamaChatTimeout}
	resp, err := client.Do(req)
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

	return validateQwenOutput(raw)
}

// CallOllamaWithRetry en fazla 3 deneme yapar; hepsi başarısızsa NOTR varsayılanı döner.
func CallOllamaWithRetry(ctx context.Context, userPrompt string) (*QwenAnalysisResult, error) {
	var lastErr error
	for i := range 3 {
		res, err := CallOllamaWithContext(ctx, userPrompt)
		if err == nil {
			return res, nil
		}
		lastErr = err
		log.Printf("[ollama retry] attempt=%d err=%v", i+1, err)
		time.Sleep(500 * time.Millisecond)
	}
	log.Printf("[ollama retry] 3 denemede başarısız, NOTR varsayılanı. lastErr=%v", lastErr)
	return defaultNOTRQwen(), nil
}
