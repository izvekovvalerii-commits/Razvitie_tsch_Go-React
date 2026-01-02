package services

import (
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/websocket"
	"time"
)

type TaskService struct {
	repo            repositories.TaskRepository
	projectRepo     repositories.ProjectRepository
	userRepo        repositories.UserRepository
	workflowService WorkflowServiceInterface
	hub             *websocket.Hub
	notifService    *NotificationService
}

func NewTaskService(repo repositories.TaskRepository, projectRepo repositories.ProjectRepository, userRepo repositories.UserRepository, workflowService WorkflowServiceInterface, hub *websocket.Hub, notifService *NotificationService) *TaskService {
	return &TaskService{
		repo:            repo,
		projectRepo:     projectRepo,
		userRepo:        userRepo,
		workflowService: workflowService,
		hub:             hub,
		notifService:    notifService,
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

func (s *TaskService) CreateTask(task *models.ProjectTask) error {
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

	s.hub.BroadcastUpdate("TASK_UPDATED", task)

	// Send notification only for tasks with status "Назначена"
	if task.Status == "Назначена" && task.ResponsibleUserID != nil {
		projectName := "неизвестном проекте"
		if project, err := s.projectRepo.FindByID(task.ProjectID); err == nil && project.Store != nil {
			projectName = "проекте " + project.Store.Name
		}
		message := "Вам назначена задача: " + task.Name + " в " + projectName
		s.notifService.SendNotification(uint(*task.ResponsibleUserID), "Новая задача", message, "TASK_ASSIGNED", "")
	}

	return nil
}

func (s *TaskService) UpdateTask(task *models.ProjectTask) error {
	now := time.Now().UTC()
	task.UpdatedAt = &now
	if err := s.repo.Update(task); err != nil {
		return err
	}
	s.hub.BroadcastUpdate("TASK_UPDATED", task)
	return nil
}

func (s *TaskService) UpdateStatus(id uint, status string) error {
	task, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	task.Status = status
	task.UpdatedAt = &now

	if status == "Завершена" {
		if err := s.workflowService.ValidateTaskCompletion(*task); err != nil {
			return err
		}
		task.ActualDate = &now
	}

	if err := s.repo.Update(task); err != nil {
		return err
	}

	s.hub.BroadcastUpdate("TASK_UPDATED", task)

	// Notify responsible user only when task status becomes "Назначена"
	if status == "Назначена" && task.ResponsibleUserID != nil {
		projectName := "неизвестном проекте"
		if project, err := s.projectRepo.FindByID(task.ProjectID); err == nil && project.Store != nil {
			projectName = "проекте " + project.Store.Name
		}
		message := "Вам назначена задача: " + task.Name + " в " + projectName
		s.notifService.SendNotification(uint(*task.ResponsibleUserID), "Новая задача", message, "TASK_ASSIGNED", "")
	}

	// Trigger workflow
	if status == "Завершена" && task.Code != nil {
		go s.workflowService.ProcessTaskCompletion(task.ProjectID, *task.Code)
	}

	return nil
}

func (s *TaskService) CleanupOldTasks() (int64, error) {
	return s.repo.DeleteOld()
}

func (s *TaskService) GetRecentTasks(limit int) ([]models.ProjectTask, error) {
	return s.repo.FindRecent(limit)
}
