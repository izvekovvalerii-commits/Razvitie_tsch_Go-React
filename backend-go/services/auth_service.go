package services

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type AuthService struct {
	db *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{db: db}
}

func (s *AuthService) Login(login string) (*models.User, []string, error) {
	var user models.User
	if err := s.db.Where("login = ?", login).First(&user).Error; err != nil {
		return nil, nil, err
	}

	perms, err := s.getRolePermissions(user.Role)
	if err != nil {
		return &user, []string{}, nil // Ignore role error, return user
	}

	return &user, perms, nil
}

func (s *AuthService) GetAllUsersWithPerms() ([]struct {
	User        models.User
	Permissions []string
}, error) {
	var users []models.User
	if err := s.db.Find(&users).Error; err != nil {
		return nil, err
	}

	var result []struct {
		User        models.User
		Permissions []string
	}

	for _, u := range users {
		perms, _ := s.getRolePermissions(u.Role)
		result = append(result, struct {
			User        models.User
			Permissions []string
		}{User: u, Permissions: perms})
	}

	return result, nil
}

func (s *AuthService) GetUserByIdWithPerms(id int) (*models.User, []string, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, nil, err
	}

	perms, err := s.getRolePermissions(user.Role)
	// If permissions fetch fails, we still return user but empty perms? Or log warning?
	// For now, consistent with Login behaviour.
	if err != nil {
		return &user, []string{}, nil
	}

	return &user, perms, nil
}

func (s *AuthService) getRolePermissions(roleCode string) ([]string, error) {
	var role models.Role
	if err := s.db.Preload("Permissions").Where(&models.Role{Code: roleCode}).First(&role).Error; err != nil {
		return nil, err
	}

	var perms []string
	for _, p := range role.Permissions {
		perms = append(perms, p.Code)
	}
	return perms, nil
}
