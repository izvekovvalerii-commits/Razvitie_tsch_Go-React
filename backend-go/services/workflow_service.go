package services

import (
	"encoding/json"
	"fmt"
	"log"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"strings"
	"time"

	"gorm.io/gorm"
)

// WorkflowServiceInterface defines the contract for workflow operations
type WorkflowServiceInterface interface {
	GenerateProjectTasksWithTx(tx *gorm.DB, projectID uint, projectCreatedAt time.Time) ([]models.ProjectTask, error)
	ProcessTaskCompletion(projectID uint, completedTaskCode string) error
	ValidateTaskCompletion(task models.ProjectTask) error
}

type WorkflowService struct {
	userRepo     repositories.UserRepository
	notifService *NotificationService
	projectRepo  repositories.ProjectRepository
	db           *gorm.DB
}

func NewWorkflowService(userRepo repositories.UserRepository, projectRepo repositories.ProjectRepository, notifService *NotificationService, db *gorm.DB) *WorkflowService {
	return &WorkflowService{
		userRepo:     userRepo,
		projectRepo:  projectRepo,
		notifService: notifService,
		db:           db,
	}
}

func (s *WorkflowService) SetUserRepo(repo repositories.UserRepository) {
	s.userRepo = repo
}

func (s *WorkflowService) SetNotificationService(notifService *NotificationService) {
	s.notifService = notifService
}

func (s *WorkflowService) SetProjectRepo(repo repositories.ProjectRepository) {
	s.projectRepo = repo
}

func (s *WorkflowService) SetDB(db *gorm.DB) {
	s.db = db
}

// Helper to format nullable date
func formatDate(t *time.Time) string {
	if t == nil {
		return "N/A"
	}
	return t.Format("2006-01-02")
}

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
	{Code: "TASK-PREP-AUDIT", Name: "Подготовка к аудиту", Duration: 2, DependsOn: []string{}, ResponsibleRole: models.RoleMP, TaskType: "UserTask", Stage: "Инициализация"},
	{Code: "TASK-AUDIT", Name: "Аудит объекта", Duration: 1, DependsOn: []string{"TASK-PREP-AUDIT"}, ResponsibleRole: models.RoleMP, TaskType: "UserTask", Stage: "Аудит"},

	// Этап 2: Параллельные ветки после аудита
	{Code: "TASK-ALCO-LIC", Name: "Алкогольная лицензия", Duration: 2, DependsOn: []string{"TASK-AUDIT"}, ResponsibleRole: models.RoleMP, TaskType: "UserTask", Stage: "Лицензирование"},
	{Code: "TASK-WASTE", Name: "Площадка ТБО", Duration: 2, DependsOn: []string{"TASK-AUDIT"}, ResponsibleRole: models.RoleMP, TaskType: "UserTask", Stage: "ТБО"},
	{Code: "TASK-CONTOUR", Name: "Контур планировки", Duration: 1, DependsOn: []string{"TASK-AUDIT"}, ResponsibleRole: models.RoleMRiZ, TaskType: "UserTask", Stage: "Проектирование"},

	// Этап 3: Детальное проектирование (после контура)
	{Code: "TASK-VISUALIZATION", Name: "Визуализация", Duration: 1, DependsOn: []string{"TASK-CONTOUR"}, ResponsibleRole: models.RoleMP, TaskType: "UserTask", Stage: "Проектирование"},
	{Code: "TASK-LOGISTICS", Name: "Оценка логистики", Duration: 2, DependsOn: []string{"TASK-CONTOUR"}, ResponsibleRole: models.RoleMRiZ, TaskType: "UserTask", Stage: "Логистика"},
	{Code: "TASK-LAYOUT", Name: "Планировка с расстановкой", Duration: 2, DependsOn: []string{"TASK-CONTOUR"}, ResponsibleRole: models.RoleMRiZ, TaskType: "UserTask", Stage: "Проектирование"},

	// Этап 4: Бюджетирование
	{Code: "TASK-BUDGET-EQUIP", Name: "Расчет бюджета оборудования", Duration: 2, DependsOn: []string{"TASK-VISUALIZATION", "TASK-LAYOUT"}, ResponsibleRole: models.RoleMRiZ, TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-BUDGET-SECURITY", Name: "Расчет бюджета СБ", Duration: 2, DependsOn: []string{"TASK-LAYOUT"}, ResponsibleRole: models.RoleMRiZ, TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-BUDGET-RSR", Name: "ТЗ и расчет бюджета РСР", Duration: 1, DependsOn: []string{"TASK-BUDGET-SECURITY"}, ResponsibleRole: models.RoleMRiZ, TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-BUDGET-PIS", Name: "Расчет бюджета ПиС", Duration: 1, DependsOn: []string{"TASK-BUDGET-RSR", "TASK-BUDGET-EQUIP"}, ResponsibleRole: models.RoleMRiZ, TaskType: "UserTask", Stage: "Бюджет"},
	{Code: "TASK-TOTAL-BUDGET", Name: "Общий бюджет проекта", Duration: 1, DependsOn: []string{"TASK-BUDGET-PIS"}, ResponsibleRole: models.RoleMP, TaskType: "UserTask", Stage: "Бюджет"},
}

// GenerateProjectTasksWithTx creates the full task roadmap for a new project using a transaction
func (s *WorkflowService) GenerateProjectTasksWithTx(tx *gorm.DB, projectID uint, projectCreatedAt time.Time) ([]models.ProjectTask, error) {
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
				nextDay := maxPrevEndDate.AddDate(0, 0, 1)
				startDate = time.Date(nextDay.Year(), nextDay.Month(), nextDay.Day(), 0, 0, 0, 0, time.UTC)
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
		days := def.Duration

		// Serialize dependsOn
		depsBytes, _ := json.Marshal(def.DependsOn)
		depsStr := string(depsBytes)

		newTask := models.ProjectTask{
			ProjectID:         projectID,
			Name:              def.Name,
			Code:              &code,
			TaskType:          def.TaskType,
			Responsible:       def.ResponsibleRole,
			ResponsibleUserID: def.ResponsibleUserID,
			NormativeDeadline: deadline,
			PlannedStartDate:  &startDate,
			Status:            status,
			IsActive:          isActive,
			Stage:             &stage,
			CreatedAt:         &startDate,
			Days:              &days,
			DependsOn:         &depsStr,
		}

		// Resolve ResponsibleUserID
		if s.userRepo != nil && newTask.ResponsibleUserID == nil && newTask.Responsible != "" {
			users, err := s.userRepo.FindByRole(newTask.Responsible)
			if err == nil && len(users) > 0 {
				uid := int(users[0].ID)
				newTask.ResponsibleUserID = &uid
			}
		}

		if err := tx.Create(&newTask).Error; err != nil {
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

// GenerateProjectTasks wrapper for backward compatibility
func (s *WorkflowService) GenerateProjectTasks(projectID uint, projectCreatedAt time.Time) ([]models.ProjectTask, error) {
	return s.GenerateProjectTasksWithTx(s.db, projectID, projectCreatedAt)
}

// ProcessTaskCompletion checks if subsequent tasks should be activated and reschedules dependent tasks
func (s *WorkflowService) ProcessTaskCompletion(projectID uint, completedTaskCode string) error {
	log.Printf("[Workflow] Processing completion for task %s in project %d", completedTaskCode, projectID)

	var projectTasks []models.ProjectTask
	if err := s.db.Where("\"ProjectId\" = ?", projectID).Find(&projectTasks).Error; err != nil {
		return err
	}

	// 1. Create a map for quick lookup
	taskMap := make(map[string]*models.ProjectTask)
	for i := range projectTasks {
		if projectTasks[i].Code != nil {
			taskMap[*projectTasks[i].Code] = &projectTasks[i]
		}
	}

	// 2. TIMELINE RECALCULATION (Global Propagating Pass)
	// Iterate valid definitions in topological order (StoreOpeningTasks is ordered)
	for _, def := range StoreOpeningTasks {
		task := taskMap[def.Code]
		if task == nil {
			continue
		}

		// Skip completed tasks - their history is frozen
		if task.Status == "Завершена" {
			continue
		}

		// Calculate Start Date based on dependencies
		if len(def.DependsOn) > 0 {
			var maxPrevEndDate time.Time
			hasDeps := false
			allDepsCompleted := true

			for _, depCode := range def.DependsOn {
				depTask := taskMap[depCode]
				if depTask == nil {
					continue // Should not happen if DB is consistent
				}
				hasDeps = true

				// Determine effective end date of dependency
				var effectiveEnd time.Time
				if depTask.Status == "Завершена" && depTask.ActualDate != nil {
					effectiveEnd = *depTask.ActualDate
				} else {
					allDepsCompleted = false
					effectiveEnd = depTask.NormativeDeadline
				}

				if effectiveEnd.After(maxPrevEndDate) {
					maxPrevEndDate = effectiveEnd
				}
			}

			if hasDeps {
				// New Start = Max(Deps End) + 1 Day, normalized to midnight
				nextDay := maxPrevEndDate.AddDate(0, 0, 1)
				newStart := time.Date(nextDay.Year(), nextDay.Month(), nextDay.Day(), 0, 0, 0, 0, time.UTC)

				// New Deadline = New Start + Duration
				newDeadline := newStart.AddDate(0, 0, def.Duration)

				// Check if updates are needed
				oldStart := task.PlannedStartDate
				oldDeadline := task.NormativeDeadline

				startChanged := oldStart == nil || !datesEqual(*oldStart, newStart)
				deadlineChanged := !datesEqual(oldDeadline, newDeadline)

				if startChanged || deadlineChanged {
					task.PlannedStartDate = &newStart
					task.NormativeDeadline = newDeadline

					log.Printf("[Workflow] Task %s rescheduled: start %s -> %s, deadline %s -> %s",
						def.Code,
						formatDate(oldStart),
						newStart.Format("2006-01-02"),
						oldDeadline.Format("2006-01-02"),
						newDeadline.Format("2006-01-02"))

					if err := s.db.Save(task).Error; err != nil {
						log.Printf("Error updating task %s: %v", def.Code, err)
					}
				}

				// 3. ACTIVATION LOGIC
				// Activate only if ALL dependencies are completed AND task is waiting
				if allDepsCompleted && task.Status == "Ожидание" {
					log.Printf("[Workflow] Activating task %s", def.Code)
					task.Status = "Назначена"
					task.IsActive = true
					now := time.Now().UTC()
					task.StartedAt = &now

					if err := s.db.Save(task).Error; err != nil {
						log.Printf("Error activating task: %v", err)
					}

					// Send notification
					s.sendAssignmentNotification(projectID, task)
				}
			}
		}
	}

	return nil
}

func datesEqual(t1, t2 time.Time) bool {
	y1, m1, d1 := t1.Date()
	y2, m2, d2 := t2.Date()
	return y1 == y2 && m1 == m2 && d1 == d2
}

func (s *WorkflowService) sendAssignmentNotification(projectID uint, task *models.ProjectTask) {
	if task.ResponsibleUserID == nil || s.notifService == nil {
		return
	}

	projectName := "неизвестном проекте"
	if s.projectRepo != nil {
		if project, err := s.projectRepo.FindByID(projectID); err == nil && project.Store != nil {
			projectName = "проекте " + project.Store.Name
		}
	}
	message := fmt.Sprintf("Вам назначена задача: %s в %s", task.Name, projectName)
	if err := s.notifService.SendNotification(
		uint(*task.ResponsibleUserID),
		"Новая задача",
		message,
		"TASK_ASSIGNED",
		fmt.Sprintf("/projects/%d", projectID),
	); err != nil {
		log.Printf("⚠️ Failed to send notification for task %s: %v", *task.Code, err)
	} else {
		log.Printf("✅ Notification sent for task %s to user %d", *task.Code, *task.ResponsibleUserID)
	}
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
	if err := s.db.Model(&models.ProjectDocument{}).
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
	if err := s.db.Where("\"ProjectId\" = ? AND \"Type\" = ?", projectID, docType).Find(&docs).Error; err != nil {
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
