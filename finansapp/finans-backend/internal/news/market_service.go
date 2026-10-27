package news

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	newsAPIEverything   = "https://newsapi.org/v2/everything"
	newsAPITopHeadlines = "https://newsapi.org/v2/top-headlines"
	cacheTTL            = 5 * time.Minute
	marketPageSize      = 20
)

// ErrNoAPIKey NEWSAPI_KEY env değişkeni tanımlı değilse döner.
var ErrNoAPIKey = fmt.Errorf("news: NEWSAPI_KEY tanımlı değil — piyasa haberleri devre dışı")

// MarketService NewsAPI.org'dan piyasa haberleri çeker; 5 dakikalık in-memory cache tutar.
type MarketService struct {
	mu          sync.RWMutex
	cachedItems []MarketNewsItem
	cachedAt    time.Time
}

// DefaultMarketService paket düzeyinde singleton.
var DefaultMarketService = &MarketService{}

// newsAPIResponse NewsAPI.org yanıt zarfı.
type newsAPIResponse struct {
	Status   string `json:"status"`
	Message  string `json:"message"` // hata durumunda dolu gelir
	Articles []struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		URL         string `json:"url"`
		Source      struct {
			Name string `json:"name"`
		} `json:"source"`
		PublishedAt string `json:"publishedAt"`
	} `json:"articles"`
}

// Fetch piyasa haberlerini döner. Cache geçerliyse ağa gitmez.
func (s *MarketService) Fetch(ctx context.Context) ([]MarketNewsItem, error) {
	apiKey := strings.TrimSpace(os.Getenv("NEWSAPI_KEY"))
	if apiKey == "" {
		return nil, ErrNoAPIKey
	}

	s.mu.RLock()
	if time.Since(s.cachedAt) < cacheTTL && len(s.cachedItems) > 0 {
		items := s.cachedItems
		s.mu.RUnlock()
		return items, nil
	}
	s.mu.RUnlock()

	items, err := s.fetchFromAPI(ctx, apiKey)
	if err != nil {
		// Eski cache varsa stale olarak dön — API geçici hatayı gizle.
		s.mu.RLock()
		stale := s.cachedItems
		s.mu.RUnlock()
		if stale != nil {
			return stale, nil
		}
		return nil, err
	}

	// Boş listeyi cache'leme — ilk istek 0 sonuç dönünce 5 dk boyunca API'ye gitilmezdi.
	s.mu.Lock()
	if len(items) > 0 {
		s.cachedItems = items
		s.cachedAt = time.Now()
	}
	s.mu.Unlock()

	return items, nil
}

func (s *MarketService) fetchFromAPI(ctx context.Context, apiKey string) ([]MarketNewsItem, error) {
	// NewsAPI boşluklu q'da AND benzeri davranır; çok az sonuç döner. OR ile genişlet.
	queries := []string{
		"doviz OR dolar OR kur OR TCMB OR ekonomi OR borsa OR Merkez Bankasi",
		"doviz OR dolar OR TL",
	}
	for _, qq := range queries {
		items, err := s.fetchEverything(ctx, apiKey, qq)
		if err != nil {
			return nil, err
		}
		if len(items) > 0 {
			return items, nil
		}
	}
	// everything boş döndüyse (indeks / dil kısıtı): TR iş manşetleri
	return s.fetchTopHeadlinesTR(ctx, apiKey)
}

func (s *MarketService) fetchEverything(ctx context.Context, apiKey, searchQuery string) ([]MarketNewsItem, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, newsAPIEverything, nil)
	if err != nil {
		return nil, fmt.Errorf("news: market request oluşturulamadı: %w", err)
	}
	q := req.URL.Query()
	q.Set("q", searchQuery)
	q.Set("language", "tr")
	q.Set("sortBy", "publishedAt")
	q.Set("pageSize", fmt.Sprintf("%d", marketPageSize))
	q.Set("apiKey", apiKey)
	req.URL.RawQuery = q.Encode()
	return s.doNewsRequest(ctx, req)
}

func (s *MarketService) fetchTopHeadlinesTR(ctx context.Context, apiKey string) ([]MarketNewsItem, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, newsAPITopHeadlines, nil)
	if err != nil {
		return nil, fmt.Errorf("news: top-headlines request: %w", err)
	}
	q := req.URL.Query()
	q.Set("country", "tr")
	q.Set("category", "business")
	q.Set("pageSize", fmt.Sprintf("%d", marketPageSize))
	q.Set("apiKey", apiKey)
	req.URL.RawQuery = q.Encode()
	return s.doNewsRequest(ctx, req)
}

func (s *MarketService) doNewsRequest(ctx context.Context, req *http.Request) ([]MarketNewsItem, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req.WithContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("news: market API isteği başarısız: %w", err)
	}
	defer resp.Body.Close()

	var result newsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("news: market API yanıtı çözümlenemedi: %w", err)
	}

	if result.Status != "ok" {
		return nil, fmt.Errorf("news: market API hatası: %s", result.Message)
	}

	items := make([]MarketNewsItem, 0, len(result.Articles))
	for _, a := range result.Articles {
		if a.Title == "" || a.URL == "" {
			continue
		}
		pub, _ := time.Parse(time.RFC3339, a.PublishedAt)
		items = append(items, MarketNewsItem{
			Title:       a.Title,
			Description: a.Description,
			URL:         a.URL,
			Source:      a.Source.Name,
			PublishedAt: pub,
		})
	}
	return items, nil
}
