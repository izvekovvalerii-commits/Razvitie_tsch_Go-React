# Аудит дублирования бизнес-логики

## Обзор

После успешного удаления дублирования логики фильтрации задач, проведен аудит оставшихся компонентов системы на наличие аналогичных проблем.

---

## ✅ 1. Фильтрация задач (ИСПРАВЛЕНО)

### Проблема (до)
- Frontend дублировал логику `isUserTask` и `filterUserTasks`
- Каждый клиент самостоятельно фильтровал задачи

### Решение (после)
- ✅ Логика перенесена на backend
- ✅ `TasksController.GetAllTasks()` - фильтрует по роли
- ✅ `TasksController.GetProjectTasks()` - фильтрует по роли
- ✅ Добавлены ownership checks для CRUD операций

---

## 🔴 2. Фильтрация проектов (ПРОБЛЕМА ОБНАРУЖЕНА)

### Текущее состояние

**Backend: `ProjectsController.GetProjects()`**
```go
func (ctrl *ProjectsController) GetProjects(c *gin.Context) {
    projects, err := ctrl.projectService.FindAll()
    // ❌ ПРОБЛЕМА: Возвращает ВСЕ проекты всем пользователям
    c.JSON(http.StatusOK, projects)
}
```

**Frontend: Нет клиентской фильтрации**
- Pages используют данные "как есть" from backend

### ⚠️ Уязвимость
Все пользователи видят все проекты независимо от роли и ответственности.

### 📋 Рекомендации

#### Вариант 1: Фильтрация по роли (аналогично задачам)
```go
func (ctrl *ProjectsController) GetProjects(c *gin.Context) {
    user := c.MustGet("user").(*models.User)
    
    var projects []models.Project
    var err error
    
    if user.Role == "admin" || user.Role == "БА" {
        projects, err = ctrl.projectService.FindAll()
    } else {
        // МП и МРиЗ видят только проекты где они - ResponsibleUserId
        projects, err = ctrl.projectService.FindByResponsibleUser(user.ID)
    }
    
    c.JSON(http.StatusOK, projects)
}
```

#### Вариант 2: Фильтрация по магазину
Если пользователи привязаны к магазинам:
```go
projects, err = ctrl.projectService.FindByStoreAndUser(user.StoreID, user.ID)
```

---

## 🟡 3. Доступ к документам (ЧАСТИЧНАЯ ПРОБЛЕМА)

### Текущее состояние

**Backend: `DocumentsController`**
```go
// ✅ GET /api/documents/project/{projectId} - OK
// ✅ GET /api/documents/task/{taskId} - OK
// ❌ Download - нет проверки прав доступа
// ❌ Delete - нет проверки ownership
```

### Проблемы

1. **Download документа**
   - Любой аутентифицированный пользователь может скачать любой документ по ID
   - Нет проверки, имеет ли пользователь доступ к проекту/задаче этого документа

2. **Delete документа**
   - Нет проверки ownership
   - Нет проверки прав на проект/задачу

### 📋 Рекомендации

```go
// Download - добавить проверку доступа
func (dc *DocumentsController) Download(c *gin.Context) {
    user := c.MustGet("user").(*models.User)
    doc, err := dc.docService.GetByID(id)
    
    // Проверить, имеет ли пользователь доступ к проекту этого документа
    if !dc.hasAccessToProject(user, doc.ProjectID) {
        c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
        return
    }
    
    // ... existing download logic
}

// Delete - добавить ownership проверку
func (dc *DocumentsController) Delete(c *gin.Context) {
    user := c.MustGet("user").(*models.User)
    doc, err := dc.docService.GetByID(id)
    
    // Только admin, БА или владелец проекта могут удалять
    if user.Role != "admin" && user.Role != "БА" {
        project, _ := dc.projectService.FindByID(doc.ProjectID)
        if project.ResponsibleUserId != int(user.ID) {
            c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
            return
        }
    }
    
    // ... existing delete logic
}
```

---

## ✅ 4. Permission Checks (RBAC) - ЧАСТИЧНО РЕАЛИЗОВАНО

### Текущее состояние

**Frontend: `hasPermission`**
```typescript
const hasPermission = (perm: string) => {
    if (!currentUser || !currentUser.permissions) {
        return false;
    }
    return currentUser.permissions.includes(perm);
}
```

**Backend: Middleware**
- ✅ `AuthMiddleware` проверяет аутентификацию
- ❌ Нет централизованной проверки permissions на backend

### Проблемы

1. **Только UI-скрытие элементов**
   - `hasPermission` используется только для скрытия кнопок
   - Backend не проверяет permissions при API вызовах
   - Пользователь может обойти через API напрямую

2. **Дублирование permission logic**
   - Frontend решает, показывать ли кнопку
   - Backend должен независимо проверять права

### 📋 Рекомендации

#### Создать Permission Middleware для backend
```go
// backend-go/middleware/permission_middleware.go
func RequirePermission(perm string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user := c.MustGet("user").(*models.User)
        
        if !user.HasPermission(perm) {
            c.AbortWithStatusJSON(
                http.StatusForbidden,
                gin.H{"error": "Permission denied"}
            )
            return
        }
        
        c.Next()
    }
}
```

#### Применить к эндпоинтам
```go
// В router setup
projects.DELETE("/:id", 
    middleware.RequirePermission("project:delete"),
    projectsController.DeleteProject
)

projects.PUT("/:id",
    middleware.RequirePermission("project:edit"),
    projectsController.UpdateProject
)
```

---

## 🎯 Приоритетный план действий

### 🔴 Критично (сделать сразу)

1. **Фильтрация проектов по роли**
   - Backend: Добавить role-based фильтрацию в `ProjectsController.GetProjects()`
   - Аналогично тому, как сделано для задач

2. **Access control для документов**
   - Download: Проверка доступа к проекту
   - Delete: Ownership verification

### 🟡 Важно (в ближайшее время)

3. **Backend Permission Middleware**
   - Создать centralized permission checking
   - Применить к критичным эндпоинтам (delete, update)

4. **Project ownership checks**
   - UpdateProject: только owner или admin
   - DeleteProject: только owner или admin  
   - UpdateProjectStatus: только owner или admin

### 🟢 Желательно (для будущей разработки)

5. **Audit logging**
   - Логировать все операции с проектами/документами
   - Кто, когда, что изменил

6. **Rate limiting**
   - Защита от abuse API

---

## Выводы

### Достигнуто ✅
- Фильтрация задач полностью перенесена на backend
- Ownership checks для задач реализованы
- Frontend не дублирует business logic для задач

### Требует внимания ⚠️
- **Проекты**: нет фильтрации по роли
- **Документы**: слабый access control
- **Permissions**: проверяются только на UI, не на backend

### Следующие шаги
1. Реализовать фильтрацию проектов (по аналогии с задачами)
2. Добавить document access checks
3. Создать permission middleware для backend
4. Добавить ownership checks для проектов

