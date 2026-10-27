package handlers

import (
	"finans-backend/internal/hub"

	"github.com/gin-gonic/gin"
)

// WsCurrencies WebSocket bağlantısını hub'a aktarır.
// GET /ws/currencies
func WsCurrencies(h *hub.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.ServeWs(c)
	}
}
