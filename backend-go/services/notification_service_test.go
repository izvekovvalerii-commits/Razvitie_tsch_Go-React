package services_test

import (
	"portal-razvitie/repositories"
	"portal-razvitie/services"
	"portal-razvitie/websocket"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNotificationService_SendAndRead(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewNotificationRepository(db)
	hub := websocket.NewHub()
	go hub.Run()

	service := services.NewNotificationService(repo, hub)

	// Send
	err := service.SendNotification(1, "Test", "Msg", "INFO", "", nil, nil)
	assert.NoError(t, err)

	// Check count
	count, _ := service.GetUnreadCount(1)
	assert.Equal(t, int64(1), count)

	// Get list
	list, _ := service.GetUserNotifications(1, 10)
	assert.Len(t, list, 1)
	assert.Equal(t, "Test", list[0].Title)

	// Mark read
	err = service.MarkAsRead(list[0].ID)
	assert.NoError(t, err)

	count, _ = service.GetUnreadCount(1)
	assert.Equal(t, int64(0), count)
}
