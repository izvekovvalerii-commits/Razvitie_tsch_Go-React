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
	// Preload User and Project (Store inside project if needed for name?)
	// Let's preload basic relations.
	err := r.DB.Preload("User").Preload("Project").Preload("Project.Store").Order("created_at desc").Limit(limit).Find(&activities).Error
	return activities, err
}
