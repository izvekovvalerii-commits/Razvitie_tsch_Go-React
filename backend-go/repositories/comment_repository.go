package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type CommentRepository struct {
	DB *gorm.DB
}

func NewCommentRepository(db *gorm.DB) *CommentRepository {
	return &CommentRepository{DB: db}
}

func (r *CommentRepository) Create(comment *models.TaskComment) error {
	return r.DB.Create(comment).Error
}

func (r *CommentRepository) GetByTask(taskId uint) ([]models.TaskComment, error) {
	var comments []models.TaskComment
	err := r.DB.Model(&models.TaskComment{}).
		Preload("User").
		Where("\"TaskId\" = ?", taskId).
		Order("\"CreatedAt\" desc").
		Find(&comments).Error
	return comments, err
}
