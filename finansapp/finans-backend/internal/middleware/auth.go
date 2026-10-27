package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const ClaimsKey = "claims"

// Claims JWT payload.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// JWTAuth, Authorization: Bearer <token> başlığını doğrular.
// Geçerli token'da bulunan Claims'i context'e "claims" anahtarıyla yazar.
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
		if secret == "" {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"ok":    false,
				"error": "sunucu yapılandırma hatası: JWT_SECRET eksik",
			})
			return
		}

		raw := c.GetHeader("Authorization")
		if raw == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"ok":    false,
				"error": "Authorization başlığı eksik",
			})
			return
		}

		const prefix = "Bearer "
		if !strings.HasPrefix(raw, prefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"ok":    false,
				"error": "Authorization formatı geçersiz (Bearer <token> bekleniyor)",
			})
			return
		}

		tokenStr := strings.TrimPrefix(raw, prefix)
		claims, err := parseToken(tokenStr, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"ok":    false,
				"error": "token geçersiz veya süresi dolmuş",
			})
			return
		}

		c.Set(ClaimsKey, claims)
		c.Next()
	}
}

// GetClaims, handler içinden doğrulanmış Claims'i getirir.
func GetClaims(c *gin.Context) (*Claims, bool) {
	v, exists := c.Get(ClaimsKey)
	if !exists {
		return nil, false
	}
	claims, ok := v.(*Claims)
	return claims, ok
}

func parseToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("beklenmeyen imzalama yöntemi")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("token claims geçersiz")
	}
	return claims, nil
}
