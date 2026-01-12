package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

// TaskTemplateRepository интерфейс для работы с шаблонами задач
type TaskTemplateRepository interface {
	Create(template *models.TaskTemplate) error
	Update(template *models.TaskTemplate) error
	Delete(id uint) error
	FindByID(id uint) (*models.TaskTemplate, error)
	FindByCode(code string) (*models.TaskTemplate, error)
	FindAll() ([]models.TaskTemplate, error)
	FindByCategory(category string) ([]models.TaskTemplate, error)
	FindActive() ([]models.TaskTemplate, error)
}

type taskTemplateRepository struct {
	db *gorm.DB
}

// NewTaskTemplateRepository создает новый репозиторий шаблонов задач
func NewTaskTemplateRepository(db *gorm.DB) TaskTemplateRepository {
	return &taskTemplateRepository{db: db}
}

func (r *taskTemplateRepository) Create(template *models.TaskTemplate) error {
	return r.db.Create(template).Error
}

func (r *taskTemplateRepository) Update(template *models.TaskTemplate) error {
	return r.db.Save(template).Error
}

func (r *taskTemplateRepository) Delete(id uint) error {
	return r.db.Delete(&models.TaskTemplate{}, id).Error
}

func (r *taskTemplateRepository) FindByID(id uint) (*models.TaskTemplate, error) {
	var template models.TaskTemplate
	err := r.db.Preload("Fields", func(db *gorm.DB) *gorm.DB {
		return db.Order("task_field_templates.\"order\" ASC")
	}).First(&template, id).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *taskTemplateRepository) FindByCode(code string) (*models.TaskTemplate, error) {
	var template models.TaskTemplate
	err := r.db.Preload("Fields", func(db *gorm.DB) *gorm.DB {
		return db.Order("task_field_templates.\"order\" ASC")
	}).Where("code = ?", code).First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *taskTemplateRepository) FindAll() ([]models.TaskTemplate, error) {
	var templates []models.TaskTemplate
	err := r.db.Preload("Fields", func(db *gorm.DB) *gorm.DB {
		return db.Order("task_field_templates.\"order\" ASC")
	}).Order("name ASC").Find(&templates).Error
	return templates, err
}

func (r *taskTemplateRepository) FindByCategory(category string) ([]models.TaskTemplate, error) {
	var templates []models.TaskTemplate
	err := r.db.Preload("Fields", func(db *gorm.DB) *gorm.DB {
		return db.Order("task_field_templates.\"order\" ASC")
	}).Where("category = ?", category).Order("name ASC").Find(&templates).Error
	return templates, err
}

func (r *taskTemplateRepository) FindActive() ([]models.TaskTemplate, error) {
	var templates []models.TaskTemplate
	err := r.db.Preload("Fields", func(db *gorm.DB) *gorm.DB {
		return db.Order("task_field_templates.\"order\" ASC")
	}).Where("is_active = ?", true).Order("category ASC, name ASC").Find(&templates).Error
	return templates, err
}
