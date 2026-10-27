package db

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool

// normalizeDatabaseURL değere yanlışlıkla yapıştırılan "DATABASE_URL=..." satırını düzeltir.
// Örnek hata: DATABASE_URL=DATABASE_URL=postgresql://... → postgresql://...
func normalizeDatabaseURL(raw string) string {
	s := strings.TrimSpace(raw)
	s = strings.Trim(s, `"'`)
	for {
		idx := strings.IndexByte(s, '=')
		if idx <= 0 {
			break
		}
		key := strings.ToLower(strings.TrimSpace(s[:idx]))
		if key != "database_url" {
			break
		}
		s = strings.TrimSpace(s[idx+1:])
	}
	return strings.TrimSpace(s)
}

// Init DATABASE_URL env değişkeninden pgxpool başlatır.
// server.go startup'ta çağrılır; hata durumunda log.Fatal beklenmelidir.
func Init(ctx context.Context) error {
	dsn := normalizeDatabaseURL(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		return fmt.Errorf("db: DATABASE_URL env değişkeni eksik")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("db: pool config parse: %w", err)
	}

	// SimpleProtocol: prepared statement cache'ini devre dışı bırakır.
	// Böylece "prepared statement already exists" hatası oluşmaz.
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	cfg.MaxConns = 10
	cfg.MinConns = 2

	p, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("db: pool oluşturulamadı: %w", err)
	}

	if err := p.Ping(ctx); err != nil {
		p.Close()
		return fmt.Errorf("db: ping başarısız: %w", err)
	}

	pool = p
	return nil
}

// Ready pool başarıyla başlatılmış mı kontrol eder.
func Ready() bool {
	return pool != nil
}

// Pool başlatılmış pgxpool örneğini döner.
// Init çağrılmadan önce kullanılırsa panic atar.
func Pool() *pgxpool.Pool {
	if pool == nil {
		panic("db.Pool() çağrıldı ama db.Init() henüz çalıştırılmadı")
	}
	return pool
}

// Close pool'u kapatır; uygulama kapanırken çağrılmalıdır.
func Close() {
	if pool != nil {
		pool.Close()
	}
}
