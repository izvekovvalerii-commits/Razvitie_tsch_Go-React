package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type ProjectRepository interface {
	Create(project *models.Project) error
	CreateWithTx(tx *gorm.DB, project *models.Project) error
	FindAll() ([]models.Project, error)
	FindByID(id uint) (*models.Project, error)
	Update(project *models.Project) error
	UpdateStatus(id uint, status string) error
	Delete(id uint) error
}

type projectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepository{db: db}
}

func (r *projectRepository) Create(project *models.Project) error {
	return r.db.Create(project).Error
}

func (r *projectRepository) CreateWithTx(tx *gorm.DB, project *models.Project) error {
	return tx.Create(project).Error
}

func (r *projectRepository) FindAll() ([]models.Project, error) {
	var projects []models.Project
	err := r.db.Preload("Store").Find(&projects).Error
	return projects, err
}

func (r *projectRepository) FindByID(id uint) (*models.Project, error) {
	var project models.Project
	err := r.db.Preload("Store").First(&project, id).Error
	return &project, err
}

func (r *projectRepository) Update(project *models.Project) error {
	return r.db.Save(project).Error
}

func (r *projectRepository) UpdateStatus(id uint, status string) error {
	result := r.db.Model(&models.Project{}).Where("id = ?", id).Update("status", status)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *projectRepository) Delete(id uint) error {
	result := r.db.Delete(&models.Project{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
