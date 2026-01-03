package services

import (
	"fmt"
	"portal-razvitie/events"
	"portal-razvitie/models"
	"portal-razvitie/repositories"

	"gorm.io/gorm"
)

type ProjectService struct {
	repo            repositories.ProjectRepository
	workflowService WorkflowServiceInterface
	db              *gorm.DB
	eventBus        events.EventBus
}

func NewProjectService(repo repositories.ProjectRepository, workflowService WorkflowServiceInterface, db *gorm.DB, eventBus events.EventBus) *ProjectService {
	return &ProjectService{
		repo:            repo,
		workflowService: workflowService,
		db:              db,
		eventBus:        eventBus,
	}
}

func (s *ProjectService) CreateProject(project *models.Project, actorId uint) error {
	var createdTasks []models.ProjectTask

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Use repository with transaction
		if err := s.repo.CreateWithTx(tx, project); err != nil {
			return err
		}

		// Generate tasks within the same transaction
		tasks, err := s.workflowService.GenerateProjectTasksWithTx(tx, project.ID, project.CreatedAt)
		if err != nil {
			return err
		}
		createdTasks = tasks

		return nil
	})

	if err == nil {
		s.eventBus.Publish(events.ProjectCreatedEvent{
			Project: project,
			ActorID: actorId,
		})

		// Notify about tasks only if tasks were created
		if len(createdTasks) > 0 {
			s.eventBus.Publish(events.ProjectTasksGeneratedEvent{
				Tasks:     createdTasks,
				ProjectID: project.ID,
				ActorID:   actorId,
			})
		}
	}

	return err
}

func (s *ProjectService) FindAll() ([]models.Project, error) {
	return s.repo.FindAll()
}

func (s *ProjectService) FindByID(id uint) (*models.Project, error) {
	return s.repo.FindByID(id)
}

func (s *ProjectService) Update(project *models.Project, actorId uint) error {
	if err := s.repo.Update(project); err != nil {
		return err
	}
	s.eventBus.Publish(events.ProjectUpdatedEvent{
		Project: project,
		ActorID: actorId,
	})
	return nil
}

func (s *ProjectService) UpdateStatus(id uint, status string, actorId uint) error {
	name := fmt.Sprintf("Проект #%d", id)
	// Try to find project first to get existing status and name
	p, err := s.repo.FindByID(id)
	oldStatus := ""
	if err == nil {
		oldStatus = p.Status
		if p.Store != nil {
			name = p.Store.Name
		}
	}

	if err := s.repo.UpdateStatus(id, status); err != nil {
		return err
	}

	s.eventBus.Publish(events.ProjectStatusChangedEvent{
		ProjectID:   id,
		ProjectName: name,
		OldStatus:   oldStatus,
		NewStatus:   status,
		ActorID:     actorId,
	})
	return nil
}

func (s *ProjectService) Delete(id uint, actorId uint) error {
	project, err := s.repo.FindByID(id)
	name := fmt.Sprintf("Проект #%d", id)
	if err == nil {
		if project.Store != nil {
			name = project.Store.Name
		}
		// Publish event BEFORE deletion because repository might use soft delete or hard delete
		s.eventBus.Publish(events.ProjectDeletedEvent{
			ProjectID:   id,
			ProjectName: name,
			ActorID:     actorId,
		})
	}
	return s.repo.Delete(id)
}
