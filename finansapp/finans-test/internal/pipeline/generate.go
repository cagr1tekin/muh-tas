package pipeline

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"finans-test/internal/datasource"
	"finans-test/internal/raft"
	"finans-test/internal/store"
)

// RAGSkippedPlaceholder API pipeline'da RAG entegrasyonu olmadan Gemini haberleştirmede kullanılır.
const RAGSkippedPlaceholder = "(RAG adımı şimdilik atlandı.)"

// GenerateNews Ollama (Qwen) analizi + Gemini haberleştirme + Supabase yazımı.
// ctx şimdilik iptal sinyali için ayrılmış; alt çağrılar ctx'i kullanmıyor olabilir.
func GenerateNews(ctx context.Context) (*raft.AnalysisResult, error) {
	_ = ctx

	if strings.TrimSpace(os.Getenv("OLLAMA_MODEL")) == "" {
		return nil, errors.New("pipeline: OLLAMA_MODEL gerekli")
	}
	if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) == "" {
		return nil, errors.New("pipeline: GEMINI_API_KEY gerekli")
	}

	path := strings.TrimSpace(os.Getenv("CLEAN_MACRO_PATH"))
	records, err := datasource.LoadCleanMacroFromPath(path)
	if err != nil {
		return nil, fmt.Errorf("pipeline: clean macro: %w", err)
	}
	if len(records) == 0 {
		return nil, errors.New("pipeline: makro kaydı yok")
	}

	userOllama := raft.BuildOllamaUserPrompt(records)
	analysis, err := raft.CallOllamaWithRetry(userOllama)
	if err != nil {
		return nil, fmt.Errorf("pipeline: ollama: %w", err)
	}

	enriched, err := raft.EnrichAnalysisWithGeminiNewsWithRetry(analysis, RAGSkippedPlaceholder)
	if err != nil {
		return nil, fmt.Errorf("pipeline: gemini haber: %w", err)
	}

	if err := persistAnalysis(enriched); err != nil {
		return nil, fmt.Errorf("pipeline: supabase: %w", err)
	}

	return enriched, nil
}

func persistAnalysis(analysis *raft.AnalysisResult) error {
	supabaseURL := strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
	supabaseKey := strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_KEY"))
	if supabaseURL == "" || supabaseKey == "" {
		return errors.New("SUPABASE_URL veya SUPABASE_SERVICE_KEY eksik")
	}

	dbErr := store.WriteAnalysisDB(analysis)
	if dbErr == nil {
		return nil
	}
	restErr := store.WriteAnalysis(analysis)
	if restErr == nil {
		return nil
	}
	return fmt.Errorf("db ve REST yazılamadı: db=%v; rest=%w", dbErr, restErr)
}
