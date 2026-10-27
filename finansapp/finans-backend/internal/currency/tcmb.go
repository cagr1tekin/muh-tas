package currency

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	tcmbURL    = "https://www.tcmb.gov.tr/kurlar/today.xml"
	cacheTTL   = 60 * time.Second
	httpTimeout = 15 * time.Second
)

// ── TCMB XML yapısı ──────────────────────────────────────────────────────────

type tcmbRoot struct {
	XMLName    xml.Name       `xml:"Tarih_Date"`
	DateAttr   string         `xml:"Date,attr"`
	Currencies []tcmbCurrency `xml:"Currency"`
}

type tcmbCurrency struct {
	Code         string `xml:"CurrencyCode,attr"`
	Unit         string `xml:"Unit"`
	Name         string `xml:"Isim"`
	NameEN       string `xml:"CurrencyName"`
	ForexBuying  string `xml:"ForexBuying"`
	ForexSelling string `xml:"ForexSelling"`
}

// ── In-memory cache ──────────────────────────────────────────────────────────

type tcmbCache struct {
	mu        sync.RWMutex
	data      []Currency
	fetchedAt time.Time
}

var globalCache = &tcmbCache{}

// fetchFromTCMB TCMB XML'ini HTTP ile çeker ve parse eder.
func fetchFromTCMB(ctx context.Context) ([]Currency, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tcmbURL, nil)
	if err != nil {
		return nil, fmt.Errorf("tcmb: request: %w", err)
	}
	req.Header.Set("User-Agent", "finans-backend/1.0")

	client := &http.Client{Timeout: httpTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tcmb: fetch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tcmb: status=%d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("tcmb: read: %w", err)
	}

	return parseTCMBXML(body)
}

// parseTCMBXML TCMB XML içeriğini []Currency'e dönüştürür.
func parseTCMBXML(data []byte) ([]Currency, error) {
	var root tcmbRoot
	if err := xml.Unmarshal(data, &root); err != nil {
		return nil, fmt.Errorf("tcmb: xml parse: %w", err)
	}

	// TCMB Date="22/04/2026" → "2026-04-22"
	date := parseTCMBDate(root.DateAttr)

	out := make([]Currency, 0, len(root.Currencies))
	for _, c := range root.Currencies {
		buy := parseDecimal(c.ForexBuying)
		sell := parseDecimal(c.ForexSelling)

		// Kross kurlar ForexBuying/Selling boş olabilir; bunları atla.
		if buy == 0 && sell == 0 {
			continue
		}

		unit := 1
		if u, err := strconv.Atoi(strings.TrimSpace(c.Unit)); err == nil && u > 0 {
			unit = u
		}

		out = append(out, Currency{
			Code:   strings.TrimSpace(c.Code),
			Name:   strings.TrimSpace(c.Name),
			NameEN: strings.TrimSpace(c.NameEN),
			Unit:   unit,
			Buy:    buy,
			Sell:   sell,
			Date:   date,
		})
	}
	return out, nil
}

// GetAll cache TTL'i dolmuşsa TCMB'den taze veri çeker.
// cursorrules §6.3: currencies staleTime=60sn.
func GetAll(ctx context.Context) ([]Currency, error) {
	globalCache.mu.RLock()
	if time.Since(globalCache.fetchedAt) < cacheTTL && len(globalCache.data) > 0 {
		data := make([]Currency, len(globalCache.data))
		copy(data, globalCache.data)
		globalCache.mu.RUnlock()
		return data, nil
	}
	globalCache.mu.RUnlock()

	// Cache süresi dolmuş — yeni veri çek.
	globalCache.mu.Lock()
	defer globalCache.mu.Unlock()

	// Double-check: başka goroutine zaten güncellemiş olabilir.
	if time.Since(globalCache.fetchedAt) < cacheTTL && len(globalCache.data) > 0 {
		data := make([]Currency, len(globalCache.data))
		copy(data, globalCache.data)
		return data, nil
	}

	fresh, err := fetchFromTCMB(ctx)
	if err != nil {
		// Cache doluysa eski veriyi dön (graceful degradation).
		if len(globalCache.data) > 0 {
			data := make([]Currency, len(globalCache.data))
			copy(data, globalCache.data)
			return data, nil
		}
		return nil, err
	}

	globalCache.data = fresh
	globalCache.fetchedAt = time.Now()
	result := make([]Currency, len(fresh))
	copy(result, fresh)
	return result, nil
}

// FetchDirect önbelleği atlayarak TCMB XML'inden anlık kurları çeker.
// RateWatcher tarafından kullanılır; cache TTL'ini beklemez.
func FetchDirect(ctx context.Context) ([]Currency, error) {
	return fetchFromTCMB(ctx)
}

// GetOne belirtilen kodu TCMB verisinde arar.
func GetOne(ctx context.Context, code string) (*Currency, error) {
	all, err := GetAll(ctx)
	if err != nil {
		return nil, err
	}
	code = strings.ToUpper(strings.TrimSpace(code))
	for _, c := range all {
		if c.Code == code {
			cp := c
			return &cp, nil
		}
	}
	return nil, fmt.Errorf("tcmb: %q kodu bulunamadı", code)
}

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

func parseDecimal(s string) float64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0
	}
	// TCMB ondalık ayıracı olarak virgül veya nokta kullanabilir.
	s = strings.ReplaceAll(s, ",", ".")
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

// parseTCMBDate TCMB Date özniteliğini ISO 8601 güne çevirir.
// TCMB bazen MM/DD/YYYY, bazen DD/MM/YYYY veya DD.MM.YYYY kullanır; olası düzenleri dener.
func parseTCMBDate(d string) string {
	d = strings.TrimSpace(d)
	for _, layout := range []string{"01/02/2006", "02/01/2006", "02.01.2006", "2006-01-02"} {
		if t, err := time.Parse(layout, d); err == nil {
			return t.UTC().Format("2006-01-02")
		}
	}
	return d
}
