package services

import (
	"fmt"
	"portal-razvitie/models"
	"portal-razvitie/repositories"

	"gorm.io/gorm"
)

type ProjectService struct {
	repo            repositories.ProjectRepository
	workflowService WorkflowServiceInterface
	db              *gorm.DB
	notifService    *NotificationService
}

func NewProjectService(repo repositories.ProjectRepository, workflowService WorkflowServiceInterface, db *gorm.DB, notifService *NotificationService) *ProjectService {
	return &ProjectService{
		repo:            repo,
		workflowService: workflowService,
		db:              db,
		notifService:    notifService,
	}
}

func (s *ProjectService) CreateProject(project *models.Project) error {
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
		for _, task := range createdTasks {
			// Отправляем уведомление только для задач со статусом "Назначена"
			if task.Status == "Назначена" && task.ResponsibleUserID != nil {
				// Получаем название проекта через Store
				projectName := "неизвестном проекте"
				if loadedProject, err := s.repo.FindByID(project.ID); err == nil && loadedProject.Store != nil {
					projectName = "проекте " + loadedProject.Store.Name
				}
				message := "Вам назначена задача: " + task.Name + " в " + projectName
				s.notifService.SendNotification(uint(*task.ResponsibleUserID), "Новая задача", message, "TASK_ASSIGNED", fmt.Sprintf("/projects/%d", project.ID))
			}
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

func (s *ProjectService) Update(project *models.Project) error {
	return s.repo.Update(project)
}

func (s *ProjectService) UpdateStatus(id uint, status string) error {
	return s.repo.UpdateStatus(id, status)
}

func (s *ProjectService) Delete(id uint) error {
	return s.repo.Delete(id)
}
