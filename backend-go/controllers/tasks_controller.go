package controllers

import (
	"net/http"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TasksController struct {
	taskService     *services.TaskService
	activityService *services.ActivityService
}

func NewTasksController(taskService *services.TaskService, activityService *services.ActivityService) *TasksController {
	return &TasksController{
		taskService:     taskService,
		activityService: activityService,
	}
}

// GetHistory godoc
// @Summary Get task history
// @Router /api/tasks/{id}/history [get]
func (tc *TasksController) GetHistory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	history, err := tc.activityService.GetTaskHistory(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}

// GetAllTasks godoc
// @Summary Get all tasks (filtered by user role)
// @Produce json
// @Router /api/tasks [get]
func (tc *TasksController) GetAllTasks(c *gin.Context) {
	// Get current user from context (set by AuthMiddleware)
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user := userInterface.(*models.User)

	var tasks []models.ProjectTask
	var err error

	// Admin and БА see all tasks
	if user.Role == "admin" || user.Role == "БА" {
		tasks, err = tc.taskService.GetAllTasks()
	} else {
		// Other roles see only their assigned tasks
		tasks, err = tc.taskService.GetTasksByResponsibleUser(user.ID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// GetProjectTasks godoc
// @Summary Get tasks by project ID
// @Router /api/tasks/project/{projectId} [get]
func (tc *TasksController) GetProjectTasks(c *gin.Context) {
	projectId, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	tasks, err := tc.taskService.GetProjectTasks(uint(projectId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// CreateTask godoc
// @Summary Create a new task
// @Router /api/tasks [post]
func (tc *TasksController) CreateTask(c *gin.Context) {
	var task models.ProjectTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*models.User)
	if err := tc.taskService.CreateTask(&task, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

// UpdateTask godoc
// @Summary Update a task
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

	user := c.MustGet("user").(*models.User)
	if err := tc.taskService.UpdateTask(&task, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// UpdateTaskStatus godoc
// @Summary Update task status
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

	user := c.MustGet("user").(*models.User)
	if err := tc.taskService.UpdateStatus(uint(id), statusUpdate.Status, user.ID); err != nil {
		// Could distinguish between validation errors and internal errors
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// CleanupOldTasks godoc
// @Summary Cleanup old tasks
// @Router /api/tasks/cleanup-old [delete]
func (tc *TasksController) CleanupOldTasks(c *gin.Context) {
	count, err := tc.taskService.CleanupOldTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Удалено старых задач без ResponsibleUserId: " + strconv.FormatInt(count, 10),
		"deletedCount": count,
	})
}

// DeleteTask godoc
// @Summary Delete a task
// @Router /api/tasks/{id} [delete]
func (tc *TasksController) DeleteTask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	user := c.MustGet("user").(*models.User)
	if err := tc.taskService.DeleteTask(uint(id), user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}

// DebugAssignments godoc
// @Summary Debug task assignments
// @Router /api/tasks/debug-assignments [get]
func (tc *TasksController) DebugAssignments(c *gin.Context) {
	tasks, err := tc.taskService.GetRecentTasks(10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

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
// @Router /api/workflow/schema [get]
func (tc *TasksController) GetWorkflowSchema(c *gin.Context) {
	defs, err := tc.taskService.GetTaskDefinitions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, defs)
}

// UpdateWorkflowDefinition godoc
// @Summary Update workflow task definition
// @Router /api/workflow/schema [put]
func (tc *TasksController) UpdateWorkflowDefinition(c *gin.Context) {
	var input models.TaskDefinition
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// We only allow updating Duration for now, maybe Name/DependsOn later if needed.
	// But let's trust the input for now or fetch existing first.
	// Ideally we fetch by Code to ensure existence.
	defs, _ := tc.taskService.GetTaskDefinitions()
	var target *models.TaskDefinition
	for i := range defs {
		if defs[i].Code == input.Code {
			target = &defs[i]
			break
		}
	}

	if target == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task definition not found"})
		return
	}

	// Update allowed fields
	target.Duration = input.Duration
	// target.Name = input.Name -- if we want to allow renaming
	// target.ResponsibleRole = input.ResponsibleRole -- etc.

	if err := tc.taskService.UpdateTaskDefinition(target); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, target)
}
