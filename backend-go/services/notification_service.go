package services

import (
	"log"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/websocket"
)

type NotificationService struct {
	repo repositories.NotificationRepository
	hub  *websocket.Hub
}

func NewNotificationService(repo repositories.NotificationRepository, hub *websocket.Hub) *NotificationService {
	return &NotificationService{
		repo: repo,
		hub:  hub,
	}
}

// SendNotification creates a notification and pushes it via WS
func (s *NotificationService) SendNotification(userID uint, title, message, notifType, link string) error {
	log.Printf("📧 Sending notification to user %d: title='%s' message='%s'", userID, title, message)

	notif := &models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		Link:    link,
	}

	if err := s.repo.Create(notif); err != nil {
		log.Printf("❌ Failed to create notification: %v", err)
		return err
	}

	// Push via WS
	s.hub.SendToUser(userID, "NOTIFICATION_NEW", notif)

	return nil
}

func (s *NotificationService) GetUserNotifications(userID uint, limit int) ([]models.Notification, error) {
	return s.repo.FindByUserID(userID, limit)
}

func (s *NotificationService) GetUnreadCount(userID uint) (int64, error) {
	return s.repo.GetUnreadCount(userID)
}

func (s *NotificationService) MarkAsRead(id uint) error {
	return s.repo.MarkAsRead(id)
}

func (s *NotificationService) MarkAllAsRead(userID uint) error {
	return s.repo.MarkAllAsRead(userID)
}

func (s *NotificationService) Delete(id uint) error {
	return s.repo.Delete(id)
}

func (s *NotificationService) DeleteAll(userID uint) error {
	return s.repo.DeleteAll(userID)
}
