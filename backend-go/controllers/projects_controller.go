package controllers

import (
	"net/http"
	"portal-razvitie/database"
	"portal-razvitie/middleware"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ProjectsController struct {
	workflowService *services.WorkflowService
}

func NewProjectsController(workflowService *services.WorkflowService) *ProjectsController {
	return &ProjectsController{
		workflowService: workflowService,
	}
}

// GetProjects возвращает список всех проектов
func (ctrl *ProjectsController) GetProjects(c *gin.Context) {
	var projects []models.Project
	if err := database.DB.Preload("Store").Find(&projects).Error; err != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось получить список проектов", err))
		return
	}
	c.JSON(http.StatusOK, projects)
}

// GetProject возвращает проект по ID
func (ctrl *ProjectsController) GetProject(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID проекта", err))
		return
	}

	var project models.Project
	if err := database.DB.Preload("Store").First(&project, id).Error; err != nil {
		c.Error(middleware.NewAppError(http.StatusNotFound, "Проект не найден", err))
		return
	}
	c.JSON(http.StatusOK, project)
}

// CreateProject создает новый проект с автогенерацией задач
func (ctrl *ProjectsController) CreateProject(c *gin.Context) {
	var project models.Project
	
	// Валидация входных данных
	if err := c.ShouldBindJSON(&project); err != nil {
		c.Error(middleware.NewAppError(http.StatusBadRequest, "Ошибка валидации данных проекта", err))
		return
	}

	// Создание проекта
	if err := database.DB.Create(&project).Error; err != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось создать проект", err))
		return
	}

	// Автогенерация задач
	_, err := ctrl.workflowService.GenerateProjectTasks(project.ID, project.CreatedAt)
	if err != nil {
		// Откатываем создание проекта при ошибке генерации задач
		database.DB.Delete(&project)
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось сгенерировать задачи для проекта", err))
		return
	}

	// Preload для возврата с данными магазина
	database.DB.Preload("Store").First(&project, project.ID)
	
	c.JSON(http.StatusCreated, project)
}

// UpdateProject обновляет существующий проект
func (ctrl *ProjectsController) UpdateProject(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID проекта", err))
		return
	}

	var project models.Project
	if err := c.ShouldBindJSON(&project); err != nil {
		c.Error(middleware.NewAppError(http.StatusBadRequest, "Ошибка валидации данных проекта", err))
		return
	}

	project.ID = uint(id)
	if err := database.DB.Save(&project).Error; err != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось обновить проект", err))
		return
	}

	c.JSON(http.StatusOK, project)
}

// UpdateProjectStatus обновляет статус проекта
func (ctrl *ProjectsController) UpdateProjectStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID проекта", err))
		return
	}

	var request struct {
		Status string `json:"status" binding:"required,oneof=Создан Аудит 'Бюджет сформирован' 'Утвержден ИК' 'Подписан договор' РСР Открыт Слетел"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный статус проекта", err))
		return
	}

	result := database.DB.Model(&models.Project{}).Where("Id = ?", id).Update("Status", request.Status)
	if result.Error != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось обновить статус проекта", result.Error))
		return
	}
	if result.RowsAffected == 0 {
		c.Error(middleware.NewAppError(http.StatusNotFound, "Проект не найден", nil))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Статус обновлен"})
}

// DeleteProject удаляет проект
func (ctrl *ProjectsController) DeleteProject(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID проекта", err))
		return
	}

	result := database.DB.Delete(&models.Project{}, id)
	if result.Error != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось удалить проект", result.Error))
		return
	}
	if result.RowsAffected == 0 {
		c.Error(middleware.NewAppError(http.StatusNotFound, "Проект не найден", nil))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Проект удален"})
}
