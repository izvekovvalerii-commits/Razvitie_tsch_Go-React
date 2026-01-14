package controllers

import (
	"net/http"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProjectTemplateController struct {
	service *services.ProjectTemplateService
	db      *gorm.DB
}

func NewProjectTemplateController(service *services.ProjectTemplateService, db *gorm.DB) *ProjectTemplateController {
	return &ProjectTemplateController{service: service, db: db}
}

// AddTask добавляет существующую TaskDefinition в шаблон
func (c *ProjectTemplateController) AddTask(ctx *gin.Context) {
	templateID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid template ID"})
		return
	}

	var req struct {
		TaskDefinitionID uint `json:"taskDefinitionId" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Получить TaskDefinition из базы
	var taskDef models.TaskDefinition
	if err := c.db.First(&taskDef, req.TaskDefinitionID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "task definition not found"})
		return
	}

	task, err := c.service.AddTaskFromDefinition(uint(templateID), &taskDef)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, task)
}

// GetAll возвращает все шаблоны
func (c *ProjectTemplateController) GetAll(ctx *gin.Context) {
	templates, err := c.service.GetAll()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, templates)
}

// GetActive возвращает только активные шаблоны
func (c *ProjectTemplateController) GetActive(ctx *gin.Context) {
	templates, err := c.service.GetActive()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, templates)
}

// GetByID возвращает шаблон по ID
func (c *ProjectTemplateController) GetByID(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	template, err := c.service.GetByID(uint(id))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}

	ctx.JSON(http.StatusOK, template)
}

// GetDefault возвращает шаблон по умолчанию
func (c *ProjectTemplateController) GetDefault(ctx *gin.Context) {
	template, err := c.service.GetDefault()
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "default template not found"})
		return
	}
	ctx.JSON(http.StatusOK, template)
}

// Create создает новый шаблон
func (c *ProjectTemplateController) Create(ctx *gin.Context) {
	var template models.ProjectTemplate
	if err := ctx.ShouldBindJSON(&template); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.service.Create(&template); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, template)
}

// Update обновляет шаблон
func (c *ProjectTemplateController) Update(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	var template models.ProjectTemplate
	if err := ctx.ShouldBindJSON(&template); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template.ID = uint(id)

	if err := c.service.Update(&template); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, template)
}

// Delete удаляет шаблон
func (c *ProjectTemplateController) Delete(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	if err := c.service.Delete(uint(id)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "template deleted successfully"})
}

// SetDefault устанавливает шаблон по умолчанию
func (c *ProjectTemplateController) SetDefault(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	if err := c.service.SetDefault(uint(id)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "default template updated"})
}

// Clone клонирует шаблон
func (c *ProjectTemplateController) Clone(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clone, err := c.service.Clone(uint(id), req.Name)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, clone)
}

// UpdateTask обновляет задачу в шаблоне
func (c *ProjectTemplateController) UpdateTask(ctx *gin.Context) {
	templateID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid template ID"})
		return
	}

	taskID, err := strconv.ParseUint(ctx.Param("taskId"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	var task models.TemplateTask
	if err := ctx.ShouldBindJSON(&task); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.service.UpdateTask(uint(templateID), uint(taskID), &task); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "task updated successfully"})
}

// DeleteTask удаляет задачу из шаблона
func (c *ProjectTemplateController) DeleteTask(ctx *gin.Context) {
	templateID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid template ID"})
		return
	}

	taskID, err := strconv.ParseUint(ctx.Param("taskId"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	if err := c.service.DeleteTask(uint(templateID), uint(taskID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "task deleted successfully"})
}

// AddCustomTask добавляет новую кастомную задачу в шаблон
func (c *ProjectTemplateController) AddCustomTask(ctx *gin.Context) {
	templateID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid template ID"})
		return
	}

	var task models.TemplateTask
	if err := ctx.ShouldBindJSON(&task); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createdTask, err := c.service.AddCustomTask(uint(templateID), &task)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, createdTask)
}

// GetKnownTasks returns a list of unique tasks definitions from existing project templates
func (c *ProjectTemplateController) GetKnownTasks(ctx *gin.Context) {
	type KnownTask struct {
		Code            string `json:"code"`
		Name            string `json:"name"`
		Duration        int    `json:"duration"`
		Stage           string `json:"stage"`
		ResponsibleRole string `json:"responsibleRole"`
		TaskType        string `json:"taskType"`
		TaskTemplateID  *uint  `json:"taskTemplateId"`
	}

	var tasks []KnownTask
	// Select distinct tasks by name, prioritizing most recent ones
	err := c.db.Raw(`
		SELECT DISTINCT ON ("Name") 
			"Code", "Name", "Duration", "Stage", "ResponsibleRole", "TaskType", "TaskTemplateID"
		FROM "TemplateTask"
		ORDER BY "Name", "CreatedAt" DESC
	`).Scan(&tasks).Error

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch known tasks: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, tasks)
}
