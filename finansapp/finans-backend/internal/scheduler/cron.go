package scheduler

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// Start cron zamanlayıcısını başlatır.
// cursorrules §2.3: scheduler/cron.go'da tanımlanır; main.go'da yalnızca goroutine başlatılır.
// Sunucu ayağa kalkar kalkmaz bir kez tetikler, ardından periyodik olarak devam eder.
func Start() {
	intervalHours := 6
	if v := strings.TrimSpace(os.Getenv("CRON_INTERVAL_HOURS")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			intervalHours = n
		}
	}

	log.Printf("[scheduler] başlatıldı — her %d saatte bir /internal/generate-news tetiklenecek", intervalHours)

	// Sunucu tamamen ayağa kalkana kadar kısa bir bekleme, ardından ilk tetikleme.
	time.Sleep(5 * time.Second)
	log.Printf("[scheduler] ilk tetikleme başlıyor...")
	triggerGenerateNews()

	ticker := time.NewTicker(time.Duration(intervalHours) * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		triggerGenerateNews()
	}
}

// triggerGenerateNews localhost üzerinden /internal/generate-news endpoint'ini çağırır.
// INTERNAL_SECRET tanımlıysa X-Internal-Secret header'ı ile gönderir.
// cursorrules §2.3: /generate-news sadece scheduler tarafından çağrılır — public değil.
func triggerGenerateNews() {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	url := fmt.Sprintf("http://localhost:%s/internal/generate-news", port)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader([]byte("{}")))
	if err != nil {
		log.Printf("[scheduler] istek oluşturulamadı: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	if secret := strings.TrimSpace(os.Getenv("INTERNAL_SECRET")); secret != "" {
		req.Header.Set("X-Internal-Secret", secret)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[scheduler] /internal/generate-news çağrısı başarısız: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		log.Printf("[scheduler] /internal/generate-news başarılı (status=%d)", resp.StatusCode)
	} else {
		log.Printf("[scheduler] /internal/generate-news hata (status=%d)", resp.StatusCode)
	}
}
