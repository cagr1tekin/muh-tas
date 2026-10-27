package hub

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	writeTimeout = 10 * time.Second
	pongWait     = 60 * time.Second
	pingPeriod   = 54 * time.Second
	maxMessageSz = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  512,
	WriteBufferSize: 4096,
	// CheckOrigin: prod'da CORS_ORIGIN env ile kısıtlanabilir; şimdilik açık.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Client tek bir WebSocket bağlantısını temsil eder.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// Hub tüm aktif istemcileri yönetir ve broadcast kanalını dinler.
type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	lastMsg    []byte // en son yayınlanan mesaj; yeni bağlanan client'a anında gönderilir
}

// New boş bir Hub döner.
func New() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 64),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
	}
}

// Run Hub'ın ana döngüsüdür; goroutine olarak başlatılmalıdır.
func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = true
			// Yeni bağlanan client'a son bilinen kurları hemen gönder.
			sent := false
			if len(h.lastMsg) > 0 {
				last := h.lastMsg
				select {
				case c.send <- last:
					sent = true
				default:
				}
			}
			total := len(h.clients)
			h.mu.Unlock()
			log.Printf("[hub] yeni bağlantı (toplam=%d, anlık veri gönderildi=%v)", total, sent)
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.mu.Lock()
			h.lastMsg = msg // son mesajı sakla
			count := 0
			for c := range h.clients {
				select {
				case c.send <- msg:
					count++
				default:
					// Yavaş istemci: kanalı dolu, bağlantıyı kapat.
					go func(cl *Client) { h.unregister <- cl }(c)
				}
			}
			h.mu.Unlock()
			log.Printf("[hub] %d istemciye yayınlandı", count)
		}
	}
}

// Broadcast kur güncellemesini tüm bağlı istemcilere gönderir.
// Goroutine-safe'dir; blocking değildir.
func (h *Hub) Broadcast(msg []byte) {
	select {
	case h.broadcast <- msg:
	default:
		log.Printf("[hub] broadcast kanalı dolu, mesaj atlandı (%d byte)", len(msg))
	}
}

// ClientCount anlık bağlı istemci sayısını döner.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// ServeWs gin handler'ı olarak çağrılır; HTTP bağlantısını WebSocket'e yükseltir.
func (h *Hub) ServeWs(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[hub] upgrade hatası: %v", err)
		return
	}
	client := &Client{hub: h, conn: conn, send: make(chan []byte, 32)}
	h.register <- client

	go client.writePump()
	go client.readPump()
}

// readPump bağlantının kapandığını algılar ve ping/pong yönetir.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSz)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

// writePump mesajları istemciye gönderir ve periyodik ping atar.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeTimeout))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeTimeout))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
