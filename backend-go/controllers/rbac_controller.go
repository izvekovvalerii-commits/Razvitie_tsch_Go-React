package controllers

import (
	"net/http"
	"portal-razvitie/services"

	"github.com/gin-gonic/gin"
)

type RBACController struct {
	rbacService *services.RBACService
}

func NewRBACController(rbacService *services.RBACService) *RBACController {
	return &RBACController{rbacService: rbacService}
}

// GetRoles returns all roles with their permissions
func (ctrl *RBACController) GetRoles(c *gin.Context) {
	roles, err := ctrl.rbacService.GetAllRoles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, roles)
}

// GetPermissions returns all available system permissions
func (ctrl *RBACController) GetPermissions(c *gin.Context) {
	perms, err := ctrl.rbacService.GetAllPermissions()
	if err != nil {
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

	role, err := ctrl.rbacService.CreateRole(body.Code, body.Name)
	if err != nil {
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

	updatedRole, err := ctrl.rbacService.UpdateRolePermissions(id, body.PermissionCodes)
	if err != nil {
		// Simple error check, could be more specific (e.g. 404)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedRole)
}
