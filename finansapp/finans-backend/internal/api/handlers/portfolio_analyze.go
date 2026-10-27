package handlers

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"finans-backend/internal/middleware"
	"finans-backend/internal/pipeline"
)

// portfolioAnalyzeRateLimiter kullanıcı başına 5 dakikada 1 başarılı istek.
var (
	portfolioAnalyzeRateLimiter   = make(map[string]time.Time)
	portfolioAnalyzeRateLimiterMu sync.Mutex
	portfolioAnalyzeRateLimit     = 15 * time.Minute
)

func isPortfolioAnalyzeRateLimited(userID string) bool {
	portfolioAnalyzeRateLimiterMu.Lock()
	defer portfolioAnalyzeRateLimiterMu.Unlock()
	last, ok := portfolioAnalyzeRateLimiter[userID]
	return ok && time.Since(last) < portfolioAnalyzeRateLimit
}

func markPortfolioAnalyzeUsed(userID string) {
	portfolioAnalyzeRateLimiterMu.Lock()
	defer portfolioAnalyzeRateLimiterMu.Unlock()
	portfolioAnalyzeRateLimiter[userID] = time.Now()
}

// PortfolioAnalyze POST /api/v1/portfolio/analyze
// Kullanıcının portföyünü analiz eder; Qwen AL/TUT/SAT kararı + Gemini açıklaması döner.
// Rate limit: 5 dakikada 1 başarılı istek / kullanıcı.
// Bağımsız context kullanır — mobil istemci bağlantıyı koparsa analiz devam eder.
func PortfolioAnalyze(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "kimlik doğrulanamadı"})
		return
	}

	if isPortfolioAnalyzeRateLimited(claims.UserID) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"ok":    false,
			"error": "çok fazla istek; lütfen 5 dakika bekleyin",
		})
		return
	}

	// Request context'ten bağımsız — mobil timeout analizi iptal etmez.
	// Ollama (120sn) + Gemini (120sn) + işlem süresi için 5 dakika yeterli.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	result, err := pipeline.GeneratePortfolioAnalysis(ctx, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "portföy analizi başarısız: " + err.Error(),
		})
		return
	}

	// Sadece başarılı istekte rate limit sayacını başlat
	markPortfolioAnalyzeUsed(claims.UserID)

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": result,
	})
}
