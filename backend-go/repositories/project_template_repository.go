package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type ProjectTemplateRepository interface {
	FindAll() ([]models.ProjectTemplate, error)
	FindActive() ([]models.ProjectTemplate, error)
	FindByID(id uint) (*models.ProjectTemplate, error)
	FindDefault() (*models.ProjectTemplate, error)
	Create(template *models.ProjectTemplate) error
	Update(template *models.ProjectTemplate) error
	Delete(id uint) error
	SetDefault(id uint) error
	CreateTask(task *models.TemplateTask) error
	DeleteTask(templateID uint, taskID uint) error
}

type projectTemplateRepository struct {
	db *gorm.DB
}

func NewProjectTemplateRepository(db *gorm.DB) ProjectTemplateRepository {
	return &projectTemplateRepository{db: db}
}

func (r *projectTemplateRepository) FindAll() ([]models.ProjectTemplate, error) {
	templates := make([]models.ProjectTemplate, 0)
	err := r.db.Preload("Tasks").Order("\"IsDefault\" DESC, \"Name\" ASC").Find(&templates).Error
	return templates, err
}

func (r *projectTemplateRepository) FindActive() ([]models.ProjectTemplate, error) {
	templates := make([]models.ProjectTemplate, 0)
	err := r.db.Preload("Tasks").Where("\"IsActive\" = ?", true).
		Order("\"IsDefault\" DESC, \"Name\" ASC").Find(&templates).Error
	return templates, err
}

func (r *projectTemplateRepository) FindByID(id uint) (*models.ProjectTemplate, error) {
	var template models.ProjectTemplate
	err := r.db.Preload("Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("\"Order\" ASC, \"ID\" ASC")
	}).First(&template, id).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *projectTemplateRepository) FindDefault() (*models.ProjectTemplate, error) {
	var template models.ProjectTemplate
	err := r.db.Preload("Tasks", func(db *gorm.DB) *gorm.DB {
		return db.Order("\"Order\" ASC, \"ID\" ASC")
	}).Where("\"IsDefault\" = ? AND \"IsActive\" = ?", true, true).First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *projectTemplateRepository) Create(template *models.ProjectTemplate) error {
	return r.db.Create(template).Error
}

func (r *projectTemplateRepository) Update(template *models.ProjectTemplate) error {
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).Save(template).Error
}

func (r *projectTemplateRepository) Delete(id uint) error {
	// Сначала удаляем задачи
	if err := r.db.Where("\"ProjectTemplateID\" = ?", id).Delete(&models.TemplateTask{}).Error; err != nil {
		return err
	}
	// Затем сам шаблон
	return r.db.Delete(&models.ProjectTemplate{}, id).Error
}

func (r *projectTemplateRepository) SetDefault(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Сначала снимаем флаг IsDefault со всех шаблонов
		if err := tx.Model(&models.ProjectTemplate{}).Where("\"IsDefault\" = ?", true).
			Update("\"IsDefault\"", false).Error; err != nil {
			return err
		}
		// Устанавливаем новый по умолчанию
		return tx.Model(&models.ProjectTemplate{}).Where("\"ID\" = ?", id).
			Update("\"IsDefault\"", true).Error
	})
}

// CreateTask создает новую задачу в шаблоне
func (r *projectTemplateRepository) CreateTask(task *models.TemplateTask) error {
	return r.db.Create(task).Error
}

// DeleteTask удаляет задачу из шаблона
func (r *projectTemplateRepository) DeleteTask(templateID uint, taskID uint) error {
	return r.db.Where("\"ProjectTemplateID\" = ? AND \"ID\" = ?", templateID, taskID).
		Delete(&models.TemplateTask{}).Error
}
