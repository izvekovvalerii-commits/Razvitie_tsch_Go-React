package services

import (
	"portal-razvitie/events"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"time"
)

type TaskService struct {
	repo            repositories.TaskRepository
	projectRepo     repositories.ProjectRepository
	userRepo        repositories.UserRepository
	workflowService WorkflowServiceInterface
	eventBus        events.EventBus
}

func NewTaskService(repo repositories.TaskRepository, projectRepo repositories.ProjectRepository, userRepo repositories.UserRepository, workflowService WorkflowServiceInterface, eventBus events.EventBus) *TaskService {
	return &TaskService{
		repo:            repo,
		projectRepo:     projectRepo,
		userRepo:        userRepo,
		workflowService: workflowService,
		eventBus:        eventBus,
	}
}

func (s *TaskService) GetAllTasks() ([]models.ProjectTask, error) {
	return s.repo.FindAll()
}

func (s *TaskService) GetProjectTasks(projectId uint) ([]models.ProjectTask, error) {
	return s.repo.FindByProjectID(projectId)
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

	if err := s.repo.Create(task); err != nil {
		return err
	}

	// Publish Event
	s.eventBus.Publish(events.TaskCreatedEvent{Task: task, ActorID: actorId})

	return nil
}

func (s *TaskService) UpdateTask(task *models.ProjectTask, actorId uint) error {
	now := time.Now().UTC()
	task.UpdatedAt = &now
	if err := s.repo.Update(task); err != nil {
		return err
	}

	s.eventBus.Publish(events.TaskUpdatedEvent{Task: task, ActorID: actorId})
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

	if status == models.TaskStatusCompleted {
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
	if status == models.TaskStatusCompleted && task.Code != nil {
		go s.workflowService.ProcessTaskCompletion(task.ProjectID, *task.Code)
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
