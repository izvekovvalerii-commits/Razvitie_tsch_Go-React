package repositories

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type UserRepository interface {
	FindByRole(role string) ([]models.User, error)
	FindByName(name string) (*models.User, error)
	FindAll() ([]models.User, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindByRole(role string) ([]models.User, error) {
	var users []models.User
	err := r.db.Where("\"Role\" = ?", role).Find(&users).Error
	return users, err
}

func (r *userRepository) FindByName(name string) (*models.User, error) {
	var user models.User
	err := r.db.Where("\"Name\" = ?", name).First(&user).Error
	return &user, err
}

func (r *userRepository) FindAll() ([]models.User, error) {
	var users []models.User
	err := r.db.Find(&users).Error
	return users, err
}
