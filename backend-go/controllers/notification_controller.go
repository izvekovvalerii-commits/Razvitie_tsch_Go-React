package controllers

import (
	"net/http"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type NotificationController struct {
	notifService *services.NotificationService
}

func NewNotificationController(s *services.NotificationService) *NotificationController {
	return &NotificationController{notifService: s}
}

// GetNotifications godoc
// @Router /api/notifications [get]
func (nc *NotificationController) GetNotifications(c *gin.Context) {
	// Temporary: get user Id from query. Should be from Auth Context.
	userIdStr := c.Query("userId")
	if userIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId query param required"})
		return
	}
	userID, _ := strconv.Atoi(userIdStr)

	notifications, err := nc.notifService.GetUserNotifications(uint(userID), 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	count, _ := nc.notifService.GetUnreadCount(uint(userID))

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"unreadCount":   count,
	})
}

// MarkRead godoc
// @Router /api/notifications/{id}/read [post]
func (nc *NotificationController) MarkRead(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := nc.notifService.MarkAsRead(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}

// MarkAllRead godoc
// @Router /api/notifications/read-all [post]
func (nc *NotificationController) MarkAllRead(c *gin.Context) {
	userIdStr := c.Query("userId")
	if userIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId query param required"})
		return
	}
	userID, _ := strconv.Atoi(userIdStr)

	if err := nc.notifService.MarkAllAsRead(uint(userID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}

// Delete godoc
// @Router /api/notifications/{id} [delete]
func (nc *NotificationController) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := nc.notifService.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}

// DeleteAll godoc
// @Router /api/notifications/delete-all [delete]
func (nc *NotificationController) DeleteAll(c *gin.Context) {
	userIdStr := c.Query("userId")
	if userIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId query param required"})
		return
	}
	userID, _ := strconv.Atoi(userIdStr)

	if err := nc.notifService.DeleteAll(uint(userID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}
