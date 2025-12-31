package services

import (
	"fmt"
	"log"
	"portal-razvitie/database"
	"portal-razvitie/models"
	"strings"
	"time"
)

type WorkflowService struct{}

type TaskDefinition struct {
	Code              string
	Name              string
	Duration          int
	DependsOn         []string
	ResponsibleRole   string // "МП", "МРиЗ", "БА"
	ResponsibleUserID *int   // Optional fixed user ID
	TaskType          string // "UserTask", "ServiceTask"
	Stage             string
}

// Full workflow definition specific to the "Child" portal requirements
var StoreOpeningTasks = []TaskDefinition{
	// Этап 1: Инициализация и Аудит
	{Code: "TASK-PREP-AUDIT", Name: "Подготовка к аудиту", Duration: 2, DependsOn: []string{}, ResponsibleRole: "МП", TaskType: "UserTask", Stage: "Инициализация"},
	{Code: "TASK-AUDIT", Name: "Аудит объекта", Duration: 1, DependsOn: []string{"TASK-PREP-AUDIT"}, ResponsibleRole: "МП", TaskType: "UserTask", Stage: "Аудит"},

	// Этап 2: Параллельные ветки после аудита
	{Code: "TASK-ALCO-LIC", Name: "Алкогольная лицензия", Duration: 2, DependsOn: []string{"TASK-AUDIT"}, ResponsibleRole: "МП", TaskType: "UserTask", Stage: "Лицензирование"},
	{Code: "TASK-WASTE", Name: "Площадка ТБО", Duration: 2, DependsOn: []string{"TASK-AUDIT"}, ResponsibleRole: "МП", TaskType: "UserTask", Stage: "ТБО"},
	{Code: "TASK-CONTOUR", Name: "Контур планировки", Duration: 1, DependsOn: []string{"TASK-AUDIT"}, ResponsibleRole: "МРиЗ", TaskType: "UserTask", Stage: "Проектирование"},

	// Этап 3: Детальное проектирование (после контура)
	{Code: "TASK-VISUALIZATION", Name: "Визуализация", Duration: 1, DependsOn: []string{"TASK-CONTOUR"}, ResponsibleRole: "МП", TaskType: "UserTask", Stage: "Проектирование"},
	{Code: "TASK-LOGISTICS", Name: "Оценка логистики", Duration: 2, DependsOn: []string{"TASK-CONTOUR"}, ResponsibleRole: "МРиЗ", TaskType: "UserTask", Stage: "Логистика"},
	{Code: "TASK-LAYOUT", Name: "Планировка с расстановкой", Duration: 2, DependsOn: []string{"TASK-CONTOUR"}, ResponsibleRole: "МРиЗ", TaskType: "UserTask", Stage: "Проектирование"},

	// Этап 4: Бюджетирование
	{Code: "TASK-BUDGET-EQUIP", Name: "Расчет бюджета оборудования", Duration: 2, DependsOn: []string{"TASK-VISUALIZATION", "TASK-LAYOUT"}, ResponsibleRole: "МРиЗ", TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-BUDGET-SECURITY", Name: "Расчет бюджета СБ", Duration: 2, DependsOn: []string{"TASK-LAYOUT"}, ResponsibleRole: "МРиЗ", TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-BUDGET-RSR", Name: "ТЗ и расчет бюджета РСР", Duration: 1, DependsOn: []string{"TASK-BUDGET-SECURITY"}, ResponsibleRole: "МРиЗ", TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-BUDGET-PIS", Name: "Расчет бюджета ПиС", Duration: 1, DependsOn: []string{"TASK-BUDGET-RSR", "TASK-BUDGET-EQUIP"}, ResponsibleRole: "МРиЗ", TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-TOTAL-BUDGET", Name: "Общий бюджет проекта", Duration: 1, DependsOn: []string{"TASK-BUDGET-PIS"}, ResponsibleRole: "МП", TaskType: "UserTask", Stage: "Бюджет"},
}

// GenerateProjectTasks creates the full task roadmap for a new project
func (s *WorkflowService) GenerateProjectTasks(projectID uint, projectCreatedAt time.Time) ([]models.ProjectTask, error) {
	var createdTasks []models.ProjectTask
	taskMap := make(map[string]*models.ProjectTask) // Map By Code

	for _, def := range StoreOpeningTasks {
		// 1. Calculate Start Date Logic
		startDate := projectCreatedAt

		// Find max end date of dependencies
		if len(def.DependsOn) > 0 {
			var maxPrevEndDate time.Time
			foundDeps := false

			for _, depCode := range def.DependsOn {
				if prevTask, exists := taskMap[depCode]; exists {
					foundDeps = true
					if prevTask.NormativeDeadline.After(maxPrevEndDate) {
						maxPrevEndDate = prevTask.NormativeDeadline
					}
				}
			}

			if foundDeps {
				startDate = maxPrevEndDate.AddDate(0, 0, 1)
			}
		}

		// 2. Calculate Deadline
		deadline := startDate.AddDate(0, 0, def.Duration)

		// 3. Determine Initial Status
		status := "Ожидание"
		isActive := false

		if len(def.DependsOn) == 0 {
			status = "Назначена"
			isActive = true // First tasks are active
		}

		// 4. Create Struct
		code := def.Code
		stage := def.Stage

		newTask := models.ProjectTask{
			ProjectID:         projectID,
			Name:              def.Name,
			Code:              &code,
			TaskType:          def.TaskType,
			Responsible:       def.ResponsibleRole,
			ResponsibleUserID: def.ResponsibleUserID,
			NormativeDeadline: deadline,
			Status:            status,
			IsActive:          isActive,
			Stage:             &stage,
			CreatedAt:         &startDate,
		}

		if err := database.DB.Create(&newTask).Error; err != nil {
			return nil, err
		}

		createdTasks = append(createdTasks, newTask)

		// Store for next iterations
		// Note: We need the ID if we were linking them by ID in DB, but here we link logic by Code map
		taskCopy := newTask
		taskMap[def.Code] = &taskCopy
	}

	return createdTasks, nil
}

// ProcessTaskCompletion checks if subsequent tasks should be activated
func (s *WorkflowService) ProcessTaskCompletion(projectID uint, completedTaskCode string) error {
	log.Printf("[Workflow] Processing completion for task %s in project %d", completedTaskCode, projectID)

	var projectTasks []models.ProjectTask
	if err := database.DB.Where("\"ProjectId\" = ?", projectID).Find(&projectTasks).Error; err != nil {
		return err
	}

	// Create a map for quick lookup of status
	statusMap := make(map[string]string)
	for _, t := range projectTasks {
		if t.Code != nil {
			statusMap[*t.Code] = t.Status
		}
	}

	// Check definitions to find tasks that depend on the completed one
	for _, def := range StoreOpeningTasks {
		// Only check tasks that are waiting
		currentStatus := statusMap[def.Code]
		if currentStatus != "Ожидание" {
			continue
		}

		// Check if ALL dependencies are completed
		allDepsMet := true
		for _, depCode := range def.DependsOn {
			if statusMap[depCode] != "Завершена" {
				allDepsMet = false
				break
			}
		}

		if allDepsMet {
			log.Printf("[Workflow] Activating task %s", def.Code)
			// Find the task record to update
			for _, t := range projectTasks {
				if t.Code != nil && *t.Code == def.Code {
					// Activate it
					t.Status = "Назначена"
					t.IsActive = true
					now := time.Now().UTC()
					t.StartedAt = &now // Or just leave it as Assigned

					// Save
					if err := database.DB.Save(&t).Error; err != nil {
						log.Printf("Error activating task: %v", err)
					}
					break
				}
			}
		}
	}

	return nil
}

// ValidateTaskCompletion checks if the task has all required fields and documents before completion
func (s *WorkflowService) ValidateTaskCompletion(task models.ProjectTask) error {
	if task.Code == nil {
		return nil
	}

	code := *task.Code
	// Common helper to check pointer string
	hasStr := func(s *string) bool { return s != nil && *s != "" }
	// Common helper to check pointer time
	hasTime := func(t *time.Time) bool { return t != nil && !t.IsZero() }
	// Common helper to check pointer float
	hasFloat := func(f *float64) bool { return f != nil }

	switch code {
	case "TASK-PREP-AUDIT": // 1. Подготовка к аудиту
		if !hasTime(task.PlannedAuditDate) {
			return fmt.Errorf("Поле 'Плановая дата аудита' обязательно")
		}
		if !hasStr(task.ProjectFolderLink) {
			return fmt.Errorf("Поле 'Ссылка на папку проекта' обязательно")
		}
		if err := s.checkDocExists(task.ProjectID, "Технический план"); err != nil {
			return err
		}

	case "TASK-AUDIT": // 2. Аудит объекта
		if !hasTime(task.ActualAuditDate) {
			return fmt.Errorf("Поле 'Фактическая дата аудита' обязательно")
		}

	case "TASK-WASTE": // 3. Площадка ТБО
		if !hasStr(task.TboDocsLink) {
			return fmt.Errorf("Поле 'Ссылка на документы для площадки ТБО' обязательно")
		}
		if !hasTime(task.TboAgreementDate) {
			return fmt.Errorf("Поле 'Дата согласования' обязательно")
		}
		if !hasTime(task.TboRegistryDate) {
			return fmt.Errorf("Поле 'Дата внесения в Реестр ТБО' обязательно")
		}

	case "TASK-CONTOUR": // 4. Контур планировки
		if !hasTime(task.PlanningContourAgreementDate) {
			return fmt.Errorf("Поле 'Дата согласования контура' обязательно")
		}
		if err := s.checkDocExists(task.ProjectID, "Фотографии объекта"); err != nil {
			return err
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Обмерный план", []string{".dwg"}); err != nil {
			return err
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Предварительный контур", []string{".dwg"}); err != nil {
			return err
		}

	case "TASK-VISUALIZATION": // 5. Визуализация
		if !hasTime(task.VisualizationAgreementDate) {
			return fmt.Errorf("Поле 'Дата согласования визуализации' обязательно")
		}
		if err := s.checkDocExists(task.ProjectID, "Концепт визуализации"); err != nil {
			return err
		}
		if err := s.checkDocExists(task.ProjectID, "Выписка ЕГРН"); err != nil {
			return err
		}
		if err := s.checkDocExists(task.ProjectID, "Визуализация внешнего вида магазина"); err != nil {
			return err
		}

	case "TASK-LOGISTICS": // 6. Оценка логистики
		// logisticsNbkpEligibility is a string/enum, just check existence if required (checkbox/choice)
		if !hasStr(task.LogisticsNbkpEligibility) {
			return fmt.Errorf("Поле 'Возможность НБКП' обязательно")
		}
		if err := s.checkDocExists(task.ProjectID, "Схема подъездных путей"); err != nil {
			return err
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Оценка логистики и подъездных путей", []string{".pdf"}); err != nil {
			return err
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Оценка возможности НБКП", []string{".pdf"}); err != nil {
			return err
		}

	case "TASK-LAYOUT": // 7. Планировка с расстановкой
		if !hasTime(task.LayoutAgreementDate) {
			return fmt.Errorf("Поле 'Дата согласования планировки' обязательно")
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Технологическая планировка (DWG)", []string{".dwg"}); err != nil {
			return err
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Технологическая планировка (PDF)", []string{".pdf"}); err != nil {
			return err
		}

	case "TASK-BUDGET-EQUIP": // 8. Расчет бюджета оборудования
		if !hasFloat(task.EquipmentCostNoVat) {
			return fmt.Errorf("Поле 'Сумма затрат на оборудование без НДС' обязательно")
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Расчет затрат на оборудование", []string{".xls", ".xlsx"}); err != nil {
			return err
		}

	case "TASK-BUDGET-SECURITY": // 9. Расчет бюджета СБ
		if !hasFloat(task.SecurityBudgetNoVat) {
			return fmt.Errorf("Поле 'Сумма бюджета СБ без НДС' обязательно")
		}
		if err := s.checkDocExists(task.ProjectID, "Анкета СБ"); err != nil {
			return err
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Расчет затрат на оборудование СБ", []string{".xls", ".xlsx"}); err != nil {
			return err
		}

	case "TASK-BUDGET-RSR": // 10. ТЗ и расчет бюджета РСР
		if !hasFloat(task.RsrBudgetNoVat) {
			return fmt.Errorf("Поле 'Сумма бюджета РСР без НДС' обязательно")
		}
		if err := s.checkDocExists(task.ProjectID, "Распределительная ведомость"); err != nil {
			return err
		}
		if err := s.checkDocExistsWithExt(task.ProjectID, "Расчет бюджета РСР", []string{".xls", ".xlsx"}); err != nil {
			return err
		}

	case "TASK-BUDGET-PIS": // 11. Расчет бюджета ПиС
		if !hasFloat(task.PisBudgetNoVat) {
			return fmt.Errorf("Поле 'Сумма бюджета ПиС без НДС' обязательно")
		}

	case "TASK-TOTAL-BUDGET": // 12. Общий бюджет проекта
		if !hasFloat(task.TotalBudgetNoVat) {
			return fmt.Errorf("Поле 'Сумма общего бюджета без НДС' обязательно")
		}
	}

	return nil
}

func (s *WorkflowService) checkDocExists(projectID uint, docType string) error {
	var count int64
	if err := database.DB.Model(&models.ProjectDocument{}).
		Where("\"ProjectId\" = ? AND \"Type\" = ?", projectID, docType).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("Необходим документ: %s", docType)
	}
	return nil
}

func (s *WorkflowService) checkDocExistsWithExt(projectID uint, docType string, allowedExts []string) error {
	var docs []models.ProjectDocument
	if err := database.DB.Where("\"ProjectId\" = ? AND \"Type\" = ?", projectID, docType).Find(&docs).Error; err != nil {
		return err
	}

	if len(docs) == 0 {
		return fmt.Errorf("Необходим документ: %s", docType)
	}

	valid := false
	for _, doc := range docs {
		name := strings.ToLower(doc.FileName)
		for _, ext := range allowedExts {
			if strings.HasSuffix(name, strings.ToLower(ext)) {
				valid = true
				break
			}
		}
		if valid {
			break
		}
	}

	if !valid {
		return fmt.Errorf("Документ '%s' должен иметь формат: %s", docType, strings.Join(allowedExts, ", "))
	}
	return nil
}
