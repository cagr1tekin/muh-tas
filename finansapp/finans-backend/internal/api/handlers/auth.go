package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"finans-backend/internal/middleware"
)

// ── Request / Response tipleri ───────────────────────────────────────────────

type registerRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type loginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type authResponse struct {
	OK           bool   `json:"ok"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// ── Handlers ─────────────────────────────────────────────────────────────────

// Register POST /auth/register — Supabase Auth üzerinden yeni kullanıcı kaydı.
func Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	sbUser, err := supabaseSignUp(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}
	if err := supabaseConfirmUserEmail(sbUser.ID); err != nil {
		// Email confirm adımı yardımcı bir adım; başarısız olsa da kayıt akışını bozmasın.
		log.Printf("[auth register] e-posta otomatik doğrulama başarısız user=%s err=%v", sbUser.ID, err)
	}

	accessToken, err := generateJWT(sbUser.ID, sbUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "token üretme hatası"})
		return
	}

	c.JSON(http.StatusCreated, authResponse{
		OK:           true,
		AccessToken:  accessToken,
		RefreshToken: sbUser.RefreshToken,
		ExpiresIn:    3600,
	})
}

// Login POST /auth/login — e-posta + şifre ile giriş, JWT döner.
func Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	sbUser, err := supabaseSignIn(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "e-posta veya şifre hatalı"})
		return
	}

	accessToken, err := generateJWT(sbUser.ID, sbUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "token üretme hatası"})
		return
	}

	c.JSON(http.StatusOK, authResponse{
		OK:           true,
		AccessToken:  accessToken,
		RefreshToken: sbUser.RefreshToken,
		ExpiresIn:    3600,
	})
}

// RefreshToken POST /auth/refresh — Supabase refresh token ile yeni access token.
func RefreshToken(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	sbUser, err := supabaseRefresh(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "refresh token geçersiz veya süresi dolmuş"})
		return
	}

	accessToken, err := generateJWT(sbUser.ID, sbUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "token üretme hatası"})
		return
	}

	c.JSON(http.StatusOK, authResponse{
		OK:           true,
		AccessToken:  accessToken,
		RefreshToken: sbUser.RefreshToken,
		ExpiresIn:    3600,
	})
}

// DemoLogin POST /auth/demo — geliştirme ortamı için gerçek JWT mint eder.
// Sabit demo kullanıcı kimliği ile 24 saatlik token döner; production'da devre dışı bırakılmalı.
func DemoLogin(c *gin.Context) {
	const demoUserID = "demo-user-00000000-0000-0000-0000-000000000001"
	const demoEmail = "demo@finansapp.dev"

	accessToken, err := generateDemoJWT(demoUserID, demoEmail, 24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "demo token üretme hatası"})
		return
	}

	c.JSON(http.StatusOK, authResponse{
		OK:           true,
		AccessToken:  accessToken,
		RefreshToken: "", // demo modda refresh yok
		ExpiresIn:    86400,
	})
}

// ── JWT yardımcı ─────────────────────────────────────────────────────────────

func generateJWT(userID, email string) (string, error) {
	return generateDemoJWT(userID, email, time.Hour)
}

func generateDemoJWT(userID, email string, ttl time.Duration) (string, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		return "", errors.New("JWT_SECRET eksik")
	}

	claims := middleware.Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ── Supabase Auth istemcisi ──────────────────────────────────────────────────

type supabaseUser struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func supabaseAuthURL() string {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/")
	return base + "/auth/v1"
}

func supabaseServiceKey() string {
	return strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_KEY"))
}

func supabasePost(endpoint string, payload map[string]string) (*supabaseUser, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("auth: marshal: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, supabaseAuthURL()+endpoint, bytes.NewReader(b))
	if err != nil {
		return nil, fmt.Errorf("auth: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", supabaseServiceKey())
	req.Header.Set("Authorization", "Bearer "+supabaseServiceKey())

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("auth: istek: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("auth: yanıt okuma: %w", err)
	}

	if resp.StatusCode >= 400 {
		var errResp struct {
			Msg string `json:"msg"`
			Err string `json:"error_description"`
		}
		_ = json.Unmarshal(body, &errResp)
		msg := errResp.Err
		if msg == "" {
			msg = errResp.Msg
		}
		if msg == "" {
			msg = fmt.Sprintf("supabase auth hatası (status=%d)", resp.StatusCode)
		}
		return nil, errors.New(msg)
	}

	// Supabase iki farklı format döndürür:
	// Format A — email onayı KAPALI (veya signin): { user: { id, email }, access_token, refresh_token }
	// Format B — email onayı AÇIK signup:          { id, email, ... }  (access_token yok)
	var parsed struct {
		User struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		// Format B: üst seviye alanlar
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("auth: parse yanıt: %w", err)
	}

	// Her iki formattan ID ve Email çek
	userID := parsed.User.ID
	if userID == "" {
		userID = parsed.ID
	}
	userEmail := parsed.User.Email
	if userEmail == "" {
		userEmail = parsed.Email
	}

	return &supabaseUser{
		ID:           userID,
		Email:        userEmail,
		AccessToken:  parsed.AccessToken,
		RefreshToken: parsed.RefreshToken,
	}, nil
}

func supabaseSignUp(email, password string) (*supabaseUser, error) {
	return supabasePost("/signup", map[string]string{
		"email":    email,
		"password": password,
	})
}

func supabaseSignIn(email, password string) (*supabaseUser, error) {
	return supabasePost("/token?grant_type=password", map[string]string{
		"email":    email,
		"password": password,
	})
}

func supabaseRefresh(refreshToken string) (*supabaseUser, error) {
	return supabasePost("/token?grant_type=refresh_token", map[string]string{
		"refresh_token": refreshToken,
	})
}

// supabaseConfirmUserEmail signup sonrası kullanıcıyı admin endpoint'i ile doğrulanmış işaretler.
// Bu sayede mobil akışta e-posta onay maili beklenmeden login yapılabilir.
func supabaseConfirmUserEmail(userID string) error {
	if strings.TrimSpace(userID) == "" {
		return errors.New("boş kullanıcı id")
	}

	key := supabaseServiceKey()
	if key == "" {
		return errors.New("SUPABASE_SERVICE_KEY eksik")
	}

	body, err := json.Marshal(map[string]bool{
		"email_confirm": true,
	})
	if err != nil {
		return fmt.Errorf("confirm: marshal: %w", err)
	}

	req, err := http.NewRequest(
		http.MethodPut,
		supabaseAuthURL()+"/admin/users/"+userID,
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("confirm: new request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", key)
	req.Header.Set("Authorization", "Bearer "+key)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("confirm: istek: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("confirm: supabase admin hata (status=%d): %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}

	return nil
}
