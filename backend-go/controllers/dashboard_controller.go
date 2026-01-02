package controllers

import (
	"net/http"
	"portal-razvitie/services"

	"github.com/gin-gonic/gin"
)

type DashboardController struct {
	activityService *services.ActivityService
	taskService     *services.TaskService
	projectService  *services.ProjectService
}

func NewDashboardController(activityService *services.ActivityService, taskService *services.TaskService, projectService *services.ProjectService) *DashboardController {
	return &DashboardController{
		activityService: activityService,
		taskService:     taskService,
		projectService:  projectService,
	}
}

// GetRecentActivity godoc
// @Summary Get recent user activities
// @Router /api/dashboard/activity [get]
func (dc *DashboardController) GetRecentActivity(c *gin.Context) {
	activities, err := dc.activityService.GetRecentActivities(20)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, activities)
}
