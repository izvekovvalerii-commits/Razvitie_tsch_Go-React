package repositories

import (
	"portal-razvitie/models"
	"time"

	"gorm.io/gorm"
)

type NotificationRepository interface {
	Create(notification *models.Notification) error
	FindByUserID(userID uint, limit int) ([]models.Notification, error)
	MarkAsRead(id uint) error
	MarkAllAsRead(userID uint) error
	GetUnreadCount(userID uint) (int64, error)
	Delete(id uint) error
	DeleteAll(userID uint) error
}

type notificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) Create(notification *models.Notification) error {
	return r.db.Create(notification).Error
}

func (r *notificationRepository) FindByUserID(userID uint, limit int) ([]models.Notification, error) {
	var notifications []models.Notification
	err := r.db.Where("\"UserID\" = ?", userID).
		Order("\"CreatedAt\" DESC").
		Limit(limit).
		Find(&notifications).Error
	return notifications, err
}

func (r *notificationRepository) MarkAsRead(id uint) error {
	now := time.Now().UTC()
	return r.db.Model(&models.Notification{}).
		Where("\"ID\" = ?", id).
		Updates(map[string]interface{}{
			"IsRead": true,
			"ReadAt": now,
		}).Error
}

func (r *notificationRepository) MarkAllAsRead(userID uint) error {
	now := time.Now().UTC()
	return r.db.Model(&models.Notification{}).
		Where("\"UserID\" = ? AND \"IsRead\" = ?", userID, false).
		Updates(map[string]interface{}{
			"IsRead": true,
			"ReadAt": now,
		}).Error
}

func (r *notificationRepository) GetUnreadCount(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Notification{}).
		Where("\"UserID\" = ? AND \"IsRead\" = ?", userID, false).
		Count(&count).Error
	return count, err
}

func (r *notificationRepository) Delete(id uint) error {
	return r.db.Delete(&models.Notification{}, id).Error
}

func (r *notificationRepository) DeleteAll(userID uint) error {
	return r.db.Where("\"UserID\" = ?", userID).Delete(&models.Notification{}).Error
}
