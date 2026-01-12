# Task Template Builder - Реализация

## ✅ Выполнено (Backend MVP)

### 🗄️ База данных
- ✅ Создана таблица `task_templates` (шаблоны задач)
- ✅ Создана таблица `task_field_templates` (определения полей)
- ✅ Добавлены индексы для производительности
- ✅ Расширена таблица `ProjectTasks` (template_id, custom_fields)
- ✅ Создано 3 предустановленных шаблона:
  - **AUDIT_STORE** - Аудит магазина (4 поля)
  - **BUDGET_APPROVAL** - Утверждение бюджета (3 поля)
  - **CONSTRUCTION** - СМР и ремонт (базовый шаблон)

### 📦 Модели (Go)
**Файл:** `backend-go/models/task_template.go`

- ✅ `TaskTemplate` - основная модель шаблона
- ✅ `TaskFieldTemplate` - определение поля
- ✅ 11 типов полей поддерживаются:
  - `text` - текстовое поле
  - `textarea` - многострочный текст
  - `number` - числовое поле
  - `date` - дата
  - `datetime` - дата и время
  - `select` - выпадающий список
  - `multiselect` - множественный выбор
  - `checkbox` - чекбокс
  - `file_upload` - загрузка файлов
  - `user_select` - выбор пользователя
  - `currency` - денежное поле
- ✅ Валидация на уровне модели
- ✅ JSON парсинг для правил валидации и опций

### 🔌 Repository Layer
**Файл:** `backend-go/repositories/task_template_repository.go`

- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ FindByCode - поиск по коду
- ✅ FindByCategory - фильтр по категории
- ✅ FindActive - только активные шаблоны
- ✅ Preload полей с сортировкой по order

### ⚙️ Service Layer
**Файл:** `backend-go/services/task_template_service.go`

- ✅ CreateTemplate - создание с валидацией
- ✅ UpdateTemplate - обновление
- ✅ DeleteTemplate - удаление
- ✅ GetTemplateByID, GetTemplateByCode - получение
- ✅ GetAllTemplates, GetActiveTemplates - списки
- ✅ **CloneTemplate** - клонирование шаблона
- ✅ **ToggleTemplateStatus** - активация/деактивация
- ✅ Проверка уникальности кода
- ✅ Валидация всех полей шаблона

### 🌐 API Endpoints
**Файл:** `backend-go/controllers/task_template_controller.go`

Все эндпоинты под `/api/task-templates` (только для admin):

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/` | Все шаблоны |
| GET | `/active` | Только активные |
| GET | `/category?category=Аудит` | По категории |
| GET | `/:id` | По ID |
| POST | `/` | Создать новый |
| PUT | `/:id` | Обновить |
| DELETE | `/:id` | Удалить |
| POST | `/:id/clone` | Клонировать |
| PATCH | `/:id/toggle` | Активировать/деактивировать |

**Защита:** Все эндпоинты требуют permission `role:manage` (только admin)

### 🧪 Тестирование API

Проверить работу можно так:

```bash
# 1. Получить все шаблоны
curl http://localhost:5000/api/task-templates \
  -H "Authorization: Bearer {token}"

# 2. Получить активные
curl http://localhost:5000/api/task-templates/active \
  -H "Authorization: Bearer {token}"

# 3. Получить конкретный шаблон
curl http://localhost:5000/api/task-templates/1 \
  -H "Authorization: Bearer {token}"

# 4. Создать новый шаблон
curl -X POST http://localhost:5000/api/task-templates \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST_TEMPLATE",
    "name": "Тестовый шаблон",
    "description": "Описание",
    "category": "Тест",
    "isActive": true,
    "fields": [
      {
        "fieldKey": "testField",
        "fieldLabel": "Тестовое поле",
        "fieldType": "text",
        "isRequired": true,
        "order": 1,
        "section": "Основное"
      }
    ]
  }'
```

---

## 🚧 В процессе (Frontend)

Следующий шаг - создать фронтенд:

### Что нужно создать:

1. **TypeScript типы** (`frontend-react/src/types/taskTemplate.ts`)
2. **API сервис** (`frontend-react/src/services/taskTemplates.ts`)
3. **Страница списка шаблонов** (`frontend-react/src/pages/TaskTemplateList.tsx`)
4. **Редактор шаблона** (`frontend-react/src/pages/TaskTemplateBuilder.tsx`)
5. **Навигация** - добавить в меню "Администрирование"

---

## 📊 База данных

### Структура task_templates
```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(100) UNIQUE    -- Уникальный код
name            VARCHAR(255)           -- Название
description     TEXT                   -- Описание
category        VARCHAR(100)           -- Категория
is_active       BOOLEAN               -- Активен ли
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Структура task_field_templates
```sql
id                  SERIAL PRIMARY KEY
template_id         INTEGER            -- FK к task_templates
field_key           VARCHAR(100)       -- Ключ поля (camelCase)
field_label         VARCHAR(255)       -- Отображаемое название
field_type          VARCHAR(50)        -- Тип поля
is_required         BOOLEAN           -- Обязательное?
is_visible          BOOLEAN           -- Видимое?
is_read_only        BOOLEAN           -- Только для чтения?
default_value       TEXT              -- Значение по умолчанию
validation_rules    TEXT              -- JSON правил валидации
options             TEXT              -- JSON опций (для select)
order               INTEGER           -- Порядок отображения
section             VARCHAR(100)      -- Секция группировки
placeholder         VARCHAR(255)      -- Подсказка
help_text           TEXT              -- Текст помощи
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Предустановленные данные

✅ **AUDIT_STORE** (Аудит магазина):
- auditDate (date, required)
- auditType (select, required) - Первичный/Повторный/Контрольный
- auditorNotes (textarea, optional)
- auditDocuments (file_upload, required)

✅ **BUDGET_APPROVAL** (Утверждение бюджета):
- budgetAmount (currency, required) - min: 1000
- approver (user_select, required)
- budgetDocument (file_upload, required)

✅ **CONSTRUCTION** (СМР):
- Пустой шаблон для кастомизации

---

## 🎯 Следующие шаги

1. ✅ Backend MVP - **ГОТОВО**
2. ⏳ Frontend типы и сервис
3. ⏳ UI список шаблонов
4. ⏳ UI редактор (Drag & Drop)
5. ⏳ Интеграция при создании задач

---

## 📝 Примечания

- Все API эндпоинты защищены permission middleware
- Только admin может управлять шаблонами
- Backend готов к использованию
- Миграция выполнена успешно
- 3 тестовых шаблона созданы в БД

**Статус:** ✅ Backend MVP завершен. Готов к frontend разработке.
