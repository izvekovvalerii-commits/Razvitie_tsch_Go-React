# Архитектурный аудит Portal Go-React

**Дата проведения:** 20 января 2026  
**Версия:** 1.0  
**Статус:** Комплексный анализ бэкенда и фронтенда

---

## 📋 Оглавление

1. [Общая структура](#общая-структура)
2. [Backend-анализ](#backend-анализ)
3. [Frontend-анализ](#frontend-анализ)
4. [Найденные проблемы и дублирование](#найденные-проблемы-и-дублирование)
5. [Рекомендации по улучшению](#рекомендации-по-улучшению)

---

## 🏗️ Общая структура

### Backend (Go)
```
backend-go/
├── cache/              # Кэширование прав доступа
├── config/             # Конфигурация приложения
├── controllers/        # 12 контроллеров (HTTP handlers)
├── database/           # База данных и сиды
├── events/             # Event Bus система
├── helpers/            # Вспомогательные функции
├── listeners/          # Event listeners
├── logger/             # Логирование (zerolog)
├── middleware/         # Auth middleware
├── migrations/         # Миграции БД
├── models/             # 15 моделей данных
├── repositories/       # 10 репозиториев (Data Access Layer)
├── routes/             # Маршрутизация API
├── services/           # 19 сервисов (Business Logic Layer)
├── uploads/            # Загруженные файлы
└── websocket/          # WebSocket поддержка
```

### Frontend (React)
```
frontend-react/src/
├── components/         # 25 компонентов
├── constants/          # Константы
├── context/            # AuthContext
├── hooks/              # 9 кастомных хуков
├── pages/              # 29 страниц
├── services/           # 11 API сервисов
├── types/              # TypeScript типы
└── utils/              # Утилиты
```

---

## 🔧 Backend-анализ

### ✅ Хорошо реализовано

#### 1. **Чистая архитектура (Clean Architecture)**
- ✅ Четкое разделение на слои: Controllers → Services → Repositories
- ✅ Dependency Injection через конструкторы
- ✅ Интерфейсы для абстракций (`WorkflowServiceInterface`)

#### 2. **Event-Driven Architecture**
- ✅ Реализован Event Bus (`events/event_bus.go`)
- ✅ Слушатели событий для разных доменов:
  - `ActivityListener` - логирование активности
  - `NotificationListener` - создание уведомлений
  - `WebSocketListener` - real-time обновления

#### 3. **Современные практики**
- ✅ Structured logging (zerolog)
- ✅ RBAC система
- ✅ Кэширование прав доступа
- ✅ Graceful shutdown
- ✅ Middleware для аутентификации
- ✅ CORS настройка

### ⚠️ Проблемы и Tech Debt

#### 1. **Circular Dependencies риск**
**Проблема:** `WorkflowService` зависит от множества других сервисов через сеттеры:
```go
type WorkflowService struct {
    userRepo     repositories.UserRepository
    notifService *NotificationService
    projectRepo  repositories.ProjectRepository
    db           *gorm.DB
}

func (ws *WorkflowService) SetUserRepo(repo repositories.UserRepository)
func (ws *WorkflowService) SetNotificationService(notifService *NotificationService)
```

**Риски:**
- Скрытые зависимости
- Сложная инициализация
- Возможны nil pointer ошибки

**Решение:**
```go
// Вместо сеттеров, использовать явные зависимости в конструкторе
func NewWorkflowService(
    userRepo repositories.UserRepository,
    projectRepo repositories.ProjectRepository,
    notifService *NotificationService,
    db *gorm.DB,
) *WorkflowService {
    return &WorkflowService{
        userRepo:     userRepo,
        notifService: notifService,
        projectRepo:  projectRepo,
        db:           db,
    }
}
```

#### 2. **Огромный WorkflowService (687 строк!)**
**Проблема:** `workflow_service.go` содержит слишком много ответственностей:
- Генерация задач из шаблонов
- Обработка завершения задач
- Пересчет таймлайнов
- Валидация документов
- Хардкодные бизнес-правила (`DefaultStoreOpeningTasks`)

**Решение:** Разбить на несколько сервисов:
```go
// Разделить на:
- TaskGenerationService     // Генерация задач
- TaskDependencyService      // Управление зависимостями
- TaskValidationService      // Валидация требований
- ProjectTimelineService     // Пересчет сроков
```

#### 3. **Дублирование кода валидации документов**

**Найдено в:**
- `workflow_service.go` - функции `checkDocExists`, `checkDocExistsWithExt`
- `ImprovedTaskModal.tsx` - константа `REQUIRED_DOCS_MAP`

**Проблема:** Бизнес-логика валидации дублируется между фронтендом и бэкендом.

**Решение:**
```go
// Создать единый источник правил
// backend-go/models/task_validation_rules.go
type DocumentRequirement struct {
    TaskCode     string
    DocumentType string
    Extensions   []string
    IsRequired   bool
}

// Генерировать JSON для фронтенда через API endpoint
GET /api/validation-rules/documents
```

#### 4. **Hardcoded константы в коде**

**Найдено:**
```go
// workflow_service.go:67
var DefaultStoreOpeningTasks = []models.TaskDefinition{
    {Code: "TASK-PREP-AUDIT", Name: "Подготовка к аудиту", ...},
    // ... еще ~20 задач
}
```

**Проблема:** Невозможно изменить без ре деплоя.

**Решение:**
```go
// 1. Переместить в БД (migration)
// 2. Создать админ-панель для управления
// 3. API для CRUD операций над task definitions
```

#### 5. **Отсутствие тестов**

**Статистика:**
- `project_service_test.go` (6131 bytes)
- `task_service_test.go` (2941 bytes)
- `notification_service_test.go` (877 bytes)
- `store_service_test.go` (1014 bytes)

**Проблема:** 
- Тесты есть только для 4 из 19 сервисов
- Нет интеграционных тестов
- Нет coverage отчетов

**Решение:**
```bash
# Покрыть критичные сервисы тестами:
- WorkflowService (самый сложный!)
- RequestService
- ProjectTemplateService
- TaskTemplate Service

# Добавить в CI/CD
make test-coverage
```

#### 6. **Смешивание презентационной и бизнес-логики**

**Пример в `TaskService.CreateTask`:**
```go
// lines 55-186 - 130 строк в одном методе!
func (s *TaskService) CreateTask(task *models.ProjectTask, actorId uint) error {
    // Resolve ResponsibleUserID
    // Auto-assign Order
    // Calculate dates based on dependencies
    // Set initial status
    // Create in DB
    // Publish Event
    // Recalculate timeline
}
```

**Проблема:** Слишком много ответственностей в одном методе.

**Решение:**
```go
func (s *TaskService) CreateTask(task *models.ProjectTask, actorId uint) error {
    s.enrichTaskData(task)
    s.calculateTaskDates(task)
    s.setInitialStatus(task)
    
    if err := s.repo.Create(task); err != nil {
        return err
    }
    
    s.publishTaskCreated(task, actorId)
    s.recalculateProjectTimeline(task.ProjectID)
    return nil
}

// Каждый шаг в отдельном методе
```

#### 7. **Неэффективные запросы к БД**

**Пример в `RecalculateProjectTimeline`:**
```go
// Множественные запросы в цикле (N+1 problem)
for _, task := range tasks {
    var dependsOnIds []string
    json.Unmarshal([]byte(*task.DependsOn), &dependsOnIds)
    
    for _, depCode := range dependsOnIds {
        ws.db.First(&depTask, "code = ?", depCode)  // ❌ Запрос в цикле!
    }
}
```

**Решение:**
```go
// Загрузить все задачи один раз, построить map
taskMap := make(map[string]*models.ProjectTask)
for _, t := range tasks {
    taskMap[t.Code] = &t
}

// Использовать map вместо запросов
depTask := taskMap[depCode]
```

---

## 🎨 Frontend-анализ

### ✅ Хорошо реализовано

#### 1. **Современный стек**
- ✅ React 18 с TypeScript
- ✅ React Query для управления состоянием сервера
- ✅ Custom hooks для переиспользования логики
- ✅ CSS Modules для стилизации

#### 2. **Разделение concerns**
- ✅ Services слой для API вызовов
- ✅ Custom hooks для бизнес-логики
- ✅ Типизация через TypeScript

### 🔴 Критические проблемы

#### 1. **Монолитный компонент ImprovedTaskModal.tsx (1556 строк!)**

**Статистика:**
- 1556 строк кода
- 101 KB размер файла
- 100+ useState вызовов
- Смешаны: UI, бизнес-логика, API вызовы, валидация

**Проблема:** Невозможно поддерживать и тестировать.

**Решение - разбить на компоненты:**

```typescript
// Новая структура:
ImprovedTaskModal/
├── index.tsx                    // Главный компонент (координатор)
├── useTaskModal.ts              // Hook с бизнес-логикой
├── hooks/
│   ├── useTaskData.ts           // Загрузка данных задачи
│   ├── useTaskHistory.ts        // История
│   ├── useTaskComments.ts       // Комментарии
│   └── useTaskRequests.ts       // Requests
├── components/
│   ├── TaskHeader.tsx           // Шапка модалки
│   ├── TaskMetadata.tsx         // Прогресс, дедлайны
│   ├── TaskWorkflow.tsx         // Timeline предшественники/последователи
│   ├── tabs/
│   │   ├── BasicTab.tsx         // Основная информация
│   │   ├── DocumentsTab.tsx     // Документы
│   │   ├── HistoryTab.tsx       // История
│   │   ├── CommentsTab.tsx      // Комментарии
│   │   ├── RequestsTab.tsx      // Заявки
│   │   └── ApprovalsTab.tsx     // Согласования
│   └── task-fields/
│       ├── AuditFields.tsx      // Для TASK-PREP-AUDIT
│       ├── ContourFields.tsx    // Для TASK-CONTOUR
│       └── BudgetFields.tsx     // Для бюджетных задач
└── utils/
    ├── taskUtils.ts             // Утилиты расчетов
    └── validationRules.ts       // Правила валидации
```

**Пример рефакторинга:**

```typescript
// hooks/useTaskModal.ts
export const useTaskModal = (task: ProjectTask | null) => {
    const [editedTask, setEditedTask] = useState(task);
    const [activeTab, setActiveTab] = useState<TabType>('basic');
    
    // Delegate to specialized hooks
    const history = useTaskHistory(task?.id);
    const comments = useTaskComments(task?.id);
    const requests = useTaskRequests(task?.id);
    
    return {
        editedTask,
        setEditedTask,
        activeTab,
        setActiveTab,
        history,
        comments,
        requests,
    };
};

// components/tabs/BasicTab.tsx
export const BasicTab: React.FC<BasicTabProps> = ({
    task,
    onUpdate,
    hasEditPermission,
}) => {
    return (
        <div className="tab-content">
            <TaskBasicInfo task={task} />
            <TaskDates task={task} />
            {task.template && (
                <DynamicFields template={task.template} />
            )}
            <TaskSpecificFields task={task} />
        </div>
    );
};
```

#### 2. **Дублирование кода между компонентами**

**Найдено:**

**А) Форматирование дат (в 10+ местах):**
```typescript
// Дублируется во многих компонентах
const formatDateValue = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) { return ''; }
};
```

**Решение:**
```typescript
// utils/dateUtils.ts
export const formatters = {
    toInputValue: (date?: string | Date) => {
        if (!date) return '';
        try {
            return new Date(date).toISOString().split('T')[0];
        } catch { return ''; }
    },
    
    toISO: (dateStr: string) => {
        return dateStr ? new Date(dateStr).toISOString() : undefined;
    },
    
    toDisplay: (date: string | Date, format = 'dd.MM.yyyy') => {
        // ... formatting logic
    }
};
```

**Б) Логика приоритетов задач:**
```typescript
// Дублируется в Tasks.tsx, ProjectDetails.tsx, ImprovedTaskModal.tsx
const getPriority = () => {
    const days = getDaysUntilDeadline();
    if (days === null) return 'Средний';
    if (days < 0) return 'Просрочена';
    if (days <= 2) return 'Высокий';
    if (days <= 7) return 'Средний';
    return 'Низкий';
};
```

**Решение:**
```typescript
// utils/taskUtils.ts
export const taskPriority = {
    calculate: (deadline: string | Date): Priority => {
        const days = dateUtils.daysUntil(deadline);
        if (days < 0) return 'Overdue';
        if (days <= 2) return 'High';
        if (days <= 7) return 'Medium';
        return 'Low';
    },
    
    getColor: (priority: Priority) => {
        // ... color mapping
    }
};
```

#### 3. **Неоптимальные API вызовы**

**Проблема в `ImprovedTaskModal.tsx` (lines 196-204):**
```typescript
// Загружаем ВСЕ requests, потом фильтруем на клиенте
requestsService.getAll()
    .then(allRequests => {
        const taskRequests = allRequests.filter(r => r.taskId === task.id);
        setRequests(taskRequests);
    })
```

**Решение:**
```typescript
// На бэкенде добавить endpoint:
GET /api/requests?taskId={taskId}

// На фронтенде:
requestsService.getByTaskId(task.id).then(setRequests);
```

#### 4. **Отсутствие error boundaries**

**Проблема:** При ошибке в компоненте падает все приложение.

**Решение:**
```typescript
// components/ErrorBoundary/TaskModalError.tsx
export class TaskModalErrorBoundary extends React.Component {
    state = { hasError: false, error: null };
    
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    
    componentDidCatch(error, errorInfo) {
        console.error('TaskModal Error:', error, errorInfo);
        // Send to error tracking service
    }
    
    render() {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} />;
        }
        return this.props.children;
    }
}
```

#### 5. **Нет оптимизации рендеринга**

**Проблемы:**
- Нет `React.memo` для дорогих компонентов
- Нет `useMemo` / `useCallback` для вычислений
- Пересоздание функций на каждом рендере

**Пример проблемы:**
```typescript
// Каждый рендер создает новую функцию
const handleSave = async () => {
    setIsSaving(true);
    try {
        await onSave({...editedTask, customFieldsValues: JSON.stringify(customValues)});
    } finally {
        setIsSaving(false);
    }
};
```

**Решение:**
```typescript
const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
        const taskToSave = useMemo(() => ({
            ...editedTask,
            customFieldsValues: JSON.stringify(customValues)
        }), [editedTask, customValues]);
        
        await onSave(taskToSave);
    } finally {
        setIsSaving(false);
    }
}, [editedTask, customValues, onSave]);
```

#### 6. **Inconsistent naming и стили**

**Найденные несоответствия:**

**CSS файлы:**
- `ImprovedTaskModal.css` (35KB!)
- `RequestModalCompact.css`
- `RequestModalUltraCompact.css`

**Проблема:** Разные подходы к стилизации, сложно поддерживать.

**Решение:**
```
// Унифицировать через CSS-in-JS или CSS Modules
components/
├── TaskModal/
│   ├── TaskModal.tsx
│   ├── TaskModal.module.css
│   └── components/
│       └── TaskHeader/
│           ├── TaskHeader.tsx
│           └── TaskHeader.module.css
```

#### 7. **Backup файлы в production коде**

**Найдено:**
```
frontend-react/src/pages/
├── ProjectDetails.tsx.backup
├── Requests.tsx.backup
```

**Проблема:** Мусорный код в репозитории.

**Решение:**
```bash
# Добавить в .gitignore
*.backup
*.bak
*.old

# Удалить из репозитория
git rm *.backup
```

---

## 🐛 Найденные проблемы и дублирование

### Backend

| Проблема | Местонахождение | Приоритет | Решение |
|----------|----------------|-----------|---------|
| Циклические зависимости | `WorkflowService` | 🔴 High | Рефакторинг DI |
| Дублирование валидации | `workflow_service.go`, `task_service.go` | 🟡 Medium | Создать `ValidationService` |
| N+1 запросы в БД | `RecalculateProjectTimeline` | 🔴 High | Eager loading |
| Хардкод бизнес-правил | `DefaultStoreOpeningTasks` | 🟡 Medium | Переместить в БД |
| Отсутствие тестов | 15 сервисов без тестов | 🔴 High | Написать unit tests |
| Большие методы | `CreateTask` (130 строк) | 🟡 Medium | Разбить на методы |

### Frontend

| Проблема | Местонахождение | Приоритет | Решение |
|----------|----------------|-----------|---------|
| Монолитный компонент | `ImprovedTaskModal.tsx` (1556 строк) | 🔴 Critical | Разбить на подкомпоненты |
| Дублирование логики | Date formatting в 10+ местах | 🟡 Medium | Создать `utils/dateUtils.ts` |
| Неэффективные API вызовы | `getAll()` + фильтрация | 🟡 Medium | Серверная фильтрация |
| Нет error boundaries | Все компоненты | 🟢 Low | Добавить ErrorBoundary |
| Backup файлы | `*.backup` | 🟢 Low | Удалить, добавить в .gitignore |
| Огромные CSS файлы | `ImprovedTaskModal.css` (35KB) | 🟡 Medium | CSS Modules, разделить |

---

## 💡 Рекомендации по улучшению

### Краткосрочные (1-2 недели)

#### Backend
1. **Создать `helpers/validation`пакет**
   ```go
   package validation
   
   type DocumentValidator struct {
       rules []DocumentRequirement
   }
   
   func (v *DocumentValidator) ValidateTask(task *models.ProjectTask, docs []models.Document) error {
       // Централизованная валидация
   }
   ```

2. **Оптимизировать запросы в `WorkflowService`**
   - Использовать `Preload` для eager loading
   - Построить in-memory maps вместо запросов в циклах

3. **Добавить индексы в БД**
   ```sql
   CREATE INDEX idx_tasks_project_code ON project_tasks(project_id, code);
   CREATE INDEX idx_tasks_status ON project_tasks(status);
   CREATE INDEX idx_requests_task ON requests(task_id);
   ```

#### Frontend
1. **Разбить `ImprovedTaskModal.tsx`**
   - Начать с вынесения табов в отдельные компоненты
   - Создать custom hooks для каждой фичи

2. **Создать общие утилиты**
   ```typescript
   // utils/index.ts
   export { dateUtils } from './dateUtils';
   export { taskUtils } from './taskUtils';
   export { formatterUtils } from './formatters';
   ```

3. **Удалить мусорные файлы**
   ```bash
   git rm **/*.backup
   echo "*.backup" >> .gitignore
   ```

### Среднесрочные (1 месяц)

#### Backend
1. **Рефакторинг `WorkflowService`**
   ```go
   // Разделить на:
   services/
   ├── workflow/
   │   ├── task_generation_service.go
   │   ├── task_dependency_service.go
   │   ├── task_validation_service.go
   │   └── timeline_calculator_service.go
   ```

2. **Написать тесты**
   - Покрыть `WorkflowService` на 80%+
   - Интеграционные тесты для критичных флоу
   - E2E тесты для API

3. **Добавить метрики и мониторинг**
   ```go
   // metrics/metrics.go
   var (
       TaskCreationDuration = prometheus.NewHistogram(...)
       ActiveRequests = prometheus.NewGauge(...)
   )
   ```

#### Frontend
1. **Внедрить архитектуру Feature-Sliced Design**
   ```
   src/
   ├── app/                 # Конфигурация приложения
   ├── pages/               # Страницы (routes)
   ├── widgets/             # Крупные блоки (TaskModal, GanttChart)
   ├── features/            # Фичи (CreateTask, EditTask)
   ├── entities/            # Бизнес-сущности (Task, Project)
   ├── shared/              # Переиспользуемый код
   │   ├── ui/              # UI Kit
   │   ├── lib/             # Утилиты
   │   └── api/             # API клиент
   ```

2. **Добавить State Management**
   - Zustand или Jotai для глобального состояния
   - Убрать prop drilling

3. **Внедрить дизайн-систему**
   - Создать UI Kit компонентов
   - Storybook для документации

### Долгосрочные (3+ месяца)

1. **Микросервисная архитектура (при необходимости)**
   ```
   services/
   ├── task-service/        # Управление задачами
   ├── project-service/     # Управление проектами
   ├── request-service/     # Система заявок
   ├── notification-service/# Уведомления
   └── auth-service/        # Аутентификация
   ```

2. **GraphQL вместо REST**
   - Решает проблему over-fetching
   - Единый endpoint
   - Сильная типизация

3. **Real-time collaboration**
   - Collaborative editing задач
   - Live updates через WebSockets
   - Conflict resolution

---

## 📊 Метрики качества кода

### Backend

| Метрика | Текущее | Цель | Статус |
|---------|---------|------|--------|
| Test Coverage | ~20% | 80%+ | 🔴 |
| Average Service Size | 300 LOC | <200 LOC | 🟡 |
| Cyclomatic Complexity | High (WorkflowService) | Medium | 🔴 |
| Code Duplication | ~15% | <5% | 🟡 |
| API Response Time | <100ms | <50ms | 🟢 |

### Frontend

| Метрика | Текущее | Цель | Статус |
|---------|---------|------|--------|
| Component Size | 1556 LOC (max) | <300 LOC | 🔴 |
| Bundle Size | TBD | <500KB | ❓ |
| Lighthouse Score | TBD | 90+ | ❓ |
| TypeScript Coverage | ~80% | 100% | 🟡 |
| Accessibility (a11y) | TBD | WCAG AA | ❓ |

---

## 🎯 План действий (Priority Matrix)

### Must Have (Critical)
1. ✅ Разбить `ImprovedTaskModal.tsx` на компоненты
2. ✅ Оптимизировать N+1 запросы в `WorkflowService`
3. ✅ Написать тесты для core services
4. ✅ Создать error boundaries

### Should Have (High Priority)
1. 🔄 Рефакторинг `WorkflowService` (687 LOC → multiple services)
2. 🔄 Унифицировать валидацию документов (backend + frontend)
3. 🔄 Создать утилиты для общих операций (dates, formatting)
4. 🔄 Удалить дублирование кода

### Nice to Have (Medium Priority)
1. ⏳ Переместить `DefaultStoreOpeningTasks` в БД
2. ⏳ Добавить State Management (Zustand)
3. ⏳ Внедрить дизайн-систему
4. ⏳ Оптимизация рендеринга (React.memo, useMemo)

### Future (Low Priority)
1. 💡 Микросервисная архитектура
2. 💡 GraphQL
3. 💡 Real-time collaboration
4. 💡 Advanced monitoring & alerting

---

## 📝 Заключение

### Сильные стороны
✅ Хорошая структура проекта (Clean Architecture на backend)  
✅ Использование современных технологий  
✅ Event-Driven подход  
✅ TypeScript на фронтенде  
✅ WebSocket для real-time updates  

### Основные проблемы
❌ Монолитные компоненты (ImprovedTaskModal - 1556 строк)  
❌ Монолитные сервисы (WorkflowService - 687 строк)  
❌ Дублирование кода и бизнес-логики  
❌ Недостаточное тестирование  
❌ N+1 запросы к БД  

### Рекомендуемый подход
1. **Неделя 1-2:** Критические исправления (разбить монолиты, оптимизировать запросы)
2. **Неделя 3-4:** Написать тесты, создать утилиты
3. **Месяц 2:** Рефакторинг архитектуры
4. **Месяц 3+:** Внедрение новых фич и оптимизация

---

**Автор:** AI Architecture Audit  
**Дата:** 20.01.2026  
**Версия:** 1.0
