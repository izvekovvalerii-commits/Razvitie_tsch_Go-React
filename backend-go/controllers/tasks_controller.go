package controllers

import (
	"net/http"
	"portal-razvitie/database"
	"portal-razvitie/models"
	"strconv"
	"time"

	"portal-razvitie/services"

	"github.com/gin-gonic/gin"
)

type TasksController struct {
	workflowService *services.WorkflowService
}

func NewTasksController(workflowService *services.WorkflowService) *TasksController {
	return &TasksController{
		workflowService: workflowService,
	}
}

// GetAllTasks godoc
// @Summary Get all tasks
// @Description Get list of all tasks ordered by creation date
// @Tags tasks
// @Produce json
// @Success 200 {array} models.ProjectTask
// @Router /api/tasks [get]
func (tc *TasksController) GetAllTasks(c *gin.Context) {
	var tasks []models.ProjectTask

	if err := database.DB.Order("\"CreatedAt\" DESC").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// GetProjectTasks godoc
// @Summary Get tasks by project ID
// @Description Get all tasks for a specific project
// @Tags tasks
// @Produce json
// @Param projectId path int true "Project ID"
// @Success 200 {array} models.ProjectTask
// @Router /api/tasks/project/{projectId} [get]
func (tc *TasksController) GetProjectTasks(c *gin.Context) {
	projectId, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var tasks []models.ProjectTask
	if err := database.DB.
		Where("\"ProjectId\" = ?", projectId).
		Order("\"NormativeDeadline\" ASC").
		Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// CreateTask godoc
// @Summary Create a new task
// @Description Create a new project task
// @Tags tasks
// @Accept json
// @Produce json
// @Param task body models.ProjectTask true "Task object"
// @Success 201 {object} models.ProjectTask
// @Failure 400 {object} map[string]string
// @Router /api/tasks [post]
func (tc *TasksController) CreateTask(c *gin.Context) {
	var task models.ProjectTask

	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now().UTC()
	task.CreatedAt = &now

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

// UpdateTask godoc
// @Summary Update a task
// @Description Update an existing task
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path int true "Task ID"
// @Param task body models.ProjectTask true "Task object"
// @Success 204
// @Failure 400 {object} map[string]string
// @Router /api/tasks/{id} [put]
func (tc *TasksController) UpdateTask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var task models.ProjectTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if uint(id) != task.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID mismatch"})
		return
	}

	now := time.Now().UTC()
	task.UpdatedAt = &now

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// UpdateTaskStatus godoc
// @Summary Update task status
// @Description Update the status of a task, sets ActualDate if completed
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path int true "Task ID"
// @Param status body string true "New status"
// @Success 204
// @Failure 404 {object} map[string]string
// @Router /api/tasks/{id}/status [patch]
func (tc *TasksController) UpdateTaskStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var statusUpdate struct {
		Status string `json:"status"`
	}

	if err := c.ShouldBindJSON(&statusUpdate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var task models.ProjectTask
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	now := time.Now().UTC()
	task.Status = statusUpdate.Status
	task.UpdatedAt = &now

	if statusUpdate.Status == "Завершена" {
		if err := tc.workflowService.ValidateTaskCompletion(task); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		task.ActualDate = &now
	}

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// --- WORKFLOW TRIGGER ---
	if statusUpdate.Status == "Завершена" && task.Code != nil {
		go tc.workflowService.ProcessTaskCompletion(task.ProjectID, *task.Code)
	}

	c.Status(http.StatusNoContent)
}

// CleanupOldTasks godoc
// @Summary Cleanup old tasks
// @Description Delete tasks without ResponsibleUserId
// @Tags tasks
// @Success 200 {object} map[string]interface{}
// @Router /api/tasks/cleanup-old [delete]
func (tc *TasksController) CleanupOldTasks(c *gin.Context) {
	result := database.DB.Where("responsible_user_id IS NULL").Delete(&models.ProjectTask{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Удалено старых задач без ResponsibleUserId: " + strconv.FormatInt(result.RowsAffected, 10),
		"deletedCount": result.RowsAffected,
	})
}

// DebugAssignments godoc
// @Summary Debug task assignments
// @Description Get recent tasks with assignment info for debugging
// @Tags tasks
// @Success 200 {array} map[string]interface{}
// @Router /api/tasks/debug-assignments [get]
func (tc *TasksController) DebugAssignments(c *gin.Context) {
	var tasks []models.ProjectTask

	if err := database.DB.
		Order("id DESC").
		Limit(10).
		Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Transform to simplified output
	result := make([]map[string]interface{}, len(tasks))
	for i, task := range tasks {
		result[i] = map[string]interface{}{
			"id":                task.ID,
			"name":              task.Name,
			"responsible":       task.Responsible,
			"responsibleUserId": task.ResponsibleUserID,
			"createdAt":         task.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, result)
}

// GetWorkflowSchema godoc
// @Summary Get workflow schema definition
// @Description Get the static BPMN process definition
// @Tags workflow
// @Success 200 {array} services.TaskDefinition
// @Router /api/workflow/schema [get]
func (tc *TasksController) GetWorkflowSchema(c *gin.Context) {
	c.JSON(http.StatusOK, services.StoreOpeningTasks)
}
