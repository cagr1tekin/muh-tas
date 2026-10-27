package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"finans-backend/internal/db"
	"finans-backend/internal/pipeline"
)

// GenerateNews POST /internal/generate-news — AI pipeline tetikleyici.
// Günde maksimum 1 global haber üretir. Eskiler otomatik silinir (30 gün).
func GenerateNews(slots chan struct{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		select {
		case slots <- struct{}{}:
		default:
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ok":    false,
				"error": "çok sayıda eşzamanlı generate-news isteği",
			})
			return
		}
		defer func() { <-slots }()

		// Bugün zaten global haber üretildi mi?
		if db.Ready() {
			var count int
			today := time.Now().Truncate(24 * time.Hour)
			err := db.Pool().QueryRow(c.Request.Context(), `
				SELECT COUNT(*) FROM public.ai_analiz_sonucu
				WHERE user_id IS NULL AND uretim_tarihi >= $1
			`, today).Scan(&count)
			if err == nil && count > 0 {
				log.Printf("[generate-news] bugün zaten %d haber var, atlandı", count)
				c.JSON(http.StatusOK, gin.H{"ok": true, "skipped": true, "message": "bugün haber zaten üretildi"})
				return
			}

			// 30 günden eski global haberleri sil
			_, delErr := db.Pool().Exec(c.Request.Context(), `
				DELETE FROM public.ai_analiz_sonucu
				WHERE user_id IS NULL AND uretim_tarihi < NOW() - INTERVAL '30 days'
			`)
			if delErr != nil {
				log.Printf("[generate-news] eski haber temizleme hatası: %v", delErr)
			}
		}

		res, err := pipeline.GenerateNews(c.Request.Context())
		if err != nil {
			log.Printf("[generate-news] hata: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true, "data": res})
	}
}
