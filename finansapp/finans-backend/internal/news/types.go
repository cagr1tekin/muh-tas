package news

import (
	"encoding/json"
	"time"
)

// AINews ai_analiz_sonucu tablosundaki bir analiz kaydını temsil eder.
type AINews struct {
	ID                string          `json:"id"`
	RiskBolgesi       string          `json:"risk_bolgesi"`
	Projeksiyon3Ay    float64         `json:"projeksiyon_3_ay"`
	Projeksiyon6Ay    float64         `json:"projeksiyon_6_ay"`
	Ozet              string          `json:"ozet"`
	HaberBasligi      string          `json:"haber_basligi"`
	HaberIcerigi      string          `json:"haber_icerigi"`
	DovizOnerileri    *json.RawMessage `json:"doviz_onerileri,omitempty"`
	PortfoyAciklamasi *string          `json:"portfoy_aciklamasi,omitempty"`
	DovizAciklamalari *json.RawMessage `json:"doviz_aciklamalari,omitempty"`
	UserID            *string          `json:"user_id,omitempty"`
	UretimTarihi      time.Time       `json:"uretim_tarihi"`
}

// MarketNewsItem harici haber kaynağından gelen tek bir haber öğesini temsil eder.
type MarketNewsItem struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	URL         string    `json:"url"`
	Source      string    `json:"source"`
	PublishedAt time.Time `json:"published_at"`
}
