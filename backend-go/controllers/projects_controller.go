package controllers

import (
	"net/http"
	"portal-razvitie/middleware"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ProjectsController struct {
	projectService *services.ProjectService
}

func NewProjectsController(projectService *services.ProjectService) *ProjectsController {
	return &ProjectsController{
		projectService: projectService,
	}
}

// GetProjects возвращает список всех проектов
func (ctrl *ProjectsController) GetProjects(c *gin.Context) {
	projects, err := ctrl.projectService.FindAll()
	if err != nil {
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

	project, err := ctrl.projectService.FindByID(uint(id))
	if err != nil {
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

	// Создание проекта через сервис (с транзакцией)
	if err := ctrl.projectService.CreateProject(&project); err != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось создать проект", err))
		return
	}

	// Загружаем полный объект с данными магазина для ответа
	fullProject, err := ctrl.projectService.FindByID(project.ID)
	if err == nil {
		c.JSON(http.StatusCreated, fullProject)
	} else {
		c.JSON(http.StatusCreated, project)
	}
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
	if err := ctrl.projectService.Update(&project); err != nil {
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

	if err := ctrl.projectService.UpdateStatus(uint(id), request.Status); err != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось обновить статус проекта", err))
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

	if err := ctrl.projectService.Delete(uint(id)); err != nil {
		c.Error(middleware.NewAppError(http.StatusInternalServerError, "Не удалось удалить проект", err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Проект удален"})
}
