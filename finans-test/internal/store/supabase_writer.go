package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"net/http"
	"os"
	"strings"
	"time"

	"finans-test/internal/raft"
)

// WriteAnalysis, Supabase REST API üzerinden ai_analiz_sonucu tablosuna kayıt ekler.
func WriteAnalysis(result *raft.AnalysisResult) error {
	if result == nil {
		return fmt.Errorf("supabase writer: result is nil")
	}

	supabaseURL := normalizeBaseURL(os.Getenv("SUPABASE_URL"))
	serviceKey := strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_KEY"))

	// Main tarafı env eksikse atlıyor ama buraya da fail-safe ekleyelim.
	if supabaseURL == "" || serviceKey == "" {
		return fmt.Errorf("supabase writer: env eksik")
	}

	if _, err := url.ParseRequestURI(supabaseURL); err != nil {
		return fmt.Errorf("supabase writer: invalid SUPABASE_URL=%q err=%w", supabaseURL, err)
	}

	endpoint := supabaseURL + "/rest/v1/ai_analiz_sonucu"

	body := map[string]any{
		"risk_bolgesi":     result.RiskBolgesi,
		"projeksiyon_3_ay": result.Projeksiyon3Ay,
		"projeksiyon_6_ay": result.Projeksiyon6Ay,
		"ozet":              result.Ozet,
		"haber_basligi":    result.HaberBasligi,
		"haber_icerigi":   result.HaberIcerigi,
	}

	b, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("supabase writer: marshal request: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(b))
	if err != nil {
		return fmt.Errorf("supabase writer: new request: %w", err)
	}

	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("supabase writer: post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated {
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("supabase writer: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(respBody)))
}

func normalizeBaseURL(raw string) string {
	s := strings.TrimSpace(raw)
	s = strings.TrimRight(s, "/")

	// Pratik düzeltme: bazen shell/env kaynaklı "https:://" gelebiliyor.
	s = strings.Replace(s, "https:://", "https://", 1)
	s = strings.Replace(s, "http:://", "http://", 1)

	return s
}

