package store

import (
	"context"
	"encoding/json"
	"fmt"

	"finans-backend/internal/db"
	"finans-backend/internal/raft"
)

// WriteAnalysisDB ai_analiz_sonucu tablosuna pgxpool üzerinden INSERT yapar.
// userID boşsa global (cron) analiz olarak user_id NULL yazılır.
// cursorrules §2.3: önce bu fonksiyon denenir, başarısızsa WriteAnalysis (REST) devreye girer.
func WriteAnalysisDB(ctx context.Context, result *raft.AnalysisResult, userID string) error {
	if result == nil {
		return fmt.Errorf("postgres writer: result nil")
	}
	if !db.Ready() {
		return fmt.Errorf("postgres writer: pool hazır değil (DATABASE_URL ayarlayın)")
	}

	// nil veya boş slice → DB'ye NULL yaz (JSONB null değil)
	var dovizOnerileriJSON, dovizAciklamJSON []byte
	if len(result.DovizOnerileri) > 0 {
		var e error
		dovizOnerileriJSON, e = json.Marshal(result.DovizOnerileri)
		if e != nil {
			return fmt.Errorf("postgres writer: doviz_onerileri marshal: %w", e)
		}
	}
	if len(result.DovizAciklamalari) > 0 {
		var e error
		dovizAciklamJSON, e = json.Marshal(result.DovizAciklamalari)
		if e != nil {
			return fmt.Errorf("postgres writer: doviz_aciklamalari marshal: %w", e)
		}
	}

	var uid *string
	if userID != "" {
		uid = &userID
	}

	var portfoyAciklama *string
	if result.PortfoyAciklamasi != "" {
		portfoyAciklama = &result.PortfoyAciklamasi
	}

	_, err := db.Pool().Exec(ctx, `
		INSERT INTO public.ai_analiz_sonucu
		  (risk_bolgesi, projeksiyon_3_ay, projeksiyon_6_ay, ozet,
		   haber_basligi, haber_icerigi,
		   doviz_onerileri, portfoy_aciklamasi, doviz_aciklamalari,
		   user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`,
		result.RiskBolgesi,
		result.Projeksiyon3Ay,
		result.Projeksiyon6Ay,
		result.Ozet,
		result.HaberBasligi,
		result.HaberIcerigi,
		dovizOnerileriJSON,
		portfoyAciklama,
		dovizAciklamJSON,
		uid,
	)
	if err != nil {
		return fmt.Errorf("postgres writer: insert: %w", err)
	}
	return nil
}
