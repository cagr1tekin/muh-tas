package main

import (
	"context"
	"log"
	"os"
	"strings"

	"finans-backend/internal/api"
	"finans-backend/internal/currency"
	"finans-backend/internal/scheduler"
)

func main() {
	loadDotEnvKeys(
		"GEMINI_API_KEY",
		"GEMINI_NEWS_MODEL",
		"GEMINI_NEWS_MAX_RETRIES",
		"OLLAMA_HOST",
		"OLLAMA_MODEL",
		"RAG_CONTEXT",
		"PYTHON_SERVICE_URL",
		"SUPABASE_URL",
		"SUPABASE_SERVICE_KEY",
		"DATABASE_URL",
		"JWT_SECRET",
		"PORT",
		"PIPELINE_MAX_CONCURRENT",
		"CRON_INTERVAL_HOURS",
		"CLEAN_MACRO_PATH",
		"NEWSAPI_KEY",
		"INTERNAL_SECRET",
		"RATE_POLL_INTERVAL_SEC",
	)

	ctx := context.Background()

	// WebSocket hub: tüm bağlı istemcilere broadcast yapar.
	go api.CurrencyHub.Run()

	// RateWatcher: TCMB'yi periyodik izler, kur değişince WS push yapar.
	go currency.NewRateWatcher(
		currency.RatePollInterval(),
		api.CurrencyHub.Broadcast,
	).Start(ctx)

	go scheduler.Start()

	if err := api.Run(); err != nil {
		log.Fatalf("sunucu: %v", err)
	}
}

// loadDotEnvKeys belirtilen anahtarları .env dosyasından okuyarak process ortam değişkenlerine yükler.
// Mevcut env değerlerini override etmez.
func loadDotEnvKeys(keys ...string) {
	if len(keys) == 0 {
		return
	}
	if _, err := os.Stat(".env"); err != nil {
		return
	}
	b, err := os.ReadFile(".env")
	if err != nil {
		return
	}

	want := make(map[string]struct{}, len(keys))
	for _, k := range keys {
		want[k] = struct{}{}
	}

	for _, line := range strings.Split(string(b), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		k := strings.TrimSpace(parts[0])
		if _, ok := want[k]; !ok {
			continue
		}
		if os.Getenv(k) != "" {
			continue
		}
		v := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		if v == "" {
			continue
		}
		_ = os.Setenv(k, v)
	}
}
