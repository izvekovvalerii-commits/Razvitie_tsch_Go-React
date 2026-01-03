package listeners

import (
	"portal-razvitie/events"
	"portal-razvitie/websocket"
)

type WebSocketListener struct {
	hub *websocket.Hub
}

func NewWebSocketListener(hub *websocket.Hub) *WebSocketListener {
	return &WebSocketListener{hub: hub}
}

func (l *WebSocketListener) Register(bus events.EventBus) {
	bus.Subscribe(events.TaskCreated, l.BroadcastTask)
	bus.Subscribe(events.TaskUpdated, l.BroadcastTask)
	bus.Subscribe(events.TaskStatusChanged, l.BroadcastTask)
	bus.Subscribe(events.ProjectTasksGenerated, l.BroadcastTask) // Reuse BroadcastTask or specific one
}

func (l *WebSocketListener) BroadcastTask(event events.Event) error {
	switch e := event.(type) {
	case events.TaskCreatedEvent:
		l.hub.BroadcastUpdate("TASK_UPDATED", e.Task)
	case events.TaskUpdatedEvent:
		l.hub.BroadcastUpdate("TASK_UPDATED", e.Task)
	case events.TaskStatusChangedEvent:
		if e.Task != nil {
			l.hub.BroadcastUpdate("TASK_UPDATED", e.Task)
		}
	case events.ProjectTasksGeneratedEvent:
		for _, task := range e.Tasks {
			t := task
			l.hub.BroadcastUpdate("TASK_UPDATED", &t)
		}
	}
	return nil
}
