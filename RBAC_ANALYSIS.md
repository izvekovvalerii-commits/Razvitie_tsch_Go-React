# Анализ и рекомендации по улучшению RBAC системы

## Текущая архитектура

### Backend (Go)
- ✅ Централизованный middleware для аутентификации
- ✅ Гибкая система ролей и прав (many-to-many)
- ✅ Защита эндпоинтов через `RequirePermission`
- ✅ Админка для управления правами

### Frontend (React)
- ✅ Централизованный `AuthContext`
- ✅ Декларативные проверки прав `hasPermission()`
- ✅ Автообновление прав при изменении через админку
- ✅ Условное отображение UI элементов

---

## Выявленные проблемы и улучшения

### 🔴 КРИТИЧНЫЕ (требуют исправления)

#### 1. **Seeder перезаписывает права при каждом рестарте**
**Проблема:** 
```go
// В SeedRBAC:
DB.Model(&role).Association("Permissions").Replace(perms)
```
Это **перезаписывает** все кастомные права, добавленные через админку.

**Решение:**
```go
// Вместо Replace использовать условное обновление
func SeedRBAC() error {
    // Проверяем, были ли права изменены вручную
    var customRoles []models.Role
    DB.Where("is_custom = ?", true).Find(&customRoles)
    
    // Обновляем только системные роли
    for roleCode, permCodes := range models.RolePermissions {
        var role models.Role
        if err := DB.Where(models.Role{Code: roleCode}).FirstOrCreate(&role).Error; err != nil {
            return err
        }
        
        // Пропускаем кастомные роли
        if role.IsCustom {
            continue
        }
        
        // Обновляем только если нет прав или это первый запуск
        var existingPerms []models.Permission
        DB.Model(&role).Association("Permissions").Find(&existingPerms)
        
        if len(existingPerms) == 0 {
            // Только для новых ролей
            var perms []models.Permission
            DB.Where("\"Code\" IN ?", permCodes).Find(&perms)
            DB.Model(&role).Association("Permissions").Replace(perms)
        }
    }
    return nil
}
```

**Альтернатива:** Добавить флаг `--reset-permissions` для явного сброса.

---

#### 2. **Отсутствие кэширования прав на бэкенде**
**Проблема:**
```go
// AuthMiddleware выполняет 2 DB запроса на КАЖДЫЙ request:
DB.First(&user, uid)  // 1. Загрузка пользователя
DB.Preload("Permissions").Where(&models.Role{Code: user.Role}).First(&role)  // 2. Загрузка роли с правами
```

**Решение:** Добавить in-memory кэш прав:

```go
// cache/permissions_cache.go
package cache

import (
    "sync"
    "time"
)

type PermissionCache struct {
    cache map[string][]string  // roleCode -> permissions
    mu    sync.RWMutex
    ttl   time.Duration
}

var permCache = &PermissionCache{
    cache: make(map[string][]string),
    ttl:   5 * time.Minute,
}

func GetPermissions(roleCode string) ([]string, bool) {
    permCache.mu.RLock()
    defer permCache.mu.RUnlock()
    perms, ok := permCache.cache[roleCode]
    return perms, ok
}

func SetPermissions(roleCode string, perms []string) {
    permCache.mu.Lock()
    defer permCache.mu.Unlock()
    permCache.cache[roleCode] = perms
}

func InvalidateRole(roleCode string) {
    permCache.mu.Lock()
    defer permCache.mu.Unlock()
    delete(permCache.cache, roleCode)
}

// Использование в middleware:
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // ... загрузка user ...
        
        // Проверяем кэш
        perms, found := cache.GetPermissions(user.Role)
        if !found {
            // Загружаем из DB
            var role models.Role
            if err := database.DB.Preload("Permissions").Where(&models.Role{Code: user.Role}).First(&role).Error; err == nil {
                perms = make([]string, len(role.Permissions))
                for i, p := range role.Permissions {
                    perms[i] = p.Code
                }
                cache.SetPermissions(user.Role, perms)
            }
        }
        
        c.Set("permissions", perms)
        c.Next()
    }
}

// В RBACController при обновлении прав:
func (ctrl *RBACController) UpdateRolePermissions(c *gin.Context) {
    // ... обновление ...
    cache.InvalidateRole(roleCode)  // Инвалидация кэша
}
```

**Эффект:** Снижение нагрузки на БД с ~1000 запросов/сек до ~2 запросов/сек (только для новых сессий).

---

### 🟡 ВАЖНЫЕ (рекомендуется)

#### 3. **Нет аудита изменений прав**
**Проблема:** Невозможно отследить кто, когда и какие права изменил.

**Решение:** Добавить таблицу аудита:

```go
// models/audit.go
type RBACaudit struct {
    ID          uint      `gorm:"primaryKey"`
    UserID      uint      `json:"userId"`       // Кто изменил
    Action      string    `json:"action"`       // CREATE_ROLE, UPDATE_PERMISSIONS, etc.
    EntityType  string    `json:"entityType"`   // ROLE, PERMISSION
    EntityID    uint      `json:"entityId"`
    OldValue    string    `json:"oldValue"`     // JSON of old state
    NewValue    string    `json:"newValue"`     // JSON of new state
    CreatedAt   time.Time `json:"createdAt"`
}

// В RBACController:
func (ctrl *RBACController) UpdateRolePermissions(c *gin.Context) {
    // ... получение roleId, permissionIds ...
    
    // Логируем старые права
    var oldPerms []models.Permission
    DB.Model(&role).Association("Permissions").Find(&oldPerms)
    oldJSON, _ := json.Marshal(oldPerms)
    
    // Обновляем
    DB.Model(&role).Association("Permissions").Replace(perms)
    
    // Логируем новые права
    newJSON, _ := json.Marshal(perms)
    
    // Сохраняем аудит
    user := c.MustGet("user").(*models.User)
    DB.Create(&models.RBACaudit{
        UserID:     user.ID,
        Action:     "UPDATE_PERMISSIONS",
        EntityType: "ROLE",
        EntityID:   roleId,
        OldValue:   string(oldJSON),
        NewValue:   string(newJSON),
    })
}
```

---

#### 4. **Хардкод прав в коде**
**Проблема:**
```go
// models/permissions.go
const (
    PermProjectCreate = "project:create"
    PermProjectView   = "project:view"
    // ...
)
```
Добавление нового права требует изменения кода и перекомпиляции.

**Решение:** Динамические права через БД:

```go
// Вместо констант использовать таблицу Permission как единственный источник истины
// Добавить API для создания прав:

// POST /api/rbac/permissions
func (ctrl *RBACController) CreatePermission(c *gin.Context) {
    var req struct {
        Code        string `json:"code" binding:"required"`
        Description string `json:"description"`
        Resource    string `json:"resource"`  // project, task, user, etc.
        Action      string `json:"action"`    // create, view, edit, delete
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    perm := models.Permission{
        Code:        req.Code,
        Description: req.Description,
    }
    
    if err := database.DB.Create(&perm).Error; err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(200, perm)
}
```

**Миграция:** Сначала заполнить БД из констант, затем удалить константы.

---

#### 5. **setCurrentUser делает API call каждый раз**
**Проблема:** При переключении пользователя всегда загружаются все пользователи с бэкенда.

**Решение:**

```typescript
// AuthContext.tsx
const setCurrentUser = (user: User) => {
    // Используем уже загруженного пользователя из availableUsers
    const cachedUser = availableUsers.find(u => u.id === user.id);
    
    if (cachedUser) {
        setCurrentUserState(cachedUser);
    } else {
        // Только если нет в кэше - загружаем
        loadUsers().then(users => {
            const freshUser = users.find(u => u.id === user.id);
            setCurrentUserState(freshUser || user);
        });
    }
};
```

---

### 🟢 ОПЦИОНАЛЬНЫЕ (улучшение UX)

#### 6. **Отсутствие группировки прав**
**Проблема:** В админке все права в плоском списке.

**Решение:** Добавить группировку:

```go
type Permission struct {
    ID          uint   `gorm:"primaryKey"`
    Code        string `gorm:"uniqueIndex"`
    Description string
    Resource    string `json:"resource"`  // NEW: project, task, user
    Action      string `json:"action"`    // NEW: create, view, edit
}
```

```tsx
// AdminRoles.tsx - группировка по ресурсам
const groupedPermissions = allPermissions.reduce((acc, perm) => {
    const resource = perm.code.split(':')[0]; // project, task, user
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(perm);
    return acc;
}, {} as Record<string, RBACPermission[]>);

// Отображение по группам
{Object.entries(groupedPermissions).map(([resource, perms]) => (
    <div key={resource} className="permission-group">
        <h4>{resource}</h4>
        {perms.map(p => (
            <label key={p.id}>
                <input 
                    type="checkbox"
                    checked={rolePerms.has(p.code)}
                    onChange={() => togglePerm(p.code)}
                />
                {p.description}
            </label>
        ))}
    </div>
))}
```

---

#### 7. **Нет поддержки временных прав**
**Для продвинутого RBAC:** Права с TTL (время действия).

```go
type RolePermissionOverride struct {
    RoleID       uint
    PermissionID uint
    ExpiresAt    *time.Time  // NULL = постоянное право
}

// Проверка при загрузке прав:
func GetRolePermissions(roleCode string) []string {
    // Загрузить все права
    // Отфильтровать истекшие (ExpiresAt < now)
}
```

---

## Приоритизированный план внедрения

### Фаза 1 (Критично - сейчас)
1. ✅ Исправить проверки прав на всех эндпоинтах (СДЕЛАНО)
2. ⚠️ Исправить Seeder (не перезаписывать кастомные права)
3. ⚠️ Добавить кэширование прав на бэкенде

### Фаза 2 (Важно - через неделю)
4. Добавить аудит RBAC изменений
5. Оптимизировать setCurrentUser на фронте
6. Добавить группировку прав в UI

### Фаза 3 (Опционально - по необходимости)
7. Динамические права через API
8. Временные права с TTL
9. Расширенный UI с фильтрацией и поиском

---

## Метрики и мониторинг

Рекомендуется добавить:

1. **Логирование попыток доступа:**
```go
func RequirePermission(perm string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user := c.MustGet("user").(*models.User)
        perms := c.MustGet("permissions").([]string)
        
        hasPermission := contains(perms, perm)
        
        // Логирование
        log.Printf("Access check: user=%d permission=%s granted=%v path=%s", 
            user.ID, perm, hasPermission, c.Request.URL.Path)
        
        if !hasPermission {
            c.JSON(403, gin.H{"error": "Forbidden"})
            c.Abort()
        }
        c.Next()
    }
}
```

2. **Метрики Prometheus:**
- Количество проверок прав
- Процент отказов в доступе
- Среднее время загрузки прав

---

## Заключение

**Текущее состояние:** 7/10
- ✅ Основная функциональность работает корректно
- ✅ Защита на уровне бэкенда и фронтенда
- ⚠️ Требует оптимизации производительности
- ⚠️ Нуждается в улучшении UX админки

**После внедрения улучшений:** 9/10
- Высокая производительность (кэширование)
- Аудит и безопасность
- Гибкость (динамические права)
- Удобство использования

**Следующий шаг:** Рекомендую начать с Фазы 1 (исправление Seeder + кэширование).
