package controllers

import (
	"net/http"
	"portal-razvitie/models"
	"portal-razvitie/services"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	authService *services.AuthService
}

func NewAuthController(authService *services.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

type UserWithPerms struct {
	models.User
	Permissions []string `json:"permissions"`
}

// Login simulates a login by returning the user matching the login param
func (ctrl *AuthController) Login(c *gin.Context) {
	var body struct {
		Login string `json:"login" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, perms, err := ctrl.authService.Login(body.Login)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, UserWithPerms{User: *user, Permissions: perms})
}

// GetUsers returns all available users (for the demo switcher)
func (ctrl *AuthController) GetUsers(c *gin.Context) {
	usersWithPerms, err := ctrl.authService.GetAllUsersWithPerms()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Map generic struct to response struct (explicit mapping for clarity)
	var response []UserWithPerms
	for _, up := range usersWithPerms {
		response = append(response, UserWithPerms{User: up.User, Permissions: up.Permissions})
	}

	c.JSON(http.StatusOK, response)
}
