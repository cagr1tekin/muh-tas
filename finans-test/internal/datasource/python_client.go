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

func getHTTPClient() *http.Client {
	return &http.Client{Timeout: 10 * time.Second}
}

func getPythonBaseURL() string {
	if v := os.Getenv("PYTHON_SERVICE_URL"); v != "" {
		return v
	}
	return defaultPythonBaseURL
}

func parseFloatFromRaw(raw json.RawMessage) (float64, error) {
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) || len(raw) == 0 {
		return 0, nil
	}
	var v float64
	if err := json.Unmarshal(raw, &v); err != nil {
		return 0, err
	}
	return v, nil
}

func parseBoolFromRaw(raw json.RawMessage) (bool, error) {
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) || len(raw) == 0 {
		return false, nil
	}
	var v bool
	if err := json.Unmarshal(raw, &v); err != nil {
		return false, err
	}
	return v, nil
}

func fetchLatestFromPython(client *http.Client, pythonBaseURL string) ([]MacroRecord, error) {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, pythonBaseURL+"/latest", nil)
	if err != nil {
		return nil, fmt.Errorf("python client: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("python client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("python client: /latest status=%d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("python client: %w", err)
	}

	return ParseMacroRecordsJSON(body)
}

// ParseMacroRecordsJSON, clean_macro.json /latest gövdesi (JSON array of records) çözümler.
func ParseMacroRecordsJSON(body []byte) ([]MacroRecord, error) {
	var rawRecords []map[string]json.RawMessage
	if err := json.Unmarshal(body, &rawRecords); err != nil {
		return nil, fmt.Errorf("python client: unmarshal records: %w", err)
	}

	out := make([]MacroRecord, 0, len(rawRecords))
	for _, rec := range rawRecords {
		var r MacroRecord

		if v, ok := rec["Tarih"]; ok {
			_ = json.Unmarshal(v, &r.Tarih)
		}
		if v, ok := rec["Dolar_Kuru"]; ok {
			r.DolarKuru, _ = parseFloatFromRaw(v)
		}
		if v, ok := rec["Rezervler"]; ok {
			r.Rezervler, _ = parseFloatFromRaw(v)
		}
		if v, ok := rec["Cari_Denge"]; ok {
			r.CariDenge, _ = parseFloatFromRaw(v)
		}
		if v, ok := rec["M2_Para_Arzi"]; ok {
			r.M2ParaArzi, _ = parseFloatFromRaw(v)
		}
		if v, ok := rec["Reel_Efektif_Kur"]; ok {
			r.ReelEfektifKur, _ = parseFloatFromRaw(v)
		}
		if v, ok := rec["Politika_Faizi"]; ok {
			r.PolitikaFaizi, _ = parseFloatFromRaw(v)
		}
		if v, ok := rec["altin_sapma"]; ok {
			r.AltinSapma, _ = parseBoolFromRaw(v)
		}

		out = append(out, r)
	}

	return out, nil
}

// LoadCleanMacroFromPath clean_macro.json dosyasını okur. path boşsa data/clean_macro.json kullanılır.
func LoadCleanMacroFromPath(path string) ([]MacroRecord, error) {
	if path == "" {
		path = filepath.Join("data", "clean_macro.json")
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("datasource: read %s: %w", path, err)
	}
	return ParseMacroRecordsJSON(b)
}

func fetchLatestFromFallbackFile() ([]MacroRecord, error) {
	path := filepath.Join("data", "clean_macro.json")
	return LoadCleanMacroFromPath(path)
}

// FetchLatest temiz verinin en güncel halini alır.
// Python başarısız olursa ./data/clean_macro.json dosyasından fallback okur.
func FetchLatest() ([]MacroRecord, error) {
	client := getHTTPClient()
	pythonBaseURL := getPythonBaseURL()

	records, err := fetchLatestFromPython(client, pythonBaseURL)
	if err == nil && len(records) > 0 {
		return records, nil
	}

	// fallback
	fallback, fbErr := fetchLatestFromFallbackFile()
	if fbErr != nil {
		return nil, fmt.Errorf("python client: fetchLatest: %w (fallback err: %v)", err, fbErr)
	}
	return fallback, nil
}

// TriggerRefresh python tarafında /refresh çağırır ve 202 accepted bekler.
func TriggerRefresh() error {
	client := getHTTPClient()
	pythonBaseURL := getPythonBaseURL()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, pythonBaseURL+"/refresh", nil)
	if err != nil {
		return fmt.Errorf("python client: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("python client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("python client: /refresh status=%d", resp.StatusCode)
	}
	return nil
}

// HealthCheck servisin cevap verip vermediğini kontrol eder.
func HealthCheck() bool {
	client := getHTTPClient()
	pythonBaseURL := getPythonBaseURL()

	resp, err := client.Get(pythonBaseURL + "/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false
	}

	var obj struct {
		Status string `json:"status"`
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}
	if err := json.Unmarshal(b, &obj); err != nil {
		return false
	}
	return obj.Status == "ok"
}

