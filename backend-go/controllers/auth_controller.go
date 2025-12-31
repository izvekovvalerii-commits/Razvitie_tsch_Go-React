package controllers

import (
	"net/http"
	"portal-razvitie/database"
	"portal-razvitie/models"

	"github.com/gin-gonic/gin"
)

type AuthController struct{}

// Login simulates a login by returning the user matching the login param
// In a real app, this would check passwords and return a JWT
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

	c.JSON(http.StatusOK, user)
}

// GetUsers returns all available users (for the demo switcher)
func (ctrl *AuthController) GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}
