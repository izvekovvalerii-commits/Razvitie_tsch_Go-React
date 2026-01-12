package services

import (
	"fmt"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
)

type CommentService struct {
	repo         *repositories.CommentRepository
	taskRepo     repositories.TaskRepository
	notifService *NotificationService
}

func NewCommentService(
	repo *repositories.CommentRepository,
	taskRepo repositories.TaskRepository,
	notifService *NotificationService,
) *CommentService {
	return &CommentService{
		repo:         repo,
		taskRepo:     taskRepo,
		notifService: notifService,
	}
}

func (s *CommentService) CreateComment(taskId, userId uint, content string) (*models.TaskComment, error) {
	comment := &models.TaskComment{
		TaskID:  taskId,
		UserID:  userId,
		Content: content,
	}
	err := s.repo.Create(comment)
	if err != nil {
		return nil, err
	}

	// Notify responsible user
	task, err := s.taskRepo.FindByID(taskId)
	if err == nil && task != nil && task.ResponsibleUserID != nil {
		responsibleId := uint(*task.ResponsibleUserID)
		if responsibleId != userId {
			title := "Новый комментарий"
			message := fmt.Sprintf("К вашей задаче «%s» добавлен новый комментарий", task.Name)
			projectId := uint(task.ProjectID)
			taskIdUint := uint(taskId)
			_ = s.notifService.SendNotification(responsibleId, title, message, "COMMENT", "", &projectId, &taskIdUint)
		}
	}

	return comment, nil
}

func (s *CommentService) GetTaskComments(taskId uint) ([]models.TaskComment, error) {
	return s.repo.GetByTask(taskId)
}
