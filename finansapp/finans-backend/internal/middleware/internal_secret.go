package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const internalSecretHeader = "X-Internal-Secret"

// InternalSecret INTERNAL_SECRET env değişkeni tanımlıysa
// X-Internal-Secret header'ını doğrular; yoksa pass-through (geriye dönük uyumlu).
func InternalSecret() gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := strings.TrimSpace(os.Getenv("INTERNAL_SECRET"))
		if secret == "" {
			c.Next()
			return
		}
		if c.GetHeader(internalSecretHeader) != secret {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"ok":    false,
				"error": "internal endpoint: geçersiz veya eksik " + internalSecretHeader + " header",
			})
			return
		}
		c.Next()
	}
}
