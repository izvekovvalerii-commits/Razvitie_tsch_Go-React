package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all
	},
}

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type UnicastMessage struct {
	UserID uint
	Msg    Message
}

type Connection struct {
	WS     *websocket.Conn
	UserID uint
}

type Hub struct {
	// clients    map[*websocket.Conn]bool // Removed generic list
	userClients map[uint]map[*websocket.Conn]bool // UserID -> Set of conns

	broadcast chan Message
	unicast   chan UnicastMessage

	register   chan *Connection
	unregister chan *Connection
	mu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		userClients: make(map[uint]map[*websocket.Conn]bool),
		broadcast:   make(chan Message),
		unicast:     make(chan UnicastMessage),
		register:    make(chan *Connection),
		unregister:  make(chan *Connection),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.register:
			h.mu.Lock()
			if h.userClients[conn.UserID] == nil {
				h.userClients[conn.UserID] = make(map[*websocket.Conn]bool)
			}
			h.userClients[conn.UserID][conn.WS] = true
			h.mu.Unlock()
			// log.Printf("WS: User %d connected", conn.UserID)

		case conn := <-h.unregister:
			h.mu.Lock()
			if userConns, ok := h.userClients[conn.UserID]; ok {
				if _, ok := userConns[conn.WS]; ok {
					delete(userConns, conn.WS)
					conn.WS.Close()
					// If no more cons, delete user map
					if len(userConns) == 0 {
						delete(h.userClients, conn.UserID)
					}
				}
			}
			h.mu.Unlock()
			// log.Printf("WS: User %d disconnected", conn.UserID)

		case message := <-h.broadcast:
			h.mu.Lock()
			msgBytes, _ := json.Marshal(message)
			for _, userConns := range h.userClients {
				for client := range userConns {
					client.WriteMessage(websocket.TextMessage, msgBytes)
				}
			}
			h.mu.Unlock()

		case uniMsg := <-h.unicast:
			h.mu.Lock()
			if userConns, ok := h.userClients[uniMsg.UserID]; ok {
				msgBytes, _ := json.Marshal(uniMsg.Msg)
				for client := range userConns {
					client.WriteMessage(websocket.TextMessage, msgBytes)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) BroadcastUpdate(eventType string, data interface{}) {
	h.broadcast <- Message{
		Type:    eventType,
		Payload: data,
	}
}

func (h *Hub) SendToUser(userID uint, eventType string, data interface{}) {
	h.unicast <- UnicastMessage{
		UserID: userID,
		Msg: Message{
			Type:    eventType,
			Payload: data,
		},
	}
}

func (h *Hub) ServeWs(c *gin.Context, userID uint) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WS Upgrade error:", err)
		return
	}

	connection := &Connection{WS: conn, UserID: userID}
	h.register <- connection

	// Настройка таймаутов
	const (
		writeWait  = 10 * time.Second
		pongWait   = 60 * time.Second
		pingPeriod = 50 * time.Second // должно быть меньше pongWait
	)

	// Устанавливаем обработчик pong
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// Goroutine для чтения (с защитой от зависания)
	go func() {
		defer func() {
			h.unregister <- connection
		}()

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WS error: %v", err)
				}
				break
			}
		}
	}()

	// Goroutine для ping (keep-alive)
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer ticker.Stop()

		for range ticker.C {
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}()
}
