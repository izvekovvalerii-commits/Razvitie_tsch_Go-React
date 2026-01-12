package services

import (
	"errors"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
)

// TaskTemplateService сервис для работы с шаблонами задач
type TaskTemplateService struct {
	repo repositories.TaskTemplateRepository
}

// NewTaskTemplateService создает новый сервис шаблонов
func NewTaskTemplateService(repo repositories.TaskTemplateRepository) *TaskTemplateService {
	return &TaskTemplateService{repo: repo}
}

// CreateTemplate создает новый шаблон
func (s *TaskTemplateService) CreateTemplate(template *models.TaskTemplate) error {
	// Валидация
	if err := template.Validate(); err != nil {
		return err
	}

	// Валидация полей
	for i := range template.Fields {
		if err := template.Fields[i].Validate(); err != nil {
			return errors.New("ошибка в поле " + template.Fields[i].FieldLabel + ": " + err.Error())
		}
	}

	// Проверка уникальности кода
	existing, _ := s.repo.FindByCode(template.Code)
	if existing != nil {
		return errors.New("шаблон с кодом " + template.Code + " уже существует")
	}

	return s.repo.Create(template)
}

// UpdateTemplate обновляет существующий шаблон
func (s *TaskTemplateService) UpdateTemplate(template *models.TaskTemplate) error {
	// Валидация
	if err := template.Validate(); err != nil {
		return err
	}

	// Проверка существования
	existing, err := s.repo.FindByID(template.ID)
	if err != nil {
		return errors.New("шаблон не найден")
	}

	// Проверка уникальности кода (если изменился)
	if existing.Code != template.Code {
		codeExists, _ := s.repo.FindByCode(template.Code)
		if codeExists != nil {
			return errors.New("шаблон с кодом " + template.Code + " уже существует")
		}
	}

	// Валидация полей
	for i := range template.Fields {
		if err := template.Fields[i].Validate(); err != nil {
			return errors.New("ошибка в поле " + template.Fields[i].FieldLabel + ": " + err.Error())
		}
	}

	return s.repo.Update(template)
}

// DeleteTemplate удаляет шаблон
func (s *TaskTemplateService) DeleteTemplate(id uint) error {
	// Проверка существования
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("шаблон не найден")
	}

	// TODO: Проверить, не используется ли шаблон в существующих задачах
	// Если используется, возможно нужно запретить удаление или предупредить

	return s.repo.Delete(id)
}

// GetTemplateByID возвращает шаблон по ID
func (s *TaskTemplateService) GetTemplateByID(id uint) (*models.TaskTemplate, error) {
	return s.repo.FindByID(id)
}

// GetTemplateByCode возвращает шаблон по коду
func (s *TaskTemplateService) GetTemplateByCode(code string) (*models.TaskTemplate, error) {
	return s.repo.FindByCode(code)
}

// GetAllTemplates возвращает все шаблоны
func (s *TaskTemplateService) GetAllTemplates() ([]models.TaskTemplate, error) {
	return s.repo.FindAll()
}

// GetTemplatesByCategory возвращает шаблоны по категории
func (s *TaskTemplateService) GetTemplatesByCategory(category string) ([]models.TaskTemplate, error) {
	return s.repo.FindByCategory(category)
}

// GetActiveTemplates возвращает только активные шаблоны
func (s *TaskTemplateService) GetActiveTemplates() ([]models.TaskTemplate, error) {
	return s.repo.FindActive()
}

// CloneTemplate создает копию шаблона с новым кодом
func (s *TaskTemplateService) CloneTemplate(sourceID uint, newCode string, newName string) (*models.TaskTemplate, error) {
	// Получить исходный шаблон
	source, err := s.repo.FindByID(sourceID)
	if err != nil {
		return nil, errors.New("исходный шаблон не найден")
	}

	// Создать копию
	clone := &models.TaskTemplate{
		Code:        newCode,
		Name:        newName,
		Description: source.Description + " (копия)",
		Category:    source.Category,
		IsActive:    false, // По умолчанию неактивен
	}

	// Скопировать поля
	for _, field := range source.Fields {
		clonedField := models.TaskFieldTemplate{
			FieldKey:        field.FieldKey,
			FieldLabel:      field.FieldLabel,
			FieldType:       field.FieldType,
			IsRequired:      field.IsRequired,
			IsVisible:       field.IsVisible,
			IsReadOnly:      field.IsReadOnly,
			DefaultValue:    field.DefaultValue,
			ValidationRules: field.ValidationRules,
			Options:         field.Options,
			Order:           field.Order,
			Section:         field.Section,
			Placeholder:     field.Placeholder,
			HelpText:        field.HelpText,
		}
		clone.Fields = append(clone.Fields, clonedField)
	}

	// Создать клон
	if err := s.CreateTemplate(clone); err != nil {
		return nil, err
	}

	return clone, nil
}

// ToggleTemplateStatus активирует/деактивирует шаблон
func (s *TaskTemplateService) ToggleTemplateStatus(id uint) error {
	template, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("шаблон не найден")
	}

	template.IsActive = !template.IsActive
	return s.repo.Update(template)
}
