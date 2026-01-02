# Portal Go + React

Современный портал управления проектами на базе **Go backend** и **React frontend**.

## Структура проекта

```
Portal_go_react/
├── backend-go/          # Go backend (Gin + GORM + PostgreSQL)
└── frontend-react/      # React frontend (Vite + TypeScript)
```

## Технологический стек

### Backend (Go)
- Framework: Gin (HTTP router)
- ORM: GORM
- Database: PostgreSQL 14+
- Port: 8080

### Frontend (React)
- Framework: React 18 + TypeScript
- Build tool: Vite
- Port: 5173
- Proxy: /api → http://localhost:8080

## Запуск проекта

### 1. Backend (Go)
```bash
cd backend-go
go run main.go
```

### 2. Frontend (React)
```bash
cd frontend-react
npm install
npm run dev
```

Откроется на http://localhost:5173

## Особенности

✅ Обновленные задачи согласно BPMN
✅ Оптимизированный Gantt Chart
✅ Workflow Engine с автогенерацией задач
✅ Валидация обязательных полей

## База данных

PostgreSQL: portal_razvitie (та же, что и .NET версия)
