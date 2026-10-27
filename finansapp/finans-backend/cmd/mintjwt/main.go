// Yerel test için HS256 JWT üretir.
// Kullanım (PowerShell) — finans-backend dizininde çalıştırın (go.mod burada):
//
//	cd finans-backend
//	$env:JWT_SECRET="local-dev-secret-32chars-minimum!!"
//	go run ./cmd/mintjwt
//
// Ardından:
//
//	curl -H "Authorization: Bearer <çıktı>" http://localhost:8080/api/v1/currencies
package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func main() {
	userID := flag.String("user", "00000000-0000-0000-0000-000000000001", "user_id claim")
	email := flag.String("email", "test@example.com", "email claim")
	hours := flag.Int("hours", 24, "token geçerlilik süresi (saat)")
	flag.Parse()

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		fmt.Fprintln(os.Stderr, "JWT_SECRET env değişkeni gerekli")
		os.Exit(1)
	}

	now := time.Now()
	c := claims{
		UserID: *userID,
		Email:  *email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(*hours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Subject:   *userID,
		},
	}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	s, err := t.SignedString([]byte(secret))
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(s)
}
