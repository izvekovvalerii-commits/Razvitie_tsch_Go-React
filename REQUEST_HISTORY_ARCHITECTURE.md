# Улучшение архитектуры логирования создания заявок

## Проблемы исходного решения

1. ❌ **DEBUG логи с `println`** - плохая практика для production кода
2. ❌ **Прямая зависимость** RequestService → ActivityService (tight coupling)
3. ❌ **Нарушение Single Responsibility Principle** - RequestService знает о деталях логирования
4. ❌ **Игнорирование ошибок** при логировании активности

## Улучшенное решение - Event-Driven Architecture

### Преимущества нового подхода:

✅ **Слабая связанность (Loose Coupling)**  
- RequestService больше не зависит от ActivityService
- Легче тестировать каждый компонент изолированно

✅ **Single Responsibility Principle**  
- RequestService отвечает только за создание заявок
- ActivityListener отвечает только за логирование активности

✅ **Open/Closed Principle**  
- Легко добавить новые обработчики событий без изменения существующего кода
- Другие сервисы могут подписаться на событие RequestCreated

✅ **Чистый код**  
- Убраны все DEBUG логи
- Нет длинных цепочек зависимостей

### Что было изменено:

#### 1. RequestService (`services/request_service.go`)
**Было:**
```go
type RequestService struct {
    repo                *repositories.RequestRepository
    notificationService *NotificationService
    activityService     *ActivityService  // ❌ Прямая зависимость
    eventBus            *events.InMemoryEventBus
}

func (s *RequestService) CreateRequest(request *models.Request) error {
    // ... создание заявки ...
    
    // ❌ Прямой вызов Logic прямо в сервисе
    if createdRequest.TaskID != nil && s.activityService != nil {
        println("DEBUG: Создание записи...")  // ❌ DEBUG логи
        err := s.activityService.LogActivity(...)
        if err != nil {
            println("ERROR: ...")  // ❌ println для ошибок
        }
    }
    
    s.eventBus.Publish(events.RequestCreatedEvent{...})
    return nil
}
```

**Стало:**
```go
type RequestService struct {
    repo                *repositories.RequestRepository
    notificationService *NotificationService
    // ✅ Убрана зависимость от activityService
    eventBus            *events.InMemoryEventBus
}

func (s *RequestService) CreateRequest(request *models.Request) error {
    // ... создание заявки ...
    
    // ✅ Просто публикуем событие
    // Логирование произойдет автоматически через слушателя
    s.eventBus.Publish(events.RequestCreatedEvent{
        Request: createdRequest,
        ActorID: createdRequest.CreatedByUserID,
    })
    
    return nil
}
```

#### 2. ActivityListener (`listeners/activity_listener.go`)
**Добавлено:**
```go
func (l *ActivityListener) Register(bus events.EventBus) {
    // ... существующие подписки ...
    bus.Subscribe(events.RequestCreated, l.OnRequestCreated)  // ✅ Новая подписка
}

// ✅ Новый обработчик
func (l *ActivityListener) OnRequestCreated(event events.Event) error {
    e, ok := event.(events.RequestCreatedEvent)
    if !ok {
        return nil
    }
    
    // Если заявка создана из задачи, добавляем запись в историю задачи
    if e.Request.TaskID != nil {
        return l.activityService.LogActivity(
            e.ActorID,
            "Создана заявка",
            models.EntityTask,
            *e.Request.TaskID,
            e.Request.Title,
            e.Request.ProjectID,
        )
    }
    
    return nil
}
```

#### 3. RequestController (`controllers/request_controller.go`)
**Было:**
```go
func (ctrl *RequestController) CreateRequest(c *gin.Context) {
    var request models.Request
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    println("DEBUG CONTROLLER: Получен запрос...")  // ❌
    println("DEBUG CONTROLLER: TaskID =", *request.TaskID)  // ❌
    // ... много DEBUG логов ...
    
    if err := ctrl.service.CreateRequest(&request); err != nil {
        println("DEBUG CONTROLLER: Ошибка...")  // ❌
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    println("DEBUG CONTROLLER: Заявка создана...")  // ❌
    c.JSON(http.StatusCreated, request)
}
```

**Стало:**
```go
func (ctrl *RequestController) CreateRequest(c *gin.Context) {
    var request models.Request
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // ✅ Чистый код без DEBUG логов
    if err := ctrl.service.CreateRequest(&request); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, request)
}
```

## Диаграмма потока данных

### Было (Прямая зависимость):
```
Frontend → RequestController → RequestService → ActivityService → DB
                                               ↓
                                          EventBus → NotificationListener
```

### Стало (Event-Driven):
```
Frontend → RequestController → RequestService → EventBus ┬→ ActivityListener → DB
                                                          ├→ NotificationListener
                                                          └→ (другие слушатели)
```

## Результат

🎉 **Функциональность сохранена**, но код стал:
- Чище
- Более тестируемым
- Легче расширяемым
- Следует SOLID принципам

## Тестирование

Создайте заявку из задачи и проверьте вкладку "История" - запись должна добавиться автоматически через событийный механизм.

```bash
# Проверка в БД
psql -h localhost -U valeriy.izvekov -d portal_razvitie -c \
  "SELECT \"Action\", \"EntityName\", \"CreatedAt\" 
   FROM \"UserActivities\" 
   WHERE \"EntityType\" = 'task' AND \"Action\" = 'Создана заявка' 
   ORDER BY \"CreatedAt\" DESC 
   LIMIT 5;"
```
