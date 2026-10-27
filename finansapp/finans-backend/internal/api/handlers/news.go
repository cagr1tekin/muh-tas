package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"finans-backend/internal/news"
)

// ListAINews GET /api/v1/news/ai
// ai_analiz_sonucu tablosundan son 20 AI haber kaydını döner.
func ListAINews(c *gin.Context) {
	items, err := news.DefaultAIService.List(c.Request.Context(), 20)
	if err != nil {
		if errors.Is(err, news.ErrDBNotReady) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ok":    false,
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "AI haberler alınamadı: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": items,
	})
}

// ListMarketNews GET /api/v1/news/market
// NewsAPI.org'dan Türkçe döviz/piyasa haberlerini döner (5dk cache).
func ListMarketNews(c *gin.Context) {
	items, err := news.DefaultMarketService.Fetch(c.Request.Context())
	if err != nil {
		if errors.Is(err, news.ErrNoAPIKey) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ok":    false,
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "piyasa haberleri alınamadı: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": items,
	})
}
