package controllers

import (
	"net/http"
	"portal-razvitie/database"
	"portal-razvitie/models"

	"github.com/gin-gonic/gin"
)

type AuthController struct{}

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

	var user models.User
	if err := database.DB.Where("login = ?", body.Login).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Fetch permissions from DB
	var role models.Role
	var perms []string
	if err := database.DB.Preload("Permissions").Where(&models.Role{Code: user.Role}).First(&role).Error; err == nil {
		for _, p := range role.Permissions {
			perms = append(perms, p.Code)
		}
	}

	c.JSON(http.StatusOK, UserWithPerms{User: user, Permissions: perms})
}

// GetUsers returns all available users (for the demo switcher)
func (ctrl *AuthController) GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Map to UserWithPerms
	var response []UserWithPerms
	for _, u := range users {
		var role models.Role
		var perms []string

		if err := database.DB.Preload("Permissions").Where(&models.Role{Code: u.Role}).First(&role).Error; err == nil {
			for _, p := range role.Permissions {
				perms = append(perms, p.Code)
			}
		} else {
			// Fallback (e.g. if code admin has no role yet)
			perms = []string{}
		}

		response = append(response, UserWithPerms{User: u, Permissions: perms})
	}

	c.JSON(http.StatusOK, response)
}
