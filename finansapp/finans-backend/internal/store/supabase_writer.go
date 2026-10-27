package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"finans-backend/internal/raft"
)

// WriteAnalysis Supabase REST API üzerinden ai_analiz_sonucu tablosuna kayıt ekler.
// postgres_writer başarısız olduğunda fallback olarak çağrılır.
func WriteAnalysis(result *raft.AnalysisResult) error {
	if result == nil {
		return fmt.Errorf("supabase writer: result nil")
	}

	base := normalizeURL(os.Getenv("SUPABASE_URL"))
	key := strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_KEY"))

	if base == "" || key == "" {
		return fmt.Errorf("supabase writer: SUPABASE_URL veya SUPABASE_SERVICE_KEY eksik")
	}

	if _, err := url.ParseRequestURI(base); err != nil {
		return fmt.Errorf("supabase writer: geçersiz SUPABASE_URL=%q: %w", base, err)
	}

	payload := map[string]any{
		"risk_bolgesi":       result.RiskBolgesi,
		"projeksiyon_3_ay":   result.Projeksiyon3Ay,
		"projeksiyon_6_ay":   result.Projeksiyon6Ay,
		"ozet":               result.Ozet,
		"haber_basligi":      result.HaberBasligi,
		"haber_icerigi":      result.HaberIcerigi,
		"doviz_onerileri":    result.DovizOnerileri,
		"portfoy_aciklamasi": result.PortfoyAciklamasi,
		"doviz_aciklamalari": result.DovizAciklamalari,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("supabase writer: marshal: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, base+"/rest/v1/ai_analiz_sonucu", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("supabase writer: new request: %w", err)
	}
	req.Header.Set("apikey", key)
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	client := &http.Client{Timeout: 10 * time.Second}
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

// normalizeURL Supabase URL'inden sondaki slash'ı temizler ve yaygın yazım hatalarını düzeltir.
func normalizeURL(raw string) string {
	s := strings.TrimSpace(raw)
	s = strings.TrimRight(s, "/")
	s = strings.Replace(s, "https:://", "https://", 1)
	s = strings.Replace(s, "http:://", "http://", 1)
	return s
}
