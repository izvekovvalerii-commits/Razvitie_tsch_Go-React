# Быстрый старт Portal Go + React

## Шаг 1: Проверьте PostgreSQL

```bash
psql -U postgres -d portal_razvitie -c "SELECT current_database();"
```

Должна вернуться база `portal_razvitie`

## Шаг 2: Запустите Go Backend

```bash
cd backend-go
go run main.go
```

Должно появиться:
```
✅ Database connection established
🚀 Server is running on http://localhost:8080
```

## Шаг 3: Запустите React Frontend (в новом терминале)

```bash
cd frontend-react
npm install  # только первый раз
npm run dev
```

Откроется на: http://localhost:5173

## Проверка работы

1. Откройте http://localhost:5173
2. Создайте новый проект
3. Посмотрите Gantt Chart - задачи должны иметь НОВЫЕ длительности:
   - TASK-AUDIT: 1 день (не 3!)
   - TASK-ALCO-LIC: 2 дня (не 5!)
   - И т.д. согласно BPMN

✅ Если все работает - проект настроен правильно!
