package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// SwaggerUI GET /swagger
// Basit Swagger UI sayfası; spec'i /swagger/doc.json üzerinden yükler.
func SwaggerUI(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(`<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Doviz API Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/swagger/doc.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`))
}

// SwaggerDoc GET /swagger/doc.json
// Endpoint testleri için minimal OpenAPI 3.0 dokümanı döner.
func SwaggerDoc(c *gin.Context) {
	doc := gin.H{
		"openapi": "3.0.3",
		"info": gin.H{
			"title":       "Doviz App Backend API",
			"version":     "1.0.0",
			"description": "finans-backend servis endpoint dokümanı",
		},
		"servers": []gin.H{
			{"url": "http://localhost:8080"},
		},
		"paths": gin.H{
			"/health": gin.H{
				"get": gin.H{
					"summary": "Sunucu canlılık kontrolü",
					"responses": gin.H{
						"200": gin.H{"description": "OK"},
					},
				},
			},
			"/auth/register": gin.H{
				"post": gin.H{
					"summary": "Kullanıcı kaydı",
					"requestBody": gin.H{
						"required": true,
						"content": gin.H{
							"application/json": gin.H{
								"schema": gin.H{
									"type": "object",
									"required": []string{"email", "password"},
									"properties": gin.H{
										"email":    gin.H{"type": "string", "example": "test@example.com"},
										"password": gin.H{"type": "string", "example": "12345678"},
									},
								},
							},
						},
					},
					"responses": gin.H{
						"201": gin.H{"description": "Created"},
						"400": gin.H{"description": "Bad Request"},
					},
				},
			},
			"/auth/login": gin.H{
				"post": gin.H{
					"summary": "Kullanıcı girişi",
					"requestBody": gin.H{
						"required": true,
						"content": gin.H{
							"application/json": gin.H{
								"schema": gin.H{
									"type": "object",
									"required": []string{"email", "password"},
									"properties": gin.H{
										"email":    gin.H{"type": "string", "example": "test@example.com"},
										"password": gin.H{"type": "string", "example": "12345678"},
									},
								},
							},
						},
					},
					"responses": gin.H{
						"200": gin.H{"description": "OK"},
						"401": gin.H{"description": "Unauthorized"},
					},
				},
			},
			"/auth/refresh": gin.H{
				"post": gin.H{
					"summary": "Refresh token ile yeni access token al",
					"requestBody": gin.H{
						"required": true,
						"content": gin.H{
							"application/json": gin.H{
								"schema": gin.H{
									"type": "object",
									"required": []string{"refresh_token"},
									"properties": gin.H{
										"refresh_token": gin.H{"type": "string"},
									},
								},
							},
						},
					},
					"responses": gin.H{
						"200": gin.H{"description": "OK"},
						"401": gin.H{"description": "Unauthorized"},
					},
				},
			},
			"/api/v1/currencies": gin.H{
				"get": gin.H{
					"summary":     "Döviz listesi",
					"security":    []gin.H{{"bearerAuth": []string{}}},
					"responses":   gin.H{"200": gin.H{"description": "OK"}},
					"description": "JWT gerekli",
				},
			},
			"/api/v1/news/market": gin.H{
				"get": gin.H{
					"summary":   "Piyasa haberleri",
					"security":  []gin.H{{"bearerAuth": []string{}}},
					"responses": gin.H{"200": gin.H{"description": "OK"}},
				},
			},
			"/api/v1/news/ai": gin.H{
				"get": gin.H{
					"summary":   "AI haberler",
					"security":  []gin.H{{"bearerAuth": []string{}}},
					"responses": gin.H{"200": gin.H{"description": "OK"}},
				},
			},
			"/api/v1/portfolio": gin.H{
				"get": gin.H{
					"summary":   "Portföy listele",
					"security":  []gin.H{{"bearerAuth": []string{}}},
					"responses": gin.H{"200": gin.H{"description": "OK"}},
				},
				"post": gin.H{
					"summary":  "Portföye varlık ekle",
					"security": []gin.H{{"bearerAuth": []string{}}},
					"requestBody": gin.H{
						"required": true,
						"content": gin.H{
							"application/json": gin.H{
								"schema": gin.H{
									"type": "object",
									"required": []string{"doviz_kodu", "islem_turu", "miktar", "alis_kuru"},
									"properties": gin.H{
										"doviz_kodu": gin.H{"type": "string", "example": "USD"},
										"islem_turu": gin.H{"type": "string", "example": "ALIS"},
										"miktar":     gin.H{"type": "number", "example": 100},
										"alis_kuru":  gin.H{"type": "number", "example": 38.2},
									},
								},
							},
						},
					},
					"responses": gin.H{"200": gin.H{"description": "OK"}},
				},
			},
		},
		"components": gin.H{
			"securitySchemes": gin.H{
				"bearerAuth": gin.H{
					"type":         "http",
					"scheme":       "bearer",
					"bearerFormat": "JWT",
				},
			},
		},
	}
	c.JSON(http.StatusOK, doc)
}

