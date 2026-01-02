# 📦 Обзор всех сервисов проекта Portal Go + React

## 🔧 Backend Services (Go)

### 1. WorkflowService
**Файл**: `backend-go/services/workflow_service.go`  
**Назначение**: Управление workflow процессом открытия магазина

#### Методы:
```go
// Генерация задач для нового проекта
GenerateProjectTasks(projectID uint, projectCreatedAt time.Time) ([]models.ProjectTask, error)

// Обработка завершения задачи (активация зависимых задач)
ProcessTaskCompletion(taskID uint) error

// Валидация обязательных полей перед завершением задачи
ValidateTaskCompletion(task models.ProjectTask) error
```

#### Ключевые особенности:
- ✅ 13 задач процесса открытия магазина (BPMN)
- ✅ Автоматический расчет дат начала/окончания
- ✅ Управление зависимостями между задачами
- ✅ Валидация:
  - Обязательные поля (plannedAuditDate, actualAuditDate и т.д.)
  - Обязательные документы ("Технический план", "Фотографии объекта" и т.д.)
- ✅ Статусы задач: "Ожидание" → "Назначена" → "В работе" → "Завершена"

#### Пример использования:
```go
// В ProjectsController при создании проекта
tasks, err := workflowService.GenerateProjectTasks(project.ID, project.CreatedAt)

// В TasksController при изменении статуса
err := workflowService.ProcessTaskCompletion(task.ID)
```

---

## 🎨 Frontend Services (TypeScript)

### 1. ProjectsService
**Файл**: `frontend-react/src/services/projects.ts`

#### API методы:
```typescript
getProjects(): Promise<Project[]>
getProjectById(id: number): Promise<Project | undefined>
createProject(project: Project): Promise<Project>
deleteProject(id: number): Promise<void>
```

#### Endpoints:
- `GET /api/projects` - список всех проектов
- `GET /api/projects/:id` - получить проект по ID
- `POST /api/projects` - создать проект (автосоздает задачи)
- `DELETE /api/projects/:id` - удалить проект

---

### 2. TasksService
**Файл**: `frontend-react/src/services/tasks.ts`

#### API методы:
```typescript
getTasksByProjectId(projectId: number): Promise<ProjectTask[]>
createTask(task: ProjectTask): Promise<ProjectTask>
updateTask(task: ProjectTask): Promise<ProjectTask>
updateTaskStatus(taskId: number, status: string): Promise<void>
```

#### Endpoints:
- `GET /api/tasks/project/:projectId` - задачи проекта
- `POST /api/tasks` - создать задачу
- `PUT /api/tasks/:id` - обновить задачу
- `PATCH /api/tasks/:id/status` - изменить статус (триггерит workflow)

#### Особенности:
- Автоматическая активация зависимых задач при завершении
- Валидация обязательных полей на backend

---

### 3. StoresService
**Файл**: `frontend-react/src/services/stores.ts`

#### API методы:
```typescript
getStores(): Promise<Store[]>
getStoreById(id: number): Promise<Store | undefined>
createStore(store: Store): Promise<Store>
updateStore(id: number, store: Store): Promise<Store>
deleteStore(id: number): Promise<void>
```

#### Endpoints:
- `GET /api/stores` - список магазинов
- `GET /api/stores/:id` - получить магазин
- `POST /api/stores` - создать магазин
- `PUT /api/stores/:id` - обновить магазин
- `DELETE /api/stores/:id` - удалить магазин

#### Данные Store:
```typescript
{
  id: number
  gisCode: string
  name: string
  area: number
  region: string
  address: string
  format: string
  cfo: string
}
```

---

### 4. WorkflowService (Frontend)
**Файл**: `frontend-react/src/services/workflow.ts`

#### Константы и хелперы:
```typescript
// Определение задач BPMN процесса
STORE_OPENING_TASKS: BpmnTaskDefinition[]

interface BpmnTaskDefinition {
  code: string           // Код задачи (TASK-PREP-AUDIT)
  name: string           // Название
  role: string           // Ответственная роль (МП, МРиЗ, БА)
  dependsOn: string[]    // Зависимости от других задач
  type: string           // UserTask / ServiceTask
  stage: string          // Этап (Инициализация, Аудит, Бюджет)
  duration: number       // Длительность в днях
}
```

#### Задачи процесса:
1. **TASK-PREP-AUDIT** - Подготовка к аудиту (2 дня)
2. **TASK-AUDIT** - Аудит объекта (1 день)
3. **TASK-ALCO-LIC** - Алкогольная лицензия (2 дня)
4. **TASK-WASTE** - Площадка ТБО (2 дня)
5. **TASK-CONTOUR** - Контур планировки (1 день)
6. **TASK-VISUALIZATION** - Визуализация (1 день)
7. **TASK-LOGISTICS** - Оценка логистики (2 дня)
8. **TASK-LAYOUT** - Планировка с расстановкой (2 дня)
9. **TASK-BUDGET-EQUIP** - Расчет бюджета оборудования (2 дня)
10. **TASK-BUDGET-SECURITY** - Расчет бюджета СБ (2 дня)
11. **TASK-BUDGET-RSR** - ТЗ и расчет бюджета РСР (1 день)
12. **TASK-BUDGET-PIS** - Расчет бюджета ПиС (1 день)
13. **TASK-TOTAL-BUDGET** - Общий бюджет проекта (1 день)

---

### 5. UserActivityService
**Файл**: `frontend-react/src/services/user-activity.ts`

#### Назначение:
Отслеживание активности пользователя (mock/placeholder)

```typescript
trackActivity(action: string, data?: any): void
getUserActivity(): Activity[]
```

---

## 🔄 Взаимодействие сервисов

### Создание проекта:
```
1. Frontend: projectsService.createProject()
   ↓
2. Backend: POST /api/projects
   ↓
3. ProjectsController.CreateProject()
   ↓
4. WorkflowService.GenerateProjectTasks()
   ↓
5. Создаются 13 задач с зависимостями
   ↓
6. Возврат проекта с автосозданными задачами
```

### Завершение задачи:
```
1. Frontend: tasksService.updateTaskStatus(id, 'Завершена')
   ↓
2. Backend: PATCH /api/tasks/:id/status
   ↓
3. TasksController.UpdateTaskStatus()
   ↓
4. WorkflowService.ValidateTaskCompletion()
   ↓
5. Проверка обязательных полей и документов
   ↓
6. WorkflowService.ProcessTaskCompletion()
   ↓
7. Активация зависимых задач (статус: "Ожидание" → "Назначена")
```

---

## 📊 Статистика

| Категория | Количество | Файлов |
|-----------|------------|--------|
| Backend Services | 1 | workflow_service.go |
| Frontend Services | 5 | projects, tasks, stores, workflow, user-activity |
| API Endpoints | ~30 | GET, POST, PUT, PATCH, DELETE |
| BPMN Tasks | 13 | Задачи процесса открытия |

---

## 🔐 Безопасность

### Реализовано:
- ✅ Валидация входных данных (binding tags)
- ✅ Централизованная обработка ошибок
- ✅ CORS настроен

### TODO:
- ⏳ JWT аутентификация
- ⏳ RBAC (role-based access control)
- ⏳ Rate limiting
- ⏳ API ключи

---

## 📚 Дополнительная информация

- **Backend документация**: `backend-go/README.md`
- **Frontend hooks**: `frontend-react/src/hooks/`
- **Улучшения**: `IMPROVEMENTS.md`, `CRITICAL_FIXES_SUMMARY.md`
