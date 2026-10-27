package portfolio

import (
	"context"
	"fmt"
	"time"

	"finans-backend/internal/db"
)

// Service portföy CRUD işlemleri için servis katmanı.
// cursorrules §2.3: handlers → service → store (handlers direkt DB'ye erişemez).
type Service struct{}

// DefaultService paket düzeyinde singleton.
var DefaultService = &Service{}

// ErrDBNotReady DATABASE_URL tanımlı değilken veya db.Init başarısızken döner.
var ErrDBNotReady = fmt.Errorf("portfolio: veritabanı bağlantısı hazır değil (DATABASE_URL ayarlayın)")

// GetByUser kullanıcının tüm portföy işlemlerini en yeni önce sıralı döner.
func (s *Service) GetByUser(ctx context.Context, userID string) ([]Asset, error) {
	if !db.Ready() {
		return nil, ErrDBNotReady
	}
	rows, err := db.Pool().Query(ctx, `
		SELECT id, kullanici_id, doviz_kodu, islem_turu, miktar, alis_kuru, olusturulma
		FROM public.portfoy_islemleri
		WHERE kullanici_id = $1
		ORDER BY olusturulma DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("portfolio: getByUser query: %w", err)
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var a Asset
		if err := rows.Scan(
			&a.ID,
			&a.UserID,
			&a.DovizKodu,
			&a.IslemTuru,
			&a.Miktar,
			&a.AlisKuru,
			&a.Olusturulma,
		); err != nil {
			return nil, fmt.Errorf("portfolio: getByUser scan: %w", err)
		}
		assets = append(assets, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("portfolio: getByUser rows: %w", err)
	}

	if assets == nil {
		assets = []Asset{}
	}
	return assets, nil
}

// Add yeni portföy işlemi ekler; oluşturulan kaydın ID'sini döner.
func (s *Service) Add(ctx context.Context, userID string, req AddAssetRequest) (string, error) {
	if !db.Ready() {
		return "", ErrDBNotReady
	}
	var id string
	err := db.Pool().QueryRow(ctx, `
		INSERT INTO public.portfoy_islemleri
		  (kullanici_id, doviz_kodu, islem_turu, miktar, alis_kuru)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`,
		userID,
		req.DovizKodu,
		req.IslemTuru,
		req.Miktar,
		req.AlisKuru,
	).Scan(&id)

	if err != nil {
		return "", fmt.Errorf("portfolio: add insert: %w", err)
	}
	return id, nil
}

// Delete kullanıcıya ait portföy kaydını siler.
// Kayıt bulunamazsa veya kullanıcıya ait değilse ErrNotFound döner.
func (s *Service) Delete(ctx context.Context, id, userID string) error {
	if !db.Ready() {
		return ErrDBNotReady
	}
	tag, err := db.Pool().Exec(ctx, `
		DELETE FROM public.portfoy_islemleri
		WHERE id = $1 AND kullanici_id = $2
	`, id, userID)

	if err != nil {
		return fmt.Errorf("portfolio: delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ErrNotFound silme/güncelleme için kayıt bulunamadığında döner.
var ErrNotFound = fmt.Errorf("portfolio: kayıt bulunamadı veya yetkisiz")

// ContextWithTimeout servis çağrıları için varsayılan timeout döner.
// Gerektiğinde handler'larda özelleştirilebilir.
func ContextWithTimeout(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, 10*time.Second)
}
