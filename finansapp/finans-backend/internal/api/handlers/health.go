package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Health GET /health — sunucu canlılık kontrolü.
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"ok":     true,
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}
