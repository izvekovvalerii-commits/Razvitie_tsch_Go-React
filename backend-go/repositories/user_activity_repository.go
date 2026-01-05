package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type UserActivityRepository struct {
	DB *gorm.DB
}

func NewUserActivityRepository(db *gorm.DB) *UserActivityRepository {
	return &UserActivityRepository{DB: db}
}

func (r *UserActivityRepository) Create(activity *models.UserActivity) error {
	return r.DB.Create(activity).Error
}

func (r *UserActivityRepository) GetRecent(limit int) ([]models.UserActivity, error) {
	var activities []models.UserActivity

	err := r.DB.Model(&models.UserActivity{}).
		Preload("User").
		Preload("Project").
		Preload("Project.Store").
		Order("\"CreatedAt\" desc").
		Limit(limit).
		Find(&activities).Error

	if err != nil {
		return nil, err
	}

	return activities, nil
}

func (r *UserActivityRepository) GetByEntity(entityType string, entityId uint) ([]models.UserActivity, error) {
	var activities []models.UserActivity

	err := r.DB.Model(&models.UserActivity{}).
		Preload("User").
		Where("\"EntityType\" = ? AND \"EntityId\" = ?", entityType, entityId).
		Order("\"CreatedAt\" desc").
		Find(&activities).Error

	if err != nil {
		return nil, err
	}

	return activities, nil
}

// Updated
