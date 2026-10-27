package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"finans-backend/internal/middleware"
	"finans-backend/internal/portfolio"
)

// GetPortfolio GET /api/v1/portfolio
// Kimliği doğrulanmış kullanıcının tüm portföy işlemlerini döner.
func GetPortfolio(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "kimlik doğrulanamadı"})
		return
	}

	ctx, cancel := portfolio.ContextWithTimeout(c.Request.Context())
	defer cancel()

	assets, err := portfolio.DefaultService.GetByUser(ctx, claims.UserID)
	if err != nil {
		if errors.Is(err, portfolio.ErrDBNotReady) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ok":    false,
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "portföy alınamadı: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": assets,
	})
}

// AddAsset POST /api/v1/portfolio
// Kullanıcının portföyüne yeni bir döviz varlığı ekler.
func AddAsset(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "kimlik doğrulanamadı"})
		return
	}

	var req portfolio.AddAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	ctx, cancel := portfolio.ContextWithTimeout(c.Request.Context())
	defer cancel()

	id, err := portfolio.DefaultService.Add(ctx, claims.UserID, req)
	if err != nil {
		if errors.Is(err, portfolio.ErrDBNotReady) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ok":    false,
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "varlık eklenemedi: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"ok":   true,
		"data": gin.H{"id": id},
	})
}

// DeleteAsset DELETE /api/v1/portfolio/:id
// Kullanıcının belirtilen portföy kaydını siler.
func DeleteAsset(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"ok": false, "error": "kimlik doğrulanamadı"})
		return
	}

	id := c.Param("id")

	ctx, cancel := portfolio.ContextWithTimeout(c.Request.Context())
	defer cancel()

	err := portfolio.DefaultService.Delete(ctx, id, claims.UserID)
	if err != nil {
		if errors.Is(err, portfolio.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"ok":    false,
				"error": "kayıt bulunamadı veya erişim yetkisi yok",
			})
			return
		}
		if errors.Is(err, portfolio.ErrDBNotReady) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"ok":    false,
				"error": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "varlık silinemedi: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"data": gin.H{"id": id},
	})
}
