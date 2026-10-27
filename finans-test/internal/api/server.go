package api

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"finans-test/internal/pipeline"
)

// Run 8080'de (veya PORT env) Gin sunucusunu başlatır.
func Run() error {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}
	if _, err := strconv.Atoi(port); err != nil {
		return fmt.Errorf("api: geçersiz PORT=%q", port)
	}

	maxConcurrent := 3
	if v := strings.TrimSpace(os.Getenv("PIPELINE_MAX_CONCURRENT")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxConcurrent = n
		}
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP, param.TimeStamp.Format(time.RFC3339), param.Method,
			param.Path, param.Request.Proto, param.StatusCode, param.Latency, param.Request.UserAgent, param.ErrorMessage)
	}))

	slots := make(chan struct{}, maxConcurrent)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/generate-news", func(c *gin.Context) {
		select {
		case slots <- struct{}{}:
		default:
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ok":    false,
				"error": "çok sayıda eşzamanlı generate-news isteği; sonra tekrar deneyin",
			})
			return
		}
		defer func() { <-slots }()

		// Gin her isteği ayrı goroutine'de çalıştırır; slots ile ağır pipeline eşzamanlılığı sınırlanır.
		res, err := pipeline.GenerateNews(c.Request.Context())
		if err != nil {
			log.Printf("[generate-news] hata: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "analysis": res})
	})

	addr := ":" + port
	log.Printf("API dinleniyor: http://0.0.0.0%s (POST /generate-news, GET /health)", addr)
	return r.Run(addr)
}
