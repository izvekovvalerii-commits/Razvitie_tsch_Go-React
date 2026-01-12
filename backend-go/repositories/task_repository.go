package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type TaskRepository interface {
	FindAll() ([]models.ProjectTask, error)
	FindByProjectID(projectID uint) ([]models.ProjectTask, error)
	FindByResponsibleUserID(userID uint) ([]models.ProjectTask, error)
	FindByID(id uint) (*models.ProjectTask, error)
	Create(task *models.ProjectTask) error
	Update(task *models.ProjectTask) error
	DeleteOld() (int64, error)
	FindRecent(limit int) ([]models.ProjectTask, error)
	Delete(id uint) error
}

type taskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) FindAll() ([]models.ProjectTask, error) {
	var tasks []models.ProjectTask
	err := r.db.Order("\"CreatedAt\" DESC").Find(&tasks).Error
	return tasks, err
}

func (r *taskRepository) FindByProjectID(projectID uint) ([]models.ProjectTask, error) {
	var tasks []models.ProjectTask
	err := r.db.Where("\"ProjectId\" = ?", projectID).Order("\"NormativeDeadline\" ASC").Find(&tasks).Error
	return tasks, err
}

func (r *taskRepository) FindByResponsibleUserID(userID uint) ([]models.ProjectTask, error) {
	var tasks []models.ProjectTask
	err := r.db.Where("\"ResponsibleUserId\" = ?", userID).Order("\"NormativeDeadline\" ASC").Find(&tasks).Error
	return tasks, err
}

func (r *taskRepository) FindByID(id uint) (*models.ProjectTask, error) {
	var task models.ProjectTask
	err := r.db.First(&task, id).Error
	return &task, err
}

func (r *taskRepository) Create(task *models.ProjectTask) error {
	return r.db.Create(task).Error
}

func (r *taskRepository) Update(task *models.ProjectTask) error {
	return r.db.Save(task).Error
}

func (r *taskRepository) DeleteOld() (int64, error) {
	result := r.db.Where("responsible_user_id IS NULL").Delete(&models.ProjectTask{})
	return result.RowsAffected, result.Error
}

func (r *taskRepository) FindRecent(limit int) ([]models.ProjectTask, error) {
	var tasks []models.ProjectTask
	err := r.db.Order("id DESC").Limit(limit).Find(&tasks).Error
	return tasks, err
}

func (r *taskRepository) Delete(id uint) error {
	return r.db.Delete(&models.ProjectTask{}, id).Error
}
