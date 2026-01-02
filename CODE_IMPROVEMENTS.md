# Рекомендации по улучшению кода

Дата: 2026-01-02
Статус: Работает ✅

## Содержание
- [Backend (Go)](#backend-go)
- [Frontend (React)](#frontend-react)
- [База данных](#база-данных)
- [DevOps & Инфраструктура](#devops--инфраструктура)
- [Приоритезация](#приоритезация)

---

## Backend (Go)

### 🔴 Критические улучшения

#### 1. **Удалить временное логирование**
**Файл:** `services/tasks.ts`
**Проблема:** Остался debug код с логированием
```typescript
console.log('📤 Sending task to backend:', {
    id: task.id,
    dependsOnType: typeof taskToSend.dependsOn,
    dependsOnValue: taskToSend.dependsOn,
    fullTask: taskToSend
});
```
**Решение:** Удалить или перевести на условное логирование (только в dev режиме)

#### 2. **Валидация зависимостей задач**
**Файл:** `services/task_service.go`
**Проблема:** При парсинге `dependsOn` нет обработки JSON ошибок
```go
// Нужно добавить валидацию
if task.DependsOn != nil {
    var deps []string
    if err := json.Unmarshal([]byte(*task.DependsOn), &deps); err != nil {
        // Обработка ошибки
    }
}
```

#### 3. **Улучшение обработки ошибок в middleware**
**Файл:** `middleware/auth.go`
**Текущее:**
```go
if !hasPermission {
    c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: missing permission " + perm})
    c.Abort()
    return
}
```
**Предложение:** Добавить логирование попыток несанкционированного доступа
```go
if !hasPermission {
    log.Printf("⚠️ Access denied: user=%d role=%s permission=%s endpoint=%s", 
        user.ID, user.Role, perm, c.Request.URL.Path)
    c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: missing permission " + perm})
    c.Abort()
    return
}
```

### 🟡 Средний приоритет

#### 4. **Оптимизация запросов к БД**
**Файл:** `services/task_service.go`
**Проблема:** N+1 запрос при загрузке задач с проектами
```go
// Текущее - загружает проекты отдельно для каждой задачи
tasks, err := s.repo.FindByProjectID(projectID)

// Предложение - использовать Preload
tasks, err := s.repo.db.Preload("Project").Where("ProjectId = ?", projectID).Find(&tasks)
```

#### 5. **Добавить индексы в БД**
**Файлы:** Нужно создать миграции
```sql
-- Индексы для частых запросов
CREATE INDEX idx_tasks_project_id ON "ProjectTasks"("ProjectId");
CREATE INDEX idx_tasks_status ON "ProjectTasks"("Status");
CREATE INDEX idx_tasks_responsible ON "ProjectTasks"("ResponsibleUserId");
CREATE INDEX idx_notifications_user_read ON "Notification"("UserID", "IsRead");
CREATE INDEX idx_documents_project ON "ProjectDocuments"("ProjectId");
```

#### 6. **Улучшить кэширование RBAC**
**Файл:** `cache/permissions_cache.go`
**Текущее:** TTL 5 минут фиксированный
**Предложение:**
- Сделать TTL конфигурируемым через env переменную
- Добавить метрики (hit/miss ratio)
- Рассмотреть использование Redis для продакшена

#### 7. **Добавить транзакции**
**Файл:** `services/project_service.go`
**Проблема:** Создание проекта с задачами не в транзакции
```go
// Предложение
func (s *ProjectService) CreateProject(project *models.Project) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(project).Error; err != nil {
            return err
        }
        
        // Создание задач в той же транзакции
        if err := s.createProjectTasks(tx, project); err != nil {
            return err // Автоматический rollback
        }
        
        return nil // Commit
    })
}
```

#### 8. **Добавить rate limiting**
**Файл:** Новый middleware
```go
// middleware/rate_limiter.go
func RateLimiter(requestsPerMinute int) gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Limit(requestsPerMinute), requestsPerMinute)
    return func(c *gin.Context) {
        if !limiter.Allow() {
            c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
            c.Abort()
            return
        }
        c.Next()
    }
}
```

### 🟢 Низкий приоритет

#### 9. **Структурировать конфигурацию**
**Файл:** `config/config.go`
**Предложение:** Разделить на окружения (dev/staging/prod)
```go
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    RBAC     RBACConfig
    Cache    CacheConfig
}

func LoadConfig(env string) (*Config, error) {
    // Загрузка из config/env/{dev,staging,prod}.yaml
}
```

#### 10. **Добавить Health Check расширенный**
**Файл:** `routes/routes.go`
```go
router.GET("/health/live", healthLive)  // Простая проверка
router.GET("/health/ready", healthReady) // Проверка БД, кэша и т.д.
```

---

## Frontend (React)

### 🔴 Критические улучшения

#### 11. **Удалить временное логирование**
**Файл:** `pages/ProjectDetails.tsx`
```typescript
// Debug: Log completed tasks with their dates
const completedTasks = sorted.filter(t => t.status === 'Завершена');
if (completedTasks.length > 0) {
    console.log('📊 Completed tasks:', ...); // УДАЛИТЬ
}
```

#### 12. **Оптимизация GanttChart**
**Файл:** `components/GanttChart/GanttChart.tsx`
**Проблема:** Пересчёт на каждый render
**Решение:**
```typescript
// Добавить useMemo для тяжёлых вычислений
const taskPositions = useMemo(() => {
    return tasks.map(task => ({
        id: task.id,
        ...getTaskLayout(task)
    }));
}, [tasks, ganttDates, timelineStart, viewMode]); // Зависимости
```

#### 13. **Типизация для dependsOn**
**Файл:** `types/index.ts`
**Текущее:** `dependsOn?: string[]`
**Проблема:** Может быть и строкой после парсинга с бэка
**Решение:**
```typescript
export interface ProjectTask {
    // ...
    dependsOn?: string[] | string; // Явно указать оба варианта
}

// Или создать type guard
function isDependsOnArray(val: any): val is string[] {
    return Array.isArray(val);
}
```

### 🟡 Средний приоритет

#### 14. **Добавить Error Boundary**
**Новый файл:** `components/ErrorBoundary.tsx`
```typescript
class ErrorBoundary extends React.Component {
    state = { hasError: false };
    
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    
    componentDidCatch(error, errorInfo) {
        console.error('Error caught:', error, errorInfo);
        // Отправить в систему мониторинга
    }
    
    render() {
        if (this.state.hasError) {
            return <ErrorFallback />;
        }
        return this.props.children;
    }
}
```

#### 15. **Оптимизация apiFetch**
**Файл:** `utils/api.ts`
**Предложение:** Добавить retry логику для временных ошибок
```typescript
async function apiFetchWithRetry(url: string, options: RequestInit, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await apiFetch(url, options);
            if (response.ok || response.status < 500) {
                return response;
            }
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
        }
    }
}
```

#### 16. **Lazy loading для страниц**
**Файл:** `App.tsx`
```typescript
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const AdminRoles = lazy(() => import('./pages/AdminRoles'));

// Использование
<Suspense fallback={<LoadingSpinner />}>
    <Route path="/projects/:id" element={<ProjectDetails />} />
</Suspense>
```

#### 17. **Мемоизация компонентов**
**Файл:** `pages/ProjectDetails.tsx`
```typescript
// Вынести тяжёлые компоненты в отдельные memo компоненты
const GanttChartMemo = React.memo(GanttChart, (prev, next) => {
    return prev.tasks === next.tasks && 
           prev.viewMode === next.viewMode;
});
```

### 🟢 Низкий приоритет

#### 18. **Виртуализация списков**
**Файл:** `pages/ProjectDetails.tsx`
**Для больших списков задач:**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
    height={600}
    itemCount={tasks.length}
    itemSize={50}
>
    {({ index, style }) => (
        <div style={style}>
            <TaskRow task={tasks[index]} />
        </div>
    )}
</FixedSizeList>
```

#### 19. **Service Worker для PWA**
**Новый файл:** `public/service-worker.js`
- Кэширование статики
- Offline режим
- Push уведомления

---

## База данных

### 🔴 Критические улучшения

#### 20. **Создать автоматическую миграцию для CreatedAt**
**Файл:** `backend-go/migrations/003_ensure_created_at.sql`
```sql
-- Добавить DEFAULT для новых записей
ALTER TABLE "ProjectTasks" 
ALTER COLUMN "CreatedAt" SET DEFAULT NOW();

-- Trigger для автоматического заполнения
CREATE OR REPLACE FUNCTION set_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."CreatedAt" IS NULL THEN
        NEW."CreatedAt" = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_created_at
    BEFORE INSERT ON "ProjectTasks"
    FOR EACH ROW
    EXECUTE FUNCTION set_created_at();
```

### 🟡 Средний приоритет

#### 21. **Добавить составные индексы**
```sql
-- Для частых JOIN запросов
CREATE INDEX idx_tasks_project_status ON "ProjectTasks"("ProjectId", "Status");
CREATE INDEX idx_tasks_responsible_status ON "ProjectTasks"("ResponsibleUserId", "Status");

-- Для сортировки
CREATE INDEX idx_tasks_deadline ON "ProjectTasks"("NormativeDeadline");
CREATE INDEX idx_notifications_created ON "Notification"("UserID", "CreatedAt" DESC);
```

#### 22. **Партиционирование для уведомлений**
```sql
-- Если уведомлений становится много (>1M)
CREATE TABLE "Notification_2026" PARTITION OF "Notification"
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

#### 23. **Архивация старых данных**
```sql
-- Скрипт для архивации завершенных проектов старше года
CREATE TABLE "ProjectsArchive" (LIKE "Projects");
CREATE TABLE "ProjectTasksArchive" (LIKE "ProjectTasks");

-- Процедура архивации
CREATE PROCEDURE archive_old_projects() ...
```

---

## DevOps & Инфраструктура

### 🔴 Критические улучшения

#### 24. **Docker Compose для разработки**
**Новый файл:** `docker-compose.yml`
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: portal_razvitie
      POSTGRES_USER: portal_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend-go/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
  
  backend:
    build: ./backend-go
    depends_on:
      - postgres
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
    ports:
      - "5000:5000"
  
  frontend:
    build: ./frontend-react
    ports:
      - "5173:5173"
    volumes:
      - ./frontend-react/src:/app/src

volumes:
  postgres_data:
```

#### 25. **Environment Variables**
**Новый файл:** `.env.example`
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=portal_user
DB_PASSWORD=changeme
DB_NAME=portal_razvitie

# Server
SERVER_PORT=5000
GIN_MODE=release

# RBAC
RBAC_CACHE_TTL=300

# JWT (если добавите)
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
```

### 🟡 Средний приоритет

#### 26. **CI/CD Pipeline**
**Новый файл:** `.github/workflows/main.yml`
```yaml
name: CI/CD
on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v2
        with:
          go-version: 1.21
      - run: cd backend-go && go test ./...
  
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: cd frontend-react && npm ci && npm test
  
  deploy:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to production"
```

#### 27. **Логирование структурированное**
**Файл:** `backend-go/logger/logger.go`
```go
import "go.uber.org/zap"

var Logger *zap.Logger

func InitLogger(env string) {
    var err error
    if env == "production" {
        Logger, err = zap.NewProduction()
    } else {
        Logger, err = zap.NewDevelopment()
    }
    if err != nil {
        panic(err)
    }
}

// Использование
logger.Logger.Info("Task completed",
    zap.Int("taskId", task.ID),
    zap.String("status", task.Status),
    zap.Duration("duration", time.Since(start)))
```

#### 28. **Мониторинг и метрики**
**Новый файл:** `backend-go/middleware/metrics.go`
```go
import "github.com/prometheus/client_golang/prometheus"

var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request latency",
        },
        []string{"method", "endpoint", "status"},
    )
)

func MetricsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        c.Next()
        duration := time.Since(start).Seconds()
        
        requestDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
            strconv.Itoa(c.Writer.Status()),
        ).Observe(duration)
    }
}
```

### 🟢 Низкий приоритет

#### 29. **API документация расширенная**
- Добавить примеры запросов/ответов в Swagger
- Создать Postman коллекцию
- Документировать webhook'и и события

#### 30. **Тестирование**
```go
// backend-go/services/task_service_test.go
func TestUpdateTaskStatus(t *testing.T) {
    // Arrange
    repo := &mockTaskRepository{}
    service := NewTaskService(repo, ...)
    
    // Act
    err := service.UpdateStatus(1, "Завершена")
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, "Завершена", repo.updatedTask.Status)
    assert.NotNil(t, repo.updatedTask.ActualDate)
}
```

---

## Приоритезация

### Этап 1: Срочно (1-2 дня)
1. ✅ Удалить debug логирование
2. ✅ Создать миграцию для CreatedAt DEFAULT
3. ✅ Добавить основные индексы в БД
4. ✅ Создать .env.example

### Этап 2: Важно (1 неделя)
5. ⏳ Добавить транзакции
6. ⏳ Оптимизировать GanttChart
7. ⏳ Добавить Error Boundary
8. ⏳ Улучшить логирование попыток доступа
9. ⏳ Docker Compose

### Этап 3: Улучшения (2-4 недели)
10. 🔄 Настроить CI/CD
11. 🔄 Добавить структурированное логирование
12. 🔄 Rate limiting
13. 🔄 Retry логика в API
14. 🔄 Prometheus метрики

### Этап 4: Оптимизация (когда есть время)
15. 💡 PWA и Service Workers
16. 💡 Виртуализация списков
17. 💡 Архивация старых данных
18. 💡 Партиционирование
19. 💡 Тестирование

---

## Метрики успеха

После внедрения улучшений ожидаемые результаты:

- **Производительность:**
  - Время загрузки страницы: < 1 сек
  - API latency: < 200ms (p95)
  - Database query time: < 50ms (p95)

- **Надёжность:**
  - Uptime: > 99.9%
  - Error rate: < 0.1%
  - Cache hit ratio: > 80%

- **Безопасность:**
  - 0 критических уязвимостей
  - Все запросы логируются
  - Rate limiting на всех endpoints

- **Код качество:**
  - Test coverage: > 70%
  - 0 критических lint ошибок
  - Все TODO исправлены

---

## Контакты и поддержка

Для вопросов по улучшениям обращайтесь к команде разработки.

**Дата следующего ревью:** 2026-01-16
