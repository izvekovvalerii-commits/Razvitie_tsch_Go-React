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
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete all existing fields for this template
		if err := tx.Where("template_id = ?", template.ID).Delete(&models.TaskFieldTemplate{}).Error; err != nil {
			return err
		}

		// Update the template itself (without fields)
		if err := tx.Model(&models.TaskTemplate{}).Where("id = ?", template.ID).Updates(map[string]interface{}{
			"code":        template.Code,
			"name":        template.Name,
			"description": template.Description,
			"category":    template.Category,
			"is_active":   template.IsActive,
		}).Error; err != nil {
			return err
		}

		// Create new fields if any
		if len(template.Fields) > 0 {
			for i := range template.Fields {
				template.Fields[i].TemplateID = template.ID
			}
			if err := tx.Create(&template.Fields).Error; err != nil {
				return err
			}
		}

		return nil
	})
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
