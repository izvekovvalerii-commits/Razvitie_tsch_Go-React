package services

import (
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"strings"
	"time"
)

// ProjectStatusService управляет автоматическим обновлением статусов проектов
type ProjectStatusService struct {
	projectRepo  repositories.ProjectRepository
	taskRepo     repositories.TaskRepository
	activityRepo *repositories.UserActivityRepository
}

// NewProjectStatusService создает новый сервис управления статусами
func NewProjectStatusService(
	projectRepo repositories.ProjectRepository,
	taskRepo repositories.TaskRepository,
	activityRepo *repositories.UserActivityRepository,
) *ProjectStatusService {
	return &ProjectStatusService{
		projectRepo:  projectRepo,
		taskRepo:     taskRepo,
		activityRepo: activityRepo,
	}
}

// Маппинг задач на статусы проекта
// Каждая задача соответствует своему статусу проекта
var taskToStatusMap = map[string]models.ProjectStatus{
	"TASK-PREP-AUDIT":      models.ProjectStatusPrepAudit,
	"TASK-AUDIT":           models.ProjectStatusAuditObject,
	"TASK-ALCO-LIC":        models.ProjectStatusAlcoholLicense,
	"TASK-WASTE":           models.ProjectStatusWaste,
	"TASK-CONTOUR":         models.ProjectStatusContour,
	"TASK-VISUALIZATION":   models.ProjectStatusVisualization,
	"TASK-LOGISTICS":       models.ProjectStatusLogistics,
	"TASK-LAYOUT":          models.ProjectStatusLayout,
	"TASK-BUDGET-EQUIP":    models.ProjectStatusBudgetEquip,
	"TASK-BUDGET-SECURITY": models.ProjectStatusBudgetSecurity,
	"TASK-BUDGET-RSR":      models.ProjectStatusBudgetRSR,
	"TASK-BUDGET-PIS":      models.ProjectStatusBudgetPIS,
	"TASK-TOTAL-BUDGET":    models.ProjectStatusTotalBudget,
}

// UpdateProjectStatus автоматически обновляет статус проекта на основе задач
func (s *ProjectStatusService) UpdateProjectStatus(projectID uint, userID uint) error {
	// Получаем проект
	project, err := s.projectRepo.FindByID(projectID)
	if err != nil {
		return err
	}

	// Если проект уже в финальных статусах, не трогаем
	finalStatuses := []string{
		string(models.ProjectStatusOpened),
		string(models.ProjectStatusClosed),
		string(models.ProjectStatusArchived),
		string(models.ProjectStatusFailed),
	}
	for _, status := range finalStatuses {
		if project.Status == status {
			return nil // Не меняем финальные статусы
		}
	}

	// Получаем все задачи проекта
	tasks, err := s.taskRepo.FindByProjectID(projectID)
	if err != nil {
		return err
	}

	// Определяем новый статус на основе задач
	newStatus := s.determineProjectStatus(tasks)

	// Если статус не изменился, ничего не делаем
	if project.Status == string(newStatus) {
		return nil
	}

	oldStatus := project.Status

	// Обновляем статус
	if err := s.projectRepo.UpdateStatus(projectID, string(newStatus)); err != nil {
		return err
	}

	// Создаем запись в истории активности
	storeName := ""
	if project.Store != nil {
		storeName = project.Store.Name
	}

	activity := &models.UserActivity{
		UserID:     userID,
		EntityType: models.EntityProject,
		EntityID:   projectID,
		Action:     "изменил статус проекта с \"" + oldStatus + "\" на \"" + string(newStatus) + "\" (автоматически)",
		EntityName: storeName,
		ProjectID:  &projectID,
		CreatedAt:  time.Now(),
	}

	if err := s.activityRepo.Create(activity); err != nil {
		// Логируем ошибку, но не возвращаем (статус уже обновлен)
	}

	return nil
}

// determineProjectStatus определяет статус проекта на основе задач
func (s *ProjectStatusService) determineProjectStatus(tasks []models.ProjectTask) models.ProjectStatus {
	if len(tasks) == 0 {
		return models.ProjectStatusCreated
	}

	// Порядок задач в workflow (чем меньше, тем раньше в процессе)
	taskOrder := map[string]int{
		"TASK-PREP-AUDIT":      0,
		"TASK-AUDIT":           1,
		"TASK-ALCO-LIC":        2,
		"TASK-WASTE":           3,
		"TASK-CONTOUR":         4,
		"TASK-VISUALIZATION":   5,
		"TASK-LOGISTICS":       6,
		"TASK-LAYOUT":          7,
		"TASK-BUDGET-EQUIP":    8,
		"TASK-BUDGET-SECURITY": 9,
		"TASK-BUDGET-RSR":      10,
		"TASK-BUDGET-PIS":      11,
		"TASK-TOTAL-BUDGET":    12,
	}

	// Приоритет 1: Ищем задачи "В работе"
	// Если несколько - выбираем ПЕРВУЮ (с минимальным порядком)
	var inProgressTasks []models.ProjectTask
	for _, task := range tasks {
		if task.Status == string(models.TaskStatusInProgress) && task.Code != nil {
			if _, exists := taskToStatusMap[*task.Code]; exists {
				inProgressTasks = append(inProgressTasks, task)
			}
		}
	}

	if len(inProgressTasks) > 0 {
		// Находим задачу с минимальным порядком среди тех, что в работе
		minOrder := 999
		var selectedTask *models.ProjectTask

		for i := range inProgressTasks {
			task := &inProgressTasks[i]
			if order, exists := taskOrder[*task.Code]; exists {
				if order < minOrder {
					minOrder = order
					selectedTask = task
				}
			}
		}

		if selectedTask != nil && selectedTask.Code != nil {
			if status, exists := taskToStatusMap[*selectedTask.Code]; exists {
				return status
			}
		}
	}

	// Приоритет 2: Если нет задач "В работе", ищем последнюю завершенную
	// Выбираем с максимальным порядком среди завершенных
	maxOrder := 0
	var lastCompletedStatus models.ProjectStatus = models.ProjectStatusCreated

	for _, task := range tasks {
		if task.Status == string(models.TaskStatusCompleted) && task.Code != nil {
			if status, exists := taskToStatusMap[*task.Code]; exists {
				if order, exists := taskOrder[*task.Code]; exists {
					if order > maxOrder {
						maxOrder = order
						lastCompletedStatus = status
					}
				}
			}
		}
	}

	// Специальная логика: если все задачи завершены на 100%
	if s.allTasksCompleted(tasks) {
		return models.ProjectStatusOpened
	}

	// Специальная логика: если есть задачи РСР
	if s.hasRSRTasks(tasks) {
		return models.ProjectStatusRSR
	}

	// Возвращаем последнюю завершенную или "Создан"
	return lastCompletedStatus
}

// allTasksCompleted проверяет, завершены ли все задачи проекта
func (s *ProjectStatusService) allTasksCompleted(tasks []models.ProjectTask) bool {
	if len(tasks) == 0 {
		return false
	}

	for _, task := range tasks {
		if task.Status != string(models.TaskStatusCompleted) {
			return false
		}
	}
	return true
}

// hasRSRTasks проверяет наличие задач РСР
func (s *ProjectStatusService) hasRSRTasks(tasks []models.ProjectTask) bool {
	for _, task := range tasks {
		taskNameLower := strings.ToLower(task.Name)
		if (strings.Contains(taskNameLower, "смр") ||
			strings.Contains(taskNameLower, "строительство") ||
			strings.Contains(taskNameLower, "ремонт") ||
			strings.Contains(taskNameLower, "рср")) &&
			(task.Status == string(models.TaskStatusInProgress) ||
				task.Status == string(models.TaskStatusCompleted)) {
			return true
		}
	}
	return false
}

// CalculateProjectProgress рассчитывает процент выполнения проекта
func (s *ProjectStatusService) CalculateProjectProgress(projectID uint) (float64, error) {
	tasks, err := s.taskRepo.FindByProjectID(projectID)
	if err != nil {
		return 0, err
	}

	if len(tasks) == 0 {
		return 0, nil
	}

	completed := 0
	for _, task := range tasks {
		if task.Status == string(models.TaskStatusCompleted) {
			completed++
		}
	}

	return float64(completed) / float64(len(tasks)) * 100, nil
}

// GetProjectStatusInfo возвращает информацию о текущем статусе
func (s *ProjectStatusService) GetProjectStatusInfo(projectID uint) (map[string]interface{}, error) {
	project, err := s.projectRepo.FindByID(projectID)
	if err != nil {
		return nil, err
	}

	tasks, err := s.taskRepo.FindByProjectID(projectID)
	if err != nil {
		return nil, err
	}

	progress, _ := s.CalculateProjectProgress(projectID)

	// Определяем следующий возможный статус
	nextStatus := s.determineProjectStatus(tasks)

	return map[string]interface{}{
		"currentStatus":   project.Status,
		"suggestedStatus": string(nextStatus),
		"progress":        progress,
		"totalTasks":      len(tasks),
		"completedTasks":  countCompletedTasks(tasks),
	}, nil
}

// Helper functions

func countCompletedTasks(tasks []models.ProjectTask) int {
	count := 0
	for _, task := range tasks {
		if task.Status == string(models.TaskStatusCompleted) {
			count++
		}
	}
	return count
}
