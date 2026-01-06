package services

import (
	"portal-razvitie/cache"
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type RBACService struct {
	db    *gorm.DB
	cache *cache.PermissionCache // Dependency injection for cache ideally, but currently assumes global or passed instance
}

func NewRBACService(db *gorm.DB) *RBACService {
	return &RBACService{
		db: db,
		// Assuming we might inject cache later, but for now logic uses the global one or we can wrap it.
		// Let's use the global one inside methods for now to minimize changes, or better:
		// We can assign the global instance here if we want to mock it later.
		cache: cache.GetCache(),
	}
}

func (s *RBACService) GetAllRoles() ([]models.Role, error) {
	var roles []models.Role
	if err := s.db.Preload("Permissions").Order("\"ID\" asc").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

func (s *RBACService) GetAllPermissions() ([]models.Permission, error) {
	var perms []models.Permission
	if err := s.db.Order("\"Code\" asc").Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

func (s *RBACService) CreateRole(code, name string) (*models.Role, error) {
	role := models.Role{
		Code: code,
		Name: name,
	}
	if err := s.db.Create(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (s *RBACService) UpdateRolePermissions(roleID string, permissionCodes []string) (*models.Role, error) {
	var role models.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		return nil, err
	}

	var perms []models.Permission
	if len(permissionCodes) > 0 {
		if err := s.db.Where("\"Code\" IN ?", permissionCodes).Find(&perms).Error; err != nil {
			return nil, err
		}
	}

	if err := s.db.Model(&role).Association("Permissions").Replace(perms); err != nil {
		return nil, err
	}

	// Invalidate cache
	s.cache.Invalidate(role.Code)

	// Return updated role
	if err := s.db.Preload("Permissions").First(&role, role.ID).Error; err != nil {
		return nil, err
	}
	return &role, nil
}
