package services

import (
	"encoding/json"
	"log"
	"portal-razvitie/events"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"time"
)

type TaskService struct {
	repo                 repositories.TaskRepository
	projectRepo          repositories.ProjectRepository
	userRepo             repositories.UserRepository
	workflowService      WorkflowServiceInterface
	eventBus             events.EventBus
	projectStatusService *ProjectStatusService
}

func NewTaskService(
	repo repositories.TaskRepository,
	projectRepo repositories.ProjectRepository,
	userRepo repositories.UserRepository,
	workflowService WorkflowServiceInterface,
	eventBus events.EventBus,
	projectStatusService *ProjectStatusService,
) *TaskService {
	return &TaskService{
		repo:                 repo,
		projectRepo:          projectRepo,
		userRepo:             userRepo,
		workflowService:      workflowService,
		eventBus:             eventBus,
		projectStatusService: projectStatusService,
	}
}

func (s *TaskService) GetAllTasks() ([]models.ProjectTask, error) {
	return s.repo.FindAll()
}

func (s *TaskService) GetProjectTasks(projectId uint) ([]models.ProjectTask, error) {
	return s.repo.FindByProjectID(projectId)
}

func (s *TaskService) GetTasksByResponsibleUser(userId uint) ([]models.ProjectTask, error) {
	return s.repo.FindByResponsibleUserID(userId)
}

func (s *TaskService) GetTask(id uint) (*models.ProjectTask, error) {
	return s.repo.FindByID(id)
}

func (s *TaskService) CreateTask(task *models.ProjectTask, actorId uint) error {
	now := time.Now().UTC()
	task.CreatedAt = &now

	// Resolve ResponsibleUserID if missing
	if task.ResponsibleUserID == nil && task.Responsible != "" {
		// Try by Name
		user, err := s.userRepo.FindByName(task.Responsible)
		if err == nil {
			uid := int(user.ID)
			task.ResponsibleUserID = &uid
		} else {
			// Try by Role
			users, err2 := s.userRepo.FindByRole(task.Responsible)
			if err2 == nil && len(users) > 0 {
				uid := int(users[0].ID)
				task.ResponsibleUserID = &uid
			}
		}
	}

	// Auto-assign Order if not set
	if task.Order == 0 {
		maxOrder, err := s.repo.GetMaxOrderByProject(task.ProjectID)
		if err != nil {
			// If error, default to 0
			maxOrder = 0
		}
		task.Order = maxOrder + 1
	}

	// Calculate dates based on dependencies
	if task.DependsOn != nil && *task.DependsOn != "" && *task.DependsOn != "[]" {
		// Get all existing tasks in the project
		projectTasks, err := s.repo.FindByProjectID(task.ProjectID)
		if err == nil {
			// Parse dependencies
			var deps []string
			if err := json.Unmarshal([]byte(*task.DependsOn), &deps); err == nil && len(deps) > 0 {
				// Find max end date among dependencies
				var maxEndDate time.Time
				taskMap := make(map[string]*models.ProjectTask)
				for i := range projectTasks {
					if projectTasks[i].Code != nil {
						taskMap[*projectTasks[i].Code] = &projectTasks[i]
					}
				}

				foundDeps := false
				for _, depCode := range deps {
					if depTask, exists := taskMap[depCode]; exists {
						foundDeps = true
						if depTask.NormativeDeadline.After(maxEndDate) {
							maxEndDate = depTask.NormativeDeadline
						}
					}
				}

				if foundDeps {
					// Start day after dependencies complete
					nextDay := maxEndDate.AddDate(0, 0, 1)
					startDate := time.Date(nextDay.Year(), nextDay.Month(), nextDay.Day(), 0, 0, 0, 0, time.UTC)
					task.PlannedStartDate = &startDate

					// Calculate deadline
					duration := 1 // default
					if task.Days != nil {
						duration = *task.Days
					}
					deadline := startDate.AddDate(0, 0, duration)
					task.NormativeDeadline = deadline
				}
			}
		}
	}

	// If dates not set by dependencies, use project creation date or current date
	if task.PlannedStartDate == nil {
		// Get project to use its creation date
		project, err := s.projectRepo.FindByID(task.ProjectID)
		if err == nil && project != nil {
			startDate := project.CreatedAt
			if startDate.IsZero() {
				startDate = now
			}
			task.PlannedStartDate = &startDate
		} else {
			task.PlannedStartDate = &now
		}
	}

	// Set deadline if not set
	if task.NormativeDeadline.IsZero() {
		duration := 1
		if task.Days != nil {
			duration = *task.Days
		}
		deadline := task.PlannedStartDate.AddDate(0, 0, duration)
		task.NormativeDeadline = deadline
	}

	// Set initial status
	if task.Status == "" {
		// If has dependencies, set to "Ожидание", otherwise "Назначена"
		if task.DependsOn != nil && *task.DependsOn != "" && *task.DependsOn != "[]" {
			task.Status = "Ожидание"
			task.IsActive = false
		} else {
			task.Status = "Назначена"
			task.IsActive = true
		}
	}

	if err := s.repo.Create(task); err != nil {
		return err
	}

	// Publish Event
	s.eventBus.Publish(events.TaskCreatedEvent{Task: task, ActorID: actorId})

	// Recalculate all task schedules in the project to account for the new task
	if s.workflowService != nil {
		log.Printf("[TaskService] Recalculating project timeline for project %d after creating task %v", task.ProjectID, task.Code)
		if err := s.workflowService.RecalculateProjectTimeline(task.ProjectID); err != nil {
			log.Printf("[TaskService] Error recalculating timeline: %v", err)
		}
	} else {
		log.Printf("[TaskService] WARNING: workflowService is nil, cannot recalculate timeline")
	}

	return nil
}

func (s *TaskService) UpdateTask(task *models.ProjectTask, actorId uint) error {
	// Fetch old task state
	oldTask, err := s.repo.FindByID(task.ID)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	task.UpdatedAt = &now
	if err := s.repo.Update(task); err != nil {
		return err
	}

	s.eventBus.Publish(events.TaskUpdatedEvent{Task: task, OldTask: oldTask, ActorID: actorId})
	return nil
}

func (s *TaskService) UpdateStatus(id uint, status string, actorId uint) error {
	task, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	oldStatus := task.Status
	now := time.Now().UTC()
	task.Status = status
	task.UpdatedAt = &now

	if status == string(models.TaskStatusCompleted) {
		if err := s.workflowService.ValidateTaskCompletion(*task); err != nil {
			return err
		}
		task.ActualDate = &now
	}

	if err := s.repo.Update(task); err != nil {
		return err
	}

	// Publish Event
	s.eventBus.Publish(events.TaskStatusChangedEvent{
		TaskID:    task.ID,
		TaskName:  task.Name,
		ProjectID: task.ProjectID,
		OldStatus: oldStatus,
		NewStatus: status,
		ActorID:   actorId,
		Task:      task,
	})

	// Trigger workflow logic directly (core business logic)
	// Alternatively, this could be moved to a WorkflowListener listening to TaskStatusChanged
	if status == string(models.TaskStatusCompleted) && task.Code != nil {
		if err := s.workflowService.ProcessTaskCompletion(task.ProjectID, *task.Code); err != nil {
			// Log error but don't fail the request? Or fail?
			// Ideally just log, as the status update itself succeeded.
			// logger.Error("Workflow processing failed", err)
		}
	}

	// Автоматически проверяем и обновляем статус проекта при изменении задачи
	if s.projectStatusService != nil {
		go func() {
			if err := s.projectStatusService.UpdateProjectStatus(task.ProjectID, actorId); err != nil {
				// Логируем ошибку, но не блокируем основной флоу
				// logger.Warn("Failed to auto-update project status:", err)
			}
		}()
	}

	return nil
}

func (s *TaskService) DeleteTask(id uint, actorId uint) error {
	task, err := s.repo.FindByID(id)
	if err == nil {
		s.eventBus.Publish(events.TaskDeletedEvent{
			TaskID:    id,
			TaskName:  task.Name,
			ProjectID: task.ProjectID,
			ActorID:   actorId,
		})
	}
	return s.repo.Delete(id)
}

func (s *TaskService) CleanupOldTasks() (int64, error) {
	return s.repo.DeleteOld()
}

func (s *TaskService) GetRecentTasks(limit int) ([]models.ProjectTask, error) {
	return s.repo.FindRecent(limit)
}
