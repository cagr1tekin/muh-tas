package currency

// Currency TCMB XML'den parse edilen anlık döviz kaydı.
// cursorrules §6 API kontratına uygun JSON alan adları.
type Currency struct {
	Code    string  `json:"code"`
	Name    string  `json:"name"`    // Türkçe isim (TCMB Isim)
	NameEN  string  `json:"name_en"` // İngilizce isim (TCMB CurrencyName)
	Unit    int     `json:"unit"`    // 1, 100 vb.
	Buy     float64 `json:"buy"`     // ForexBuying
	Sell    float64 `json:"sell"`    // ForexSelling
	Date    string  `json:"date"`    // ISO 8601 (TCMB tarih)
}

// PricePoint tarihsel fiyat noktası — history endpoint için.
// cursorrules §6: frontend PricePointSchema "rate" alanı bekler.
type PricePoint struct {
	Date string  `json:"date"`
	Rate float64 `json:"rate"`
}

// Period history endpoint'in kabul ettiği dönem değerleri.
type Period string

const (
	Period1D  Period = "1d"
	Period1W  Period = "1w"
	Period1M  Period = "1m"
	Period3M  Period = "3m"
	Period1Y  Period = "1y"
)

// ValidPeriod period string'ini doğrular; geçersizse Period1M döner.
func ValidPeriod(p string) Period {
	switch Period(p) {
	case Period1D, Period1W, Period1M, Period3M, Period1Y:
		return Period(p)
	default:
		return Period1M
	}
}
