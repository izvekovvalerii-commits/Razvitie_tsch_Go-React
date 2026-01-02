package controllers

import (
	"net/http"
	"portal-razvitie/cache"
	"portal-razvitie/database"
	"portal-razvitie/models"

	"github.com/gin-gonic/gin"
)

type RBACController struct{}

func NewRBACController() *RBACController {
	return &RBACController{}
}

// GetRoles returns all roles with their permissions
func (ctrl *RBACController) GetRoles(c *gin.Context) {
	var roles []models.Role
	if err := database.DB.Preload("Permissions").Order("\"ID\" asc").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, roles)
}

// GetPermissions returns all available system permissions
func (ctrl *RBACController) GetPermissions(c *gin.Context) {
	var perms []models.Permission
	if err := database.DB.Order("\"Code\" asc").Find(&perms).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, perms)
}

// CreateRole creates a new role
func (ctrl *RBACController) CreateRole(c *gin.Context) {
	var body struct {
		Code string `json:"code" binding:"required"`
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	role := models.Role{
		Code: body.Code,
		Name: body.Name,
	}

	if err := database.DB.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, role)
}

// UpdateRolePermissions updates the permission set for a role
func (ctrl *RBACController) UpdateRolePermissions(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		PermissionCodes []string `json:"permissionCodes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var role models.Role
	if err := database.DB.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	var perms []models.Permission
	if len(body.PermissionCodes) > 0 {
		if err := database.DB.Where("\"Code\" IN ?", body.PermissionCodes).Find(&perms).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Update association
	if err := database.DB.Model(&role).Association("Permissions").Replace(perms); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update permissions"})
		return
	}

	// Инвалидируем кэш для этой роли
	cache.GetCache().Invalidate(role.Code)

	// Return updated role
	database.DB.Preload("Permissions").First(&role, role.ID)
	c.JSON(http.StatusOK, role)
}
