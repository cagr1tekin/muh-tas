package currency

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const defaultPythonURL = "http://localhost:8001"

func pythonBaseURL() string {
	if v := strings.TrimSpace(os.Getenv("PYTHON_SERVICE_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return defaultPythonURL
}

// FetchHistory Python servisinden belirtilen döviz kodunun tarihsel verisini alır.
// Python servisi GET /currencies/{code}/history?period=1d|1w|1m|3m|1y çağrısını işler.
func FetchHistory(ctx context.Context, code string, period Period) ([]PricePoint, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return nil, fmt.Errorf("history: döviz kodu boş")
	}

	url := fmt.Sprintf("%s/currencies/%s/history?period=%s", pythonBaseURL(), code, string(period))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("history: request: %w", err)
	}

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("history: call: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("history: read: %w", err)
	}

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("history: %q kodu Python servisinde desteklenmiyor", code)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("history: status=%d body=%s", resp.StatusCode, truncate(string(body), 200))
	}

	var points []PricePoint
	if err := json.Unmarshal(body, &points); err != nil {
		return nil, fmt.Errorf("history: parse: %w", err)
	}
	return points, nil
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "..."
}
