# Рекомендуемые исправления дублирования

## Контекст
После успешного устранения дублирования для фильтрации задач, обнаружены аналогичные проблемы в других частях системы.

---

## 🔴 КРИТИЧНО 1: Фильтрация проектов

### Проблема
Все пользователи видят все проекты, независимо от роли.

### Решение

#### 1.1. Backend: Добавить метод в репозиторий

**Файл:** `backend-go/repositories/project_repository.go`

```go
// Добавить в интерфейс ProjectRepository
FindByResponsibleUser(userId uint) ([]models.Project, error)

// Реализация
func (r *projectRepository) FindByResponsibleUser(userId uint) ([]models.Project, error) {
    var projects []models.Project
    err := r.db.Preload("Store").
        Where("responsible_user_id = ?", userId).
        Find(&projects).Error
    return projects, err
}
```

#### 1.2. Backend: Добавить метод в сервис

**Файл:** `backend-go/services/project_service.go`

```go
func (s *ProjectService) FindByResponsibleUser(userId uint) ([]models.Project, error) {
    return s.repo.FindByResponsibleUser(userId)
}
```

#### 1.3. Backend: Обновить контроллер

**Файл:** `backend-go/controllers/projects_controller.go`

```go
// GetProjects возвращает список проектов (filtered by user role)
func (ctrl *ProjectsController) GetProjects(c *gin.Context) {
    user := c.MustGet("user").(*models.User)
    
    var projects []models.Project
    var err error
    
    // Admin and БА see all projects
    if user.Role == "admin" || user.Role == "БА" {
        projects, err = ctrl.projectService.FindAll()
    } else {
        // Other roles see only their assigned projects
        projects, err = ctrl.projectService.FindByResponsibleUser(user.ID)
    }
    
    if err != nil {
        c.Error(middleware.NewAppError(
            http.StatusInternalServerError, 
            "Не удалось получить список проектов", 
            err,
        ))
        return
    }
    
    c.JSON(http.StatusOK, projects)
}
```

---

## 🔴 КРИТИЧНО 2: Access Control для документов

### Проблема
- Любой пользователь может скачать/удалить любой документ
- Нет проверки доступа к проекту документа

### Решение

#### 2.1. Добавить helper метод для проверки доступа

**Файл:** `backend-go/controllers/documents_controller.go`

```go
// Добавить в DocumentsController
type DocumentsController struct {
    config          *config.Config
    docService      *services.DocumentService
    projectService  *services.ProjectService  // ДОБАВИТЬ
}

// Helper: проверка доступа к проекту документа
func (dc *DocumentsController) hasAccessToDocument(user *models.User, doc *models.ProjectDocument) bool {
    // Admin и БА имеют доступ ко всем документам
    if user.Role == "admin" || user.Role == "БА" {
        return true
    }
    
    // Получить проект документа
    project, err := dc.projectService.FindByID(doc.ProjectID)
    if err != nil {
        return false
    }
    
    // Проверить, является ли пользователь ответственным за проект
    if project.ResponsibleUserId == int(user.ID) {
        return true
    }
    
    // Если документ привязан к задаче, проверить ответственного за задачу
    if doc.TaskID != nil {
        // TODO: добавить проверку task ownership
    }
    
    return false
}
```

#### 2.2. Download - добавить проверку доступа

```go
func (dc *DocumentsController) Download(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }

    doc, err := dc.docService.GetByID(id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
        return
    }

    // ✅ ДОБАВИТЬ: Проверка доступа
    user := c.MustGet("user").(*models.User)
    if !dc.hasAccessToDocument(user, doc) {
        c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
        return
    }

    // ... остальной код без изменений
}
```

#### 2.3. Delete - добавить проверку ownership

```go
func (dc *DocumentsController) Delete(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }

    doc, err := dc.docService.GetByID(id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
        return
    }

    // ✅ ДОБАВИТЬ: Проверка прав на удаление
    user := c.MustGet("user").(*models.User)
    if !dc.hasAccessToDocument(user, doc) {
        c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
        return
    }

    // ... остальной код без изменений
}
```

---

## 🟡 ВАЖНО 3: Ownership checks для проектов

### Проблема
UpdateProject, DeleteProject, UpdateProjectStatus не проверяют ownership.

### Решение

#### 3.1. UpdateProject

```go
func (ctrl *ProjectsController) UpdateProject(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID проекта", err))
        return
    }

    user := c.MustGet("user").(*models.User)
    
    // ✅ ДОБАВИТЬ: Ownership check (unless admin or БА)
    if user.Role != "admin" && user.Role != "БА" {
        existingProject, err := ctrl.projectService.FindByID(uint(id))
        if err != nil {
            c.Error(middleware.NewAppError(http.StatusNotFound, "Проект не найден", err))
            return
        }
        if existingProject.ResponsibleUserId != int(user.ID) {
            c.Error(middleware.NewAppError(
                http.StatusForbidden, 
                "Вы можете редактировать только свои проекты", 
                nil,
            ))
            return
        }
    }

    // ... остальной код без изменений
}
```

#### 3.2. DeleteProject

```go
func (ctrl *ProjectsController) DeleteProject(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID проекта", err))
        return
    }

    user := c.MustGet("user").(*models.User)
    
    // ✅ ДОБАВИТЬ: Ownership check
    if user.Role != "admin" && user.Role != "БА" {
        project, err := ctrl.projectService.FindByID(uint(id))
        if err != nil {
            c.Error(middleware.NewAppError(http.StatusNotFound, "Проект не найден", err))
            return
        }
        if project.ResponsibleUserId != int(user.ID) {
            c.Error(middleware.NewAppError(
                http.StatusForbidden,
                "Вы можете удалять только свои проекты",
                nil,
            ))
            return
        }
    }

    // ... остальной код без изменений
}
```

#### 3.3. UpdateProjectStatus

```go
func (ctrl *ProjectsController) UpdateProjectStatus(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный ID проекта", err))
        return
    }

    var request struct {
        Status string `json:"status" binding:"required"`
    }

    if err := c.ShouldBindJSON(&request); err != nil {
        c.Error(middleware.NewAppError(http.StatusBadRequest, "Неверный формат запроса", err))
        return
    }

    if !models.IsValidProjectStatus(request.Status) {
        c.Error(middleware.NewAppError(http.StatusBadRequest, "Недопустимый статус проекта", nil))
        return
    }

    user := c.MustGet("user").(*models.User)
    
    // ✅ ДОБАВИТЬ: Ownership check
    if user.Role != "admin" && user.Role != "БА" {
        project, err := ctrl.projectService.FindByID(uint(id))
        if err != nil {
            c.Error(middleware.NewAppError(http.StatusNotFound, "Проект не найден", err))
            return
        }
        if project.ResponsibleUserId != int(user.ID) {
            c.Error(middleware.NewAppError(
                http.StatusForbidden,
                "Вы можете менять статус только своих проектов",
                nil,
            ))
            return
        }
    }

    // ... остальной код без изменений
}
```

---

## 🟢 ЖЕЛАТЕЛЬНО 4: Backend Permission Middleware

### Цель
Централизованная проверка permissions на backend (не только на UI).

### Решение

#### 4.1. Создать Permission Middleware

**Файл:** `backend-go/middleware/permission_middleware.go`

```go
package middleware

import (
    "net/http"
    "portal-razvitie/models"
    
    "github.com/gin-gonic/gin"
)

// RequirePermission проверяет наличие разрешения у текущего пользователя
func RequirePermission(permissionCode string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userInterface, exists := c.Get("user")
        if !exists {
            c.AbortWithStatusJSON(
                http.StatusUnauthorized,
                gin.H{"error": "Unauthorized"},
            )
            return
        }

        user := userInterface.(*models.User)
        
        // Проверить наличие permission
        if !hasPermission(user, permissionCode) {
            c.AbortWithStatusJSON(
                http.StatusForbidden,
                gin.H{"error": "Permission denied: " + permissionCode},
            )
            return
        }

        c.Next()
    }
}

// RequireAnyPermission проверяет наличие хотя бы одного из разрешений
func RequireAnyPermission(permissionCodes ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user := c.MustGet("user").(*models.User)
        
        for _, perm := range permissionCodes {
            if hasPermission(user, perm) {
                c.Next()
                return
            }
        }
        
        c.AbortWithStatusJSON(
            http.StatusForbidden,
            gin.H{"error": "Insufficient permissions"},
        )
    }
}

// RequireAllPermissions проверяет наличие всех указанных разрешений
func RequireAllPermissions(permissionCodes ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user := c.MustGet("user").(*models.User)
        
        for _, perm := range permissionCodes {
            if !hasPermission(user, perm) {
                c.AbortWithStatusJSON(
                    http.StatusForbidden,
                    gin.H{"error": "Permission denied: " + perm},
                )
                return
            }
        }
        
        c.Next()
    }
}

// Helper function
func hasPermission(user *models.User, permissionCode string) bool {
    if user.Permissions == nil {
        return false
    }
    
    for _, perm := range user.Permissions {
        if perm == permissionCode {
            return true
        }
    }
    
    return false
}
```

#### 4.2. Применить к роутам

**Файл:** `backend-go/main.go` (или router setup)

```go
import "portal-razvitie/middleware"

// Projects routes с permission checks
projects := api.Group("/projects")
{
    projects.GET("", projectsController.GetProjects)
    projects.GET("/:id", projectsController.GetProject)
    
    projects.POST("",
        middleware.RequirePermission("project:create"),
        projectsController.CreateProject,
    )
    
    projects.PUT("/:id",
        middleware.RequireAnyPermission("project:edit", "project:edit_own"),
        projectsController.UpdateProject,
    )
    
    projects.DELETE("/:id",
        middleware.RequirePermission("project:delete"),
        projectsController.DeleteProject,
    )
    
    projects.PATCH("/:id/status",
        middleware.RequirePermission("project:edit"),
        projectsController.UpdateProjectStatus,
    )
}

// Tasks routes
tasks := api.Group("/tasks")
{
    tasks.PUT("/:id",
        middleware.RequireAnyPermission("task:edit", "task:edit_own"),
        tasksController.UpdateTask,
    )
    
    tasks.DELETE("/:id",
        middleware.RequirePermission("task:delete"),
        tasksController.DeleteTask,
    )
}

// Documents routes
documents := api.Group("/documents")
{
    documents.POST("/upload",
        middleware.RequirePermission("document:upload"),
        documentsController.Upload,
    )
    
    documents.DELETE("/:id",
        middleware.RequirePermission("document:delete"),
        documentsController.Delete,
    )
}
```

---

## 📊 Порядок применения

### Шаг 1: Критичные исправления (сделать сейчас)
1. ✅ Фильтрация проектов по роли
2. ✅ Access control для документов (Download/Delete)

### Шаг 2: Ownership checks (сделать в ближайшее время)
3. ✅ UpdateProject ownership check
4. ✅ DeleteProject ownership check  
5. ✅ UpdateProjectStatus ownership check

### Шаг 3: Permission middleware (желательно)
6. ✅ Создать permission middleware
7. ✅ Применить к критичным эндпоинтам

---

## Тестирование

После применения каждого исправления проверить:

### Фильтрация проектов
- [ ] Admin видит все проекты
- [ ] БА видит все проекты
- [ ] МП видит только свои проекты
- [ ] МРиЗ видят только свои проекты

### Документы
- [ ] Нельзя скачать чужой документ
- [ ] Нельзя удалить чужой документ
- [ ] Admin может скачать/удалить любой документ

### Проекты
- [ ] Нельзя редактировать чужой проект
- [ ] Нельзя удалить чужой проект
- [ ] Нельзя изменить статус чужого проекта
- [ ] Admin может редактировать любой проект

---

## Rollback план

Если что-то пойдет не так:

```bash
# Откатить последний коммит
git reset --hard HEAD~1

# Перезапустить backend
cd backend-go && go run main.go
```

Каждое изменение коммитить отдельно для возможности точечного отката!

