package currency

import (
	"context"
	"fmt"
)

// Service döviz verisi için tek giriş noktası.
// Handler'lar doğrudan bu servis üzerinden çalışır.
type Service struct{}

// DefaultService paket düzeyinde singleton — handler'lar bu örneği kullanır.
var DefaultService = &Service{}

// ListAll önce live cache'i (scraper verisi) okur; dolmamışsa TCMB XML'e düşer.
// Bu sayede REST ve WS her zaman aynı kaynaktan beslenir.
func (s *Service) ListAll(ctx context.Context) ([]Currency, error) {
	if live := GetLiveRates(); len(live) > 0 {
		return live, nil
	}
	list, err := GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("currency service: list: %w", err)
	}
	return list, nil
}

// GetOne önce live cache'i arar; bulamazsa TCMB XML'e düşer.
func (s *Service) GetOne(ctx context.Context, code string) (*Currency, error) {
	if live := GetLiveRates(); len(live) > 0 {
		for _, c := range live {
			if c.Code == code {
				cp := c
				return &cp, nil
			}
		}
		return nil, fmt.Errorf("%s kodu bulunamadı", code)
	}
	c, err := GetOne(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("currency service: get %s: %w", code, err)
	}
	return c, nil
}

// GetHistory Python EVDS servisi üzerinden tarihsel fiyat noktalarını döner.
// period: 1d | 1w | 1m | 3m | 1y
func (s *Service) GetHistory(ctx context.Context, code, periodStr string) ([]PricePoint, error) {
	p := ValidPeriod(periodStr)
	points, err := FetchHistory(ctx, code, p)
	if err != nil {
		return nil, fmt.Errorf("currency service: history %s/%s: %w", code, p, err)
	}
	return points, nil
}
