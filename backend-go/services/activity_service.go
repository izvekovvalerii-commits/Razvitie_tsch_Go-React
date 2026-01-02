package services

import (
	"portal-razvitie/models"
	"portal-razvitie/repositories"
)

type ActivityService struct {
	Repo *repositories.UserActivityRepository
}

func NewActivityService(repo *repositories.UserActivityRepository) *ActivityService {
	return &ActivityService{Repo: repo}
}

func (s *ActivityService) LogActivity(userId uint, action, entityType string, entityId uint, entityName string, projectId *uint) error {
	activity := &models.UserActivity{
		UserID:     userId,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityId,
		EntityName: entityName,
		ProjectID:  projectId,
	}
	return s.Repo.Create(activity)
}

func (s *ActivityService) GetRecentActivities(limit int) ([]models.UserActivity, error) {
	return s.Repo.GetRecent(limit)
}
