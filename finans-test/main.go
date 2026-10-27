package main

import (
	"log"
	"os"
	"strings"

	"finans-test/internal/api"
)

func main() {
	loadDotEnvKeys(
		"GEMINI_API_KEY",
		"GEMINI_NEWS_MODEL",
		"GEMINI_NEWS_MAX_RETRIES",
		"LLM_PROVIDER",
		"OLLAMA_BASE_URL",
		"OLLAMA_MODEL",
		"RAG_CONTEXT",
		"PYTHON_SERVICE_URL",
		"SUPABASE_URL",
		"SUPABASE_SERVICE_KEY",
		"DATABASE_PASSWORD",
		"SUPABASE_DB_URL",
		"PORT",
		"PIPELINE_MAX_CONCURRENT",
		"CLEAN_MACRO_PATH",
	)

	if err := api.Run(); err != nil {
		log.Fatalf("sunucu: %v", err)
	}
}

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

	want := map[string]struct{}{}
	for _, k := range keys {
		want[k] = struct{}{}
	}

	lines := strings.Split(string(b), "\n")
	for _, line := range lines {
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
		v := strings.TrimSpace(parts[1])
		v = strings.Trim(v, `"'`)
		if v == "" {
			continue
		}
		_ = os.Setenv(k, v)
	}
}
