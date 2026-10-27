package currency

import "sync"

// liveCache scraper'dan gelen son birleşik kur verisini tutar.
// Hem REST handler hem WS hub aynı veriyi okur — tutarsızlık olmaz.
var liveCache = &struct {
	mu   sync.RWMutex
	data []Currency
}{}

// SetLiveRates watcher tarafından her scrape sonrası çağrılır.
func SetLiveRates(currencies []Currency) {
	liveCache.mu.Lock()
	defer liveCache.mu.Unlock()
	cp := make([]Currency, len(currencies))
	copy(cp, currencies)
	liveCache.data = cp
}

// GetLiveRates en son scrape edilen kurları döner.
// Scraper henüz çalışmadıysa nil döner → caller TCMB fallback kullanır.
func GetLiveRates() []Currency {
	liveCache.mu.RLock()
	defer liveCache.mu.RUnlock()
	if len(liveCache.data) == 0 {
		return nil
	}
	cp := make([]Currency, len(liveCache.data))
	copy(cp, liveCache.data)
	return cp
}
