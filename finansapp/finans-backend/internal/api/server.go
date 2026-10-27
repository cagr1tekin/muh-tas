package api

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"finans-backend/internal/api/handlers"
	"finans-backend/internal/db"
	"finans-backend/internal/hub"
	"finans-backend/internal/middleware"
)

// CurrencyHub tüm WebSocket döviz bağlantılarını yönetir.
// main.go'da go CurrencyHub.Run() ile başlatılır.
var CurrencyHub = hub.New()

// Run PORT env değişkeninden (varsayılan 8080) Gin sunucusunu başlatır.
// DATABASE_URL mevcutsa pgxpool başlatır; eksikse uyarı verir ama devam eder.
func Run() error {
	if dsn := strings.TrimSpace(os.Getenv("DATABASE_URL")); dsn != "" {
		if err := db.Init(context.Background()); err != nil {
			log.Fatalf("db: başlatılamadı: %v", err)
		}
		log.Printf("db: pgxpool bağlantısı kuruldu")
	} else {
		log.Printf("db: DATABASE_URL eksik — portföy ve AI haber endpoint'leri çalışmaz")
	}

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
	r.Use(corsMiddleware())
	r.Use(gin.LoggerWithFormatter(func(p gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s\" %d %s \"%s\" %s\n",
			p.ClientIP,
			p.TimeStamp.Format(time.RFC3339),
			p.Method,
			p.Path,
			p.Request.Proto,
			p.StatusCode,
			p.Latency,
			p.Request.UserAgent(),
			p.ErrorMessage,
		)
	}))

	slots := make(chan struct{}, maxConcurrent)

	// ── Public rotalar ────────────────────────────────────────────────────────────
	r.GET("/health", handlers.Health)
	r.GET("/swagger", handlers.SwaggerUI)
	r.GET("/swagger/doc.json", handlers.SwaggerDoc)

	// WebSocket: anlık kur akışı — JWT query param ile doğrulanır (?token=<JWT>)
	r.GET("/ws/currencies", handlers.WsCurrencies(CurrencyHub))

	// ── Auth rotaları (JWT gerektirmez; rate limit: 10 istek/dk/IP) ──────────────
	auth := r.Group("/auth")
	auth.Use(middleware.RateLimitAuth())
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/refresh", handlers.RefreshToken)
		// Geliştirme kolaylığı — 24 saatlik gerçek JWT mint eder, Supabase gerekmez.
		auth.POST("/demo", handlers.DemoLogin)
	}

	// ── Döviz verileri — JWT gerekmez (TCMB public verisi); sadece rate limit ────
	pub := r.Group("/api/v1")
	pub.Use(middleware.RateLimit())
	{
		pub.GET("/currencies", handlers.ListCurrencies)
		pub.GET("/currencies/:code", handlers.GetCurrency)
		pub.GET("/currencies/:code/history", handlers.GetCurrencyHistory)
	}

	// ── Korumalı API rotaları (JWT zorunlu; rate limit: 120 istek/dk/IP) ─────────
	api := r.Group("/api/v1")
	api.Use(middleware.JWTAuth(), middleware.RateLimit())
	{
		api.GET("/news/market", handlers.ListMarketNews)
		api.GET("/news/ai", handlers.ListAINews)

		api.GET("/portfolio", handlers.GetPortfolio)
		api.POST("/portfolio", handlers.AddAsset)
		api.DELETE("/portfolio/:id", handlers.DeleteAsset)
		api.POST("/portfolio/analyze", handlers.PortfolioAnalyze)
	}

	// ── Internal rotalar (scheduler tarafından çağrılır; INTERNAL_SECRET ile korunur) ─
	internal := r.Group("/internal")
	internal.Use(middleware.InternalSecret())
	{
		internal.POST("/generate-news", handlers.GenerateNews(slots))
	}

	addr := ":" + port
	log.Printf("finans-backend dinleniyor: http://0.0.0.0%s", addr)
	return r.Run(addr)
}

// corsMiddleware web tarayıcısından (Expo Web / localhost) gelen isteklere izin verir.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
