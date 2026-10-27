package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"finans-backend/internal/currency"
)

// ListCurrencies GET /api/v1/currencies
// TCMB XML'den 60s cache ile tüm döviz listesini döner.
// cursorrules §6.1, §6.3: staleTime=60sn, response { ok, data }
func ListCurrencies(c *gin.Context) {
	list, err := currency.DefaultService.ListAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"ok":    false,
			"error": "döviz listesi alınamadı: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": list,
	})
}

// GetCurrency GET /api/v1/currencies/:code
// Tek döviz detayını döner.
func GetCurrency(c *gin.Context) {
	code := c.Param("code")

	cur, err := currency.DefaultService.GetOne(c.Request.Context(), code)
	if err != nil {
		if isNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"ok":    false,
				"error": code + " kodu bulunamadı",
			})
			return
		}
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"ok":    false,
			"error": "döviz verisi alınamadı: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": cur,
	})
}

// GetCurrencyHistory GET /api/v1/currencies/:code/history
// Tarihsel fiyat noktalarını döner.
// Query param: period=1d|1w|1m|3m|1y (varsayılan: 1m)
func GetCurrencyHistory(c *gin.Context) {
	code := c.Param("code")
	period := c.DefaultQuery("period", "1m")

	points, err := currency.DefaultService.GetHistory(c.Request.Context(), code, period)
	if err != nil {
		if isNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"ok":    false,
				"error": code + " kodu tarihsel veri için desteklenmiyor",
			})
			return
		}
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"ok":    false,
			"error": "tarihsel veri alınamadı: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": points,
		"meta": gin.H{"code": code, "period": period},
	})
}

// isNotFound hata mesajının "bulunamadı" veya "desteklenmiyor" içerip içermediğini kontrol eder.
func isNotFound(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return errors.Is(err, errNotFound) ||
		containsAny(msg, "bulunamadı", "not found", "desteklenmiyor")
}

var errNotFound = errors.New("not found")

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}
