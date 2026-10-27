package currency

import (
	"context"
	"encoding/json"
	"log"
	"math"
	"os"
	"strconv"
	"strings"
	"time"
)

// RateWatcher TCMB XML'i periyodik olarak çeker; kur değişince Broadcast'i çağırır.
type RateWatcher struct {
	interval  time.Duration
	lastRates map[string]float64 // kod → alış kuru (son yayınlanan)
	broadcast func([]byte)
}

// NewRateWatcher yeni bir RateWatcher döner.
// broadcast: hub.Hub.Broadcast gibi fonksiyon bağlanır.
func NewRateWatcher(interval time.Duration, broadcast func([]byte)) *RateWatcher {
	return &RateWatcher{
		interval:  interval,
		lastRates: make(map[string]float64),
		broadcast: broadcast,
	}
}

// RatePollInterval RATE_POLL_INTERVAL_SEC env değişkenini okur; varsayılan 30 saniye.
func RatePollInterval() time.Duration {
	if s := strings.TrimSpace(os.Getenv("RATE_POLL_INTERVAL_SEC")); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n >= 5 {
			return time.Duration(n) * time.Second
		}
	}
	return 60 * time.Second
}

// Start periyodik izleme döngüsünü başlatır; ctx iptal edilene kadar çalışır.
// Goroutine olarak çağrılmalıdır: go watcher.Start(ctx)
func (w *RateWatcher) Start(ctx context.Context) {
	// İlk çalışmada hemen veri gönder.
	w.tick(ctx)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

// tick bir tur çeker ve broadcast yapar.
// kur.doviz.com'dan anlık alış/satış scrape edilir; başarısız dövizler TCMB ile doldurulur.
func (w *RateWatcher) tick(ctx context.Context) {
	// 1. kur.doviz.com → anlık alış/satış (dakikada bir scrape)
	scraped := ScrapeAllRates(ctx)

	// 2. TCMB XML → fallback + Unit bilgisi + scrape'de eksik kalanlar
	tcmbCurrencies, err := FetchDirect(ctx)
	if err != nil {
		log.Printf("[watcher] TCMB çekilemedi: %v", err)
		// Sadece scrape verisi varsa onunla devam et
		if len(scraped) == 0 {
			return
		}
	}

	// 3. TCMB listesini temel al, scrape verisini üzerine yaz
	currencies := tcmbCurrencies
	updated := 0
	for i := range currencies {
		rate, ok := scraped[currencies[i].Code]
		if !ok {
			continue
		}
		// Unit=100 olan dövizler (ör. JPY): scrape tek birim döner, TCMB 100 birim bazlıdır.
		// scrape'den gelen oran zaten 1 birim bazlı → Unit ile çarp.
		factor := float64(currencies[i].Unit)
		if factor <= 0 {
			factor = 1
		}
		currencies[i].Buy = rate.Buy * factor
		currencies[i].Sell = rate.Sell * factor
		updated++
	}

	if len(currencies) == 0 {
		return
	}

	// Live cache güncelle — REST handler buradan okur, artık TCMB değil.
	SetLiveRates(currencies)

	changed := w.hasChanged(currencies)
	w.updateLastRates(currencies)

	msg, err := marshalCurrencyMsg(currencies)
	if err != nil {
		log.Printf("[watcher] JSON marshal hatası: %v", err)
		return
	}

	w.broadcast(msg)
	log.Printf("[watcher] broadcast: %d döviz (%d doviz.com, %d TCMB), değişim=%v",
		len(currencies), updated, len(currencies)-updated, changed)
}

// hasChanged son yayınlanan kurlarla karşılaştırır; herhangi bir değişimde true döner.
func (w *RateWatcher) hasChanged(currencies []Currency) bool {
	if len(w.lastRates) == 0 {
		return true // ilk çalışma
	}
	for _, c := range currencies {
		prev, ok := w.lastRates[c.Code]
		if !ok {
			return true
		}
		if math.Abs(c.Buy-prev) > 0.0001 {
			return true
		}
	}
	return false
}

func (w *RateWatcher) updateLastRates(currencies []Currency) {
	for _, c := range currencies {
		w.lastRates[c.Code] = c.Buy
	}
}

// marshalCurrencyMsg REST endpoint formatıyla aynı JSON üretir: {"ok":true,"data":[...]}
func marshalCurrencyMsg(currencies []Currency) ([]byte, error) {
	return json.Marshal(map[string]any{
		"ok":   true,
		"data": currencies,
	})
}
