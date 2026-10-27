package datasource

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// MacroRecord EVDS'ten gelen temizlenmiş makro veri kaydı.
type MacroRecord struct {
	Tarih          string  `json:"Tarih"`
	DolarKuru      float64 `json:"Dolar_Kuru"`
	Rezervler      float64 `json:"Rezervler"`
	CariDenge      float64 `json:"Cari_Denge"`
	M2ParaArzi     float64 `json:"M2_Para_Arzi"`
	ReelEfektifKur float64 `json:"Reel_Efektif_Kur"`
	PolitikaFaizi  float64 `json:"Politika_Faizi"`
	AltinSapma     bool    `json:"altin_sapma"`
}

const defaultPythonBaseURL = "http://localhost:8001"

func getPythonBaseURL() string {
	if v := os.Getenv("PYTHON_SERVICE_URL"); v != "" {
		return v
	}
	return defaultPythonBaseURL
}

func newHTTPClient() *http.Client {
	return &http.Client{Timeout: 10 * time.Second}
}

// LoadCleanMacroFromPath clean_macro.json dosyasını okur.
// path boşsa python/data/clean_macro.json kullanılır.
func LoadCleanMacroFromPath(path string) ([]MacroRecord, error) {
	if path == "" {
		path = filepath.Join("python", "data", "clean_macro.json")
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("datasource: read %s: %w", path, err)
	}
	return parseMacroJSON(b)
}

// FetchLatest Python servisinden temiz veriyi alır; başarısız olursa dosyadan fallback okur.
func FetchLatest(ctx context.Context) ([]MacroRecord, error) {
	client := newHTTPClient()
	base := getPythonBaseURL()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/latest", nil)
	if err != nil {
		return nil, fmt.Errorf("datasource: /latest request: %w", err)
	}
	resp, err := client.Do(req)
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			body, rerr := io.ReadAll(resp.Body)
			if rerr == nil {
				records, perr := parseMacroJSON(body)
				if perr == nil && len(records) > 0 {
					return records, nil
				}
			}
		}
	}

	return LoadCleanMacroFromPath("")
}

// TriggerRefresh Python servisinde /refresh POST isteği gönderir (202 beklenir).
func TriggerRefresh(ctx context.Context) error {
	client := newHTTPClient()
	base := getPythonBaseURL()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/refresh", nil)
	if err != nil {
		return fmt.Errorf("datasource: /refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("datasource: /refresh call: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("datasource: /refresh status=%d", resp.StatusCode)
	}
	return nil
}

// PythonHealthy Python servisinin sağlıklı olup olmadığını kontrol eder.
func PythonHealthy(ctx context.Context) bool {
	client := newHTTPClient()
	base := getPythonBaseURL()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/health", nil)
	if err != nil {
		return false
	}
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}
	var obj struct {
		Status string `json:"status"`
	}
	_ = json.Unmarshal(b, &obj)
	return obj.Status == "ok"
}

// parseMacroJSON clean_macro.json / /latest yanıtını çözümler.
func parseMacroJSON(body []byte) ([]MacroRecord, error) {
	var rawRecords []map[string]json.RawMessage
	if err := json.Unmarshal(body, &rawRecords); err != nil {
		return nil, fmt.Errorf("datasource: unmarshal records: %w", err)
	}

	out := make([]MacroRecord, 0, len(rawRecords))
	for _, rec := range rawRecords {
		var r MacroRecord
		if v, ok := rec["Tarih"]; ok {
			_ = json.Unmarshal(v, &r.Tarih)
		}
		if v, ok := rec["Dolar_Kuru"]; ok {
			r.DolarKuru, _ = parseFloat(v)
		}
		if v, ok := rec["Rezervler"]; ok {
			r.Rezervler, _ = parseFloat(v)
		}
		if v, ok := rec["Cari_Denge"]; ok {
			r.CariDenge, _ = parseFloat(v)
		}
		if v, ok := rec["M2_Para_Arzi"]; ok {
			r.M2ParaArzi, _ = parseFloat(v)
		}
		if v, ok := rec["Reel_Efektif_Kur"]; ok {
			r.ReelEfektifKur, _ = parseFloat(v)
		}
		if v, ok := rec["Politika_Faizi"]; ok {
			r.PolitikaFaizi, _ = parseFloat(v)
		}
		if v, ok := rec["altin_sapma"]; ok {
			r.AltinSapma, _ = parseBool(v)
		}
		out = append(out, r)
	}
	return out, nil
}

func parseFloat(raw json.RawMessage) (float64, error) {
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) || len(raw) == 0 {
		return 0, nil
	}
	var v float64
	return v, json.Unmarshal(raw, &v)
}

func parseBool(raw json.RawMessage) (bool, error) {
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) || len(raw) == 0 {
		return false, nil
	}
	var v bool
	return v, json.Unmarshal(raw, &v)
}
