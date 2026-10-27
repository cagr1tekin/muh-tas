package portfolio

import "time"

// Asset portfoy_islemleri tablosundaki bir varlık kaydını temsil eder.
// JSON alan adları cursorrules §6 API kontratına uygun.
type Asset struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	DovizKodu   string    `json:"doviz_kodu"`
	IslemTuru   string    `json:"islem_turu"`   // ALIS | SATIS
	Miktar      float64   `json:"miktar"`
	AlisKuru    float64   `json:"alis_kuru"`
	Olusturulma time.Time `json:"olusturulma"`
}

// AddAssetRequest POST /api/v1/portfolio için gelen istek gövdesi.
type AddAssetRequest struct {
	DovizKodu string  `json:"doviz_kodu" binding:"required"`
	IslemTuru string  `json:"islem_turu" binding:"required,oneof=ALIS SATIS"`
	Miktar    float64 `json:"miktar"     binding:"required,gt=0"`
	AlisKuru  float64 `json:"alis_kuru"  binding:"required,gt=0"`
}
