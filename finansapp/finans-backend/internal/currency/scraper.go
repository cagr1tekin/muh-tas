package currency

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	dovizBase      = "https://kur.doviz.com/serbest-piyasa/"
	scraperTimeout = 15 * time.Second
	scraperWorkers = 6
)

// dovizSlugs kur.doviz.com URL slug eşlemeleri — 22 döviz.
var dovizSlugs = map[string]string{
	"USD": "amerikan-dolari",
	"EUR": "euro",
	"GBP": "sterlin",
	"JPY": "japon-yeni",
	"CHF": "isvicre-frangi",
	"AUD": "avustralya-dolari",
	"CAD": "kanada-dolari",
	"SAR": "suudi-arabistan-riyali",
	"AED": "birlesik-arap-emirlikleri-dirhemi",
	"KWD": "kuveyt-dinari",
	"SEK": "isvec-kronu",
	"NOK": "norvec-kronu",
	"DKK": "danimarka-kronu",
	"RUB": "rus-rublesi",
	"CNY": "cin-yuani",
	"HUF": "macar-forinti",
	"CZK": "cek-korunasi",
	"RON": "romen-leyi",
	"BGN": "bulgar-levasi",
	"PKR": "pakistan-rupisi",
	"QAR": "katar-riyali",
	"IRR": "iran-riyali",
}

type scrapedRate struct {
	Buy  float64
	Sell float64
}

// ScrapeAllRates kur.doviz.com'dan tüm dövizler için alış/satış kurlarını çeker.
// Eşzamanlı çalışır (max 6 goroutine); başarısız dövizler sonuçta yer almaz.
func ScrapeAllRates(ctx context.Context) map[string]scrapedRate {
	type result struct {
		code string
		rate scrapedRate
		err  error
	}

	sem := make(chan struct{}, scraperWorkers)
	ch := make(chan result, len(dovizSlugs))

	for code, slug := range dovizSlugs {
		sem <- struct{}{}
		go func(c, s string) {
			defer func() { <-sem }()
			buy, sell, err := scrapePage(ctx, s)
			ch <- result{code: c, rate: scrapedRate{Buy: buy, Sell: sell}, err: err}
		}(code, slug)
	}

	rates := make(map[string]scrapedRate, len(dovizSlugs))
	for range dovizSlugs {
		r := <-ch
		if r.err != nil {
			log.Printf("[scraper] %s: %v", r.code, r.err)
			continue
		}
		if r.rate.Buy > 0 {
			rates[r.code] = r.rate
		}
	}

	log.Printf("[scraper] %d/%d döviz başarıyla çekildi", len(rates), len(dovizSlugs))
	return rates
}

// ── HTML ayrıştırma ─────────────────────────────────────────────────────────
//
// kur.doviz.com klasik server-side HTML kullanır.
// Serbest piyasa alış/satış değerleri şu yapıda gelir:
//   <span data-socket-key="USD" data-socket-attr="bid">45,6858</span>
//   <span data-socket-key="USD" data-socket-attr="ask">45,7284</span>
//
// "20-USD", "24-USD" gibi banka satırları da aynı attribute'u taşır;
// regex yalnızca saf büyük harf kodlarını (harf+harf) eşleştirir.

var (
	// data-socket-key="USD" data-socket-attr="bid">\n   45,6858\n<
	reBid = regexp.MustCompile(`data-socket-key="([A-Z]{2,4})"\s+data-socket-attr="bid"[^>]*>\s*([\d,]+)\s*<`)
	reAsk = regexp.MustCompile(`data-socket-key="([A-Z]{2,4})"\s+data-socket-attr="ask"[^>]*>\s*([\d,]+)\s*<`)
)

func scrapePage(ctx context.Context, slug string) (buy, sell float64, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, dovizBase+slug, nil)
	if err != nil {
		return 0, 0, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "tr-TR,tr;q=0.9")

	client := &http.Client{Timeout: scraperTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, 0, err
	}

	return extractSocketRates(body)
}

// extractSocketRates data-socket-attr="bid"/"ask" elementlerinden alış/satış çeker.
func extractSocketRates(body []byte) (buy, sell float64, err error) {
	if m := reBid.FindSubmatch(body); len(m) == 3 {
		buy = parseTurkish(string(m[2]))
	}
	if m := reAsk.FindSubmatch(body); len(m) == 3 {
		sell = parseTurkish(string(m[2]))
	}

	if buy <= 0 {
		return 0, 0, fmt.Errorf("bid değeri bulunamadı")
	}
	if sell <= 0 {
		sell = buy
	}
	return buy, sell, nil
}

// parseTurkish "45,6858" gibi Türkçe ondalık formatını float64'e çevirir.
func parseTurkish(s string) float64 {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", ".")
	v, _ := strconv.ParseFloat(s, 64)
	return v
}
