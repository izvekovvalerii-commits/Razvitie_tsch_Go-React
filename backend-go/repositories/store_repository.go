package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type StoreRepository interface {
	FindAll() ([]models.Store, error)
	FindByID(id uint) (*models.Store, error)
	Create(store *models.Store) error
	Update(store *models.Store) error
	Delete(id uint) error
}

type storeRepository struct {
	db *gorm.DB
}

func NewStoreRepository(db *gorm.DB) StoreRepository {
	return &storeRepository{db: db}
}

func (r *storeRepository) FindAll() ([]models.Store, error) {
	var stores []models.Store
	err := r.db.Find(&stores).Error
	return stores, err
}

func (r *storeRepository) FindByID(id uint) (*models.Store, error) {
	var store models.Store
	err := r.db.First(&store, id).Error
	return &store, err
}

func (r *storeRepository) Create(store *models.Store) error {
	return r.db.Create(store).Error
}

func (r *storeRepository) Update(store *models.Store) error {
	return r.db.Save(store).Error
}

func (r *storeRepository) Delete(id uint) error {
	result := r.db.Delete(&models.Store{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
