package services

import (
	"errors"
	"fmt"
	"portal-razvitie/models"
	"portal-razvitie/repositories"

	"github.com/lib/pq"
)

type ProjectTemplateService struct {
	repo repositories.ProjectTemplateRepository
}

func NewProjectTemplateService(repo repositories.ProjectTemplateRepository) *ProjectTemplateService {
	return &ProjectTemplateService{repo: repo}
}

// GetAll возвращает все шаблоны
func (s *ProjectTemplateService) GetAll() ([]models.ProjectTemplate, error) {
	return s.repo.FindAll()
}

// GetActive возвращает только активные шаблоны
func (s *ProjectTemplateService) GetActive() ([]models.ProjectTemplate, error) {
	return s.repo.FindActive()
}

// GetByID возвращает шаблон по ID
func (s *ProjectTemplateService) GetByID(id uint) (*models.ProjectTemplate, error) {
	return s.repo.FindByID(id)
}

// GetDefault возвращает шаблон по умолчанию
func (s *ProjectTemplateService) GetDefault() (*models.ProjectTemplate, error) {
	return s.repo.FindDefault()
}

// Create создает новый шаблон
func (s *ProjectTemplateService) Create(template *models.ProjectTemplate) error {
	// Валидация
	if template.Name == "" {
		return errors.New("название шаблона обязательно")
	}

	// Если это первый шаблон, делаем его по умолчанию
	templates, _ := s.repo.FindAll()
	if len(templates) == 0 {
		template.IsDefault = true
	}

	return s.repo.Create(template)
}

// Update обновляет шаблон
func (s *ProjectTemplateService) Update(template *models.ProjectTemplate) error {
	// Валидация
	if template.Name == "" {
		return errors.New("название шаблона обязательно")
	}

	// Проверка существования
	existing, err := s.repo.FindByID(template.ID)
	if err != nil {
		return errors.New("шаблон не найден")
	}

	// Если изменили IsDefault на true, нужно убрать флаг у других
	if template.IsDefault && !existing.IsDefault {
		if err := s.repo.SetDefault(template.ID); err != nil {
			return err
		}
	}

	return s.repo.Update(template)
}

// Delete удаляет шаблон
func (s *ProjectTemplateService) Delete(id uint) error {
	// Проверка существования
	template, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("шаблон не найден")
	}

	// Нельзя удалить шаблон по умолчанию, если он единственный
	if template.IsDefault {
		templates, _ := s.repo.FindAll()
		if len(templates) == 1 {
			return errors.New("нельзя удалить единственный шаблон по умолчанию")
		}
	}

	return s.repo.Delete(id)
}

// SetDefault устанавливает шаблон по умолчанию
func (s *ProjectTemplateService) SetDefault(id uint) error {
	// Проверка существования
	_, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("шаблон не найден")
	}

	return s.repo.SetDefault(id)
}

// Clone создает копию шаблона
func (s *ProjectTemplateService) Clone(sourceID uint, newName string) (*models.ProjectTemplate, error) {
	// Получить исходный шаблон
	source, err := s.repo.FindByID(sourceID)
	if err != nil {
		return nil, errors.New("исходный шаблон не найден")
	}

	// Создать копию
	clone := &models.ProjectTemplate{
		Name:        newName,
		Description: source.Description + " (копия)",
		Category:    source.Category,
		IsActive:    false, // По умолчанию неактивен
		IsDefault:   false,
	}

	// Скопировать задачи
	for _, task := range source.Tasks {
		clonedTask := models.TemplateTask{
			Code:            task.Code,
			Name:            task.Name,
			Duration:        task.Duration,
			Stage:           task.Stage,
			DependsOn:       task.DependsOn,
			ResponsibleRole: task.ResponsibleRole,
			TaskType:        task.TaskType,
			Order:           task.Order,
		}
		clone.Tasks = append(clone.Tasks, clonedTask)
	}

	// Создать клон
	if err := s.repo.Create(clone); err != nil {
		return nil, err
	}

	return clone, nil
}

// ImportFromTaskDefinitions создает шаблон из существующих TaskDefinition
func (s *ProjectTemplateService) ImportFromTaskDefinitions(name string, taskDefs []models.TaskDefinition) error {
	template := &models.ProjectTemplate{
		Name:        name,
		Description: "Импортировано из TaskDefinition",
		Category:    "Открытие магазина",
		IsActive:    true,
		IsDefault:   true,
	}

	// Конвертировать TaskDefinition в TemplateTask
	for i, def := range taskDefs {
		task := models.TemplateTask{
			Code:            def.Code,
			Name:            def.Name,
			Duration:        def.Duration,
			Stage:           def.Stage,
			DependsOn:       pq.StringArray(def.DependsOn),
			ResponsibleRole: def.ResponsibleRole,
			TaskType:        def.TaskType,
			Order:           i,
		}
		template.Tasks = append(template.Tasks, task)
	}

	return s.repo.Create(template)
}

// ExportToTaskDefinitions экспортирует задачи шаблона в формат TaskDefinition
func (s *ProjectTemplateService) ExportToTaskDefinitions(templateID uint) ([]models.TaskDefinition, error) {
	template, err := s.repo.FindByID(templateID)
	if err != nil {
		return nil, err
	}

	var taskDefs []models.TaskDefinition
	for _, task := range template.Tasks {
		taskDef := models.TaskDefinition{
			Code:            task.Code,
			Name:            task.Name,
			Duration:        task.Duration,
			Stage:           task.Stage,
			DependsOn:       pq.StringArray(task.DependsOn),
			ResponsibleRole: task.ResponsibleRole,
			TaskType:        task.TaskType,
		}
		taskDefs = append(taskDefs, taskDef)
	}

	return taskDefs, nil
}

// UpdateTask обновляет задачу в шаблоне
func (s *ProjectTemplateService) UpdateTask(templateID uint, taskID uint, updatedTask *models.TemplateTask) error {
	template, err := s.repo.FindByID(templateID)
	if err != nil {
		return fmt.Errorf("шаблон не найден: %w", err)
	}

	// Найти и обновить задачу
	found := false
	for i := range template.Tasks {
		if template.Tasks[i].ID == taskID {
			template.Tasks[i].Name = updatedTask.Name
			template.Tasks[i].Duration = updatedTask.Duration
			template.Tasks[i].Stage = updatedTask.Stage
			template.Tasks[i].DependsOn = updatedTask.DependsOn
			template.Tasks[i].ResponsibleRole = updatedTask.ResponsibleRole
			template.Tasks[i].Order = updatedTask.Order
			found = true
			break
		}
	}

	if !found {
		return errors.New("задача не найдена в шаблоне")
	}

	return s.repo.Update(template)
}

// AddTaskFromDefinition добавляет задачу из TaskDefinition в шаблон
func (s *ProjectTemplateService) AddTaskFromDefinition(templateID uint, taskDef *models.TaskDefinition) (*models.TemplateTask, error) {
	// Получить шаблон
	template, err := s.repo.FindByID(templateID)
	if err != nil {
		return nil, fmt.Errorf("шаблон не найден: %w", err)
	}

	// Проверить, не добавлена ли уже такая задача
	for _, t := range template.Tasks {
		if t.Code == taskDef.Code {
			return nil, fmt.Errorf("задача с кодом %s уже добавлена в шаблон", taskDef.Code)
		}
	}

	// Создать новую TemplateTask
	newTask := models.TemplateTask{
		ProjectTemplateID: templateID,
		Code:              taskDef.Code,
		Name:              taskDef.Name,
		Duration:          taskDef.Duration,
		Stage:             taskDef.Stage,
		DependsOn:         taskDef.DependsOn,
		ResponsibleRole:   taskDef.ResponsibleRole,
		TaskType:          taskDef.TaskType,
		Order:             len(template.Tasks), // Добавить в конец
	}

	// Создать задачу напрямую в базе (без обновления всего шаблона)
	if err := s.repo.CreateTask(&newTask); err != nil {
		return nil, fmt.Errorf("ошибка при создании задачи: %w", err)
	}

	return &newTask, nil
}

// DeleteTask удаляет задачу из шаблона
func (s *ProjectTemplateService) DeleteTask(templateID uint, taskID uint) error {
	template, err := s.repo.FindByID(templateID)
	if err != nil {
		return fmt.Errorf("шаблон не найден: %w", err)
	}

	// Проверить, существует ли задача
	found := false
	for _, task := range template.Tasks {
		if task.ID == taskID {
			found = true
			break
		}
	}

	if !found {
		return errors.New("задача не найдена в шаблоне")
	}

	// Удалить задачу напрямую через репозиторий
	return s.repo.DeleteTask(templateID, taskID)
}

// AddCustomTask adds a new custom task to the template
func (s *ProjectTemplateService) AddCustomTask(templateID uint, taskData *models.TemplateTask) (*models.TemplateTask, error) {
	// Verify template exists
	template, err := s.repo.FindByID(templateID)
	if err != nil {
		return nil, fmt.Errorf("template not found: %w", err)
	}

	// Check for duplicates by Code
	for _, t := range template.Tasks {
		if t.Code == taskData.Code {
			return nil, fmt.Errorf("task with code %s already exists in the template", taskData.Code)
		}
	}

	// Set required fields
	taskData.ProjectTemplateID = templateID
	taskData.Order = len(template.Tasks) // Add to the end

	if err := s.repo.CreateTask(taskData); err != nil {
		return nil, fmt.Errorf("error creating task: %w", err)
	}

	return taskData, nil
}
