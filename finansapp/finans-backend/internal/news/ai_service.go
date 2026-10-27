package news

import (
	"context"
	"fmt"
	"time"

	"finans-backend/internal/db"
)

// AIService ai_analiz_sonucu tablosundan AI haber kayıtlarını okur.
// cursorrules §2.3: handlers → service → db (direkt DB erişimi handler'da yasak).
type AIService struct{}

// DefaultAIService paket düzeyinde singleton.
var DefaultAIService = &AIService{}

// ErrDBNotReady DATABASE_URL tanımlı değilken veya db.Init başarısızken döner.
var ErrDBNotReady = fmt.Errorf("news: veritabanı bağlantısı hazır değil (DATABASE_URL ayarlayın)")

// List en yeni limit kadar AI analiz haberini döner.
func (s *AIService) List(ctx context.Context, limit int) ([]AINews, error) {
	if !db.Ready() {
		return nil, ErrDBNotReady
	}
	if limit <= 0 {
		limit = 20
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := db.Pool().Query(ctx, `
		SELECT id, risk_bolgesi, projeksiyon_3_ay, projeksiyon_6_ay,
		       ozet, haber_basligi, haber_icerigi,
		       doviz_onerileri, portfoy_aciklamasi, doviz_aciklamalari,
		       user_id, uretim_tarihi
		FROM public.ai_analiz_sonucu
		WHERE user_id IS NULL
		ORDER BY uretim_tarihi DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("news: ai list query: %w", err)
	}
	defer rows.Close()

	var items []AINews
	for rows.Next() {
		var n AINews
		if err := rows.Scan(
			&n.ID,
			&n.RiskBolgesi,
			&n.Projeksiyon3Ay,
			&n.Projeksiyon6Ay,
			&n.Ozet,
			&n.HaberBasligi,
			&n.HaberIcerigi,
			&n.DovizOnerileri,
			&n.PortfoyAciklamasi,
			&n.DovizAciklamalari,
			&n.UserID,
			&n.UretimTarihi,
		); err != nil {
			return nil, fmt.Errorf("news: ai list scan: %w", err)
		}
		items = append(items, n)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("news: ai list rows: %w", err)
	}

	if items == nil {
		items = []AINews{}
	}
	return items, nil
}
