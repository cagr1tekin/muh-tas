package store

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"finans-test/internal/raft"

	"github.com/jackc/pgx/v5"
)

// WriteAnalysisDB, Supabase Postgres'e doğrudan INSERT yapar.
// Öncelik env:
// 1) SUPABASE_DB_URL (tam DSN)
// 2) SUPABASE_URL + DATABASE_PASSWORD (otomatik DSN üretimi)
func WriteAnalysisDB(result *raft.AnalysisResult) error {
	if result == nil {
		return fmt.Errorf("postgres writer: result is nil")
	}

	dsn, err := getPostgresDSN()
	if err != nil {
		return fmt.Errorf("postgres writer: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return fmt.Errorf("postgres writer: connect: %w", err)
	}
	defer conn.Close(context.Background())

	_, err = conn.Exec(ctx, `
		INSERT INTO ai_analiz_sonucu
		(risk_bolgesi, projeksiyon_3_ay, projeksiyon_6_ay, ozet, haber_basligi, haber_icerigi)
		VALUES ($1, $2, $3, $4, $5, $6)
	`,
		result.RiskBolgesi,
		result.Projeksiyon3Ay,
		result.Projeksiyon6Ay,
		result.Ozet,
		result.HaberBasligi,
		result.HaberIcerigi,
	)
	if err != nil {
		return fmt.Errorf("postgres writer: insert: %w", err)
	}

	return nil
}

func getPostgresDSN() (string, error) {
	if dsn := strings.TrimSpace(os.Getenv("SUPABASE_DB_URL")); dsn != "" {
		return dsn, nil
	}

	base := normalizeSupabaseBaseURL(os.Getenv("SUPABASE_URL"))
	pass := strings.TrimSpace(os.Getenv("DATABASE_PASSWORD"))
	if base == "" || pass == "" {
		return "", fmt.Errorf("SUPABASE_DB_URL veya (SUPABASE_URL + DATABASE_PASSWORD) gerekli")
	}

	u, err := url.Parse(base)
	if err != nil {
		return "", fmt.Errorf("SUPABASE_URL parse: %w", err)
	}
	host := u.Hostname() // pkl...supabase.co
	ref := strings.Split(host, ".")[0]
	if ref == "" {
		return "", fmt.Errorf("SUPABASE_URL'den project ref alınamadı")
	}

	// Supabase direct connection host pattern:
	// db.<project-ref>.supabase.co
	// Varsayılan user/db postgres, sslmode=require.
	dsn := fmt.Sprintf("postgres://postgres:%s@db.%s.supabase.co:5432/postgres?sslmode=require", url.QueryEscape(pass), ref)
	return dsn, nil
}

func normalizeSupabaseBaseURL(raw string) string {
	s := strings.TrimSpace(raw)
	s = strings.TrimRight(s, "/")
	s = strings.Replace(s, "https:://", "https://", 1)
	s = strings.Replace(s, "http:://", "http://", 1)
	return s
}

