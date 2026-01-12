package controllers

import (
	"net/http"
	"portal-razvitie/middleware"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TaskTemplateController struct {
	service *services.TaskTemplateService
}

func NewTaskTemplateController(service *services.TaskTemplateService) *TaskTemplateController {
	return &TaskTemplateController{service: service}
}

// GetAllTemplates возвращает все шаблоны
// @Summary Get all task templates
// @Tags task-templates
// @Produce json
// @Success 200 {array} models.TaskTemplate
// @Router /api/task-templates [get]
func (c *TaskTemplateController) GetAllTemplates(ctx *gin.Context) {
	templates, err := c.service.GetAllTemplates()
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось получить шаблоны", err))
		return
	}
	ctx.JSON(http.StatusOK, templates)
}

// GetActiveTemplates возвращает только активные шаблоны
// @Summary Get active task templates
// @Tags task-templates
// @Produce json
// @Success 200 {array} models.TaskTemplate
// @Router /api/task-templates/active [get]
func (c *TaskTemplateController) GetActiveTemplates(ctx *gin.Context) {
	templates, err := c.service.GetActiveTemplates()
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось получить активные шаблоны", err))
		return
	}
	ctx.JSON(http.StatusOK, templates)
}

// GetTemplateByID возвращает шаблон по ID
// @Summary Get task template by ID
// @Tags task-templates
// @Produce json
// @Param id path int true "Template ID"
// @Success 200 {object} models.TaskTemplate
// @Router /api/task-templates/{id} [get]
func (c *TaskTemplateController) GetTemplateByID(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID шаблона", err))
		return
	}

	template, err := c.service.GetTemplateByID(uint(id))
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusNotFound, "Шаблон не найден", err))
		return
	}

	ctx.JSON(http.StatusOK, template)
}

// GetTemplatesByCategory возвращает шаблоны по категории
// @Summary Get task templates by category
// @Tags task-templates
// @Produce json
// @Param category query string true "Category name"
// @Success 200 {array} models.TaskTemplate
// @Router /api/task-templates/category [get]
func (c *TaskTemplateController) GetTemplatesByCategory(ctx *gin.Context) {
	category := ctx.Query("category")
	if category == "" {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Категория не указана", nil))
		return
	}

	templates, err := c.service.GetTemplatesByCategory(category)
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось получить шаблоны", err))
		return
	}

	ctx.JSON(http.StatusOK, templates)
}

// CreateTemplate создает новый шаблон
// @Summary Create new task template
// @Tags task-templates
// @Accept json
// @Produce json
// @Param template body models.TaskTemplate true "Template data"
// @Success 201 {object} models.TaskTemplate
// @Router /api/task-templates [post]
func (c *TaskTemplateController) CreateTemplate(ctx *gin.Context) {
	var template models.TaskTemplate
	if err := ctx.ShouldBindJSON(&template); err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный формат данных", err))
		return
	}

	if err := c.service.CreateTemplate(&template); err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, err.Error(), err))
		return
	}

	ctx.JSON(http.StatusCreated, template)
}

// UpdateTemplate обновляет существующий шаблон
// @Summary Update task template
// @Tags task-templates
// @Accept json
// @Produce json
// @Param id path int true "Template ID"
// @Param template body models.TaskTemplate true "Template data"
// @Success 200 {object} models.TaskTemplate
// @Router /api/task-templates/{id} [put]
func (c *TaskTemplateController) UpdateTemplate(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID шаблона", err))
		return
	}

	var template models.TaskTemplate
	if err := ctx.ShouldBindJSON(&template); err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный формат данных", err))
		return
	}

	template.ID = uint(id)

	if err := c.service.UpdateTemplate(&template); err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, err.Error(), err))
		return
	}

	ctx.JSON(http.StatusOK, template)
}

// DeleteTemplate удаляет шаблон
// @Summary Delete task template
// @Tags task-templates
// @Param id path int true "Template ID"
// @Success 204
// @Router /api/task-templates/{id} [delete]
func (c *TaskTemplateController) DeleteTemplate(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID шаблона", err))
		return
	}

	if err := c.service.DeleteTemplate(uint(id)); err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, err.Error(), err))
		return
	}

	ctx.Status(http.StatusNoContent)
}

// CloneTemplate создает копию шаблона
// @Summary Clone task template
// @Tags task-templates
// @Accept json
// @Produce json
// @Param id path int true "Source template ID"
// @Param data body object true "Clone data (newCode, newName)"
// @Success 201 {object} models.TaskTemplate
// @Router /api/task-templates/{id}/clone [post]
func (c *TaskTemplateController) CloneTemplate(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID шаблона", err))
		return
	}

	var data struct {
		NewCode string `json:"newCode" binding:"required"`
		NewName string `json:"newName" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&data); err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный формат данных", err))
		return
	}

	clone, err := c.service.CloneTemplate(uint(id), data.NewCode, data.NewName)
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, err.Error(), err))
		return
	}

	ctx.JSON(http.StatusCreated, clone)
}

// ToggleTemplateStatus активирует/деактивирует шаблон
// @Summary Toggle template active status
// @Tags task-templates
// @Param id path int true "Template ID"
// @Success 200
// @Router /api/task-templates/{id}/toggle [patch]
func (c *TaskTemplateController) ToggleTemplateStatus(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID шаблона", err))
		return
	}

	if err := c.service.ToggleTemplateStatus(uint(id)); err != nil {
		ctx.Error(middleware.NewAppError(http.StatusBadRequest, err.Error(), err))
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Статус шаблона изменен"})
}
