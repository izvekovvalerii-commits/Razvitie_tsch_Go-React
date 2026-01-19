package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type RequestRepository struct {
	db *gorm.DB
}

func NewRequestRepository(db *gorm.DB) *RequestRepository {
	return &RequestRepository{db: db}
}

// Create создает новую заявку
func (r *RequestRepository) Create(request *models.Request) error {
	return r.db.Create(request).Error
}

// FindByID находит заявку по ID с предзагрузкой связанных данных
func (r *RequestRepository) FindByID(id uint) (*models.Request, error) {
	var request models.Request
	err := r.db.
		Preload("CreatedByUser").
		Preload("AssignedToUser").
		Preload("Project").
		Preload("Task").
		First(&request, id).Error
	if err != nil {
		return nil, err
	}
	return &request, nil
}

// FindAll возвращает все заявки с предзагрузкой
func (r *RequestRepository) FindAll() ([]models.Request, error) {
	var requests []models.Request
	err := r.db.
		Preload("CreatedByUser").
		Preload("AssignedToUser").
		Preload("Project").
		Preload("Task").
		Order("\"CreatedAt\" DESC").
		Find(&requests).Error
	return requests, err
}

// FindByCreatedByUser возвращает заявки, созданные пользователем
func (r *RequestRepository) FindByCreatedByUser(userID uint) ([]models.Request, error) {
	var requests []models.Request
	err := r.db.
		Where("\"CreatedByUserId\" = ?", userID).
		Preload("CreatedByUser").
		Preload("AssignedToUser").
		Preload("Project").
		Preload("Task").
		Order("\"CreatedAt\" DESC").
		Find(&requests).Error
	return requests, err
}

// FindByAssignedToUser возвращает заявки, назначенные пользователю
func (r *RequestRepository) FindByAssignedToUser(userID uint) ([]models.Request, error) {
	var requests []models.Request
	err := r.db.
		Where("\"AssignedToUserId\" = ?", userID).
		Preload("CreatedByUser").
		Preload("AssignedToUser").
		Preload("Project").
		Preload("Task").
		Order("\"CreatedAt\" DESC").
		Find(&requests).Error
	return requests, err
}

// FindByStatus возвращает заявки с определенным статусом
func (r *RequestRepository) FindByStatus(status string) ([]models.Request, error) {
	var requests []models.Request
	err := r.db.
		Where("\"Status\" = ?", status).
		Preload("CreatedByUser").
		Preload("AssignedToUser").
		Preload("Project").
		Preload("Task").
		Order("\"CreatedAt\" DESC").
		Find(&requests).Error
	return requests, err
}

// Update обновляет заявку
func (r *RequestRepository) Update(request *models.Request) error {
	return r.db.Save(request).Error
}

// Delete удаляет заявку
func (r *RequestRepository) Delete(id uint) error {
	return r.db.Delete(&models.Request{}, id).Error
}

// CountByAssignedUser возвращает количество активных заявок у пользователя
func (r *RequestRepository) CountByAssignedUser(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Request{}).
		Where("\"AssignedToUserId\" = ? AND \"Status\" NOT IN (?)", userID, []string{
			string(models.RequestStatusClosed),
			string(models.RequestStatusRejected),
		}).
		Count(&count).Error
	return count, err
}

// CountOverdueByAssignedUser возвращает количество просроченных заявок у пользователя
func (r *RequestRepository) CountOverdueByAssignedUser(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Request{}).
		Where("\"AssignedToUserId\" = ? AND \"Status\" NOT IN (?) AND \"DueDate\" < NOW()", userID, []string{
			string(models.RequestStatusClosed),
			string(models.RequestStatusRejected),
		}).
		Count(&count).Error
	return count, err
}
