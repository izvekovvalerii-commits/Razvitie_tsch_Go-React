package events

import (
	"log"
	"sync"
)

// Event is the interface that all events must satisfy
type Event interface {
	Name() string
}

// EventHandler is a function that handles an event
type EventHandler func(event Event) error

// EventBus interface
type EventBus interface {
	Subscribe(eventName string, handler EventHandler)
	Publish(event Event)
}

// InMemoryEventBus implementation
type InMemoryEventBus struct {
	handlers map[string][]EventHandler
	mu       sync.RWMutex
}

// NewEventBus creates a new instance
func NewEventBus() *InMemoryEventBus {
	return &InMemoryEventBus{
		handlers: make(map[string][]EventHandler),
	}
}

// Subscribe adds a handler for a specific event
func (b *InMemoryEventBus) Subscribe(eventName string, handler EventHandler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[eventName] = append(b.handlers[eventName], handler)
}

// Publish emits an event to all subscribers
func (b *InMemoryEventBus) Publish(event Event) {
	b.mu.RLock()
	handlers := b.handlers[event.Name()]
	b.mu.RUnlock()

	for _, handler := range handlers {
		// Run handlers asynchronously to avoid blocking the caller
		go func(h EventHandler, e Event) {
			if err := h(e); err != nil {
				log.Printf("Error handling event %s: %v", e.Name(), err)
			}
		}(handler, event)
	}
}
