# Docker Development Guide

## Быстрый старт

### Первый запуск

```bash
# 1. Скопируйте .env.example в .env и настройте переменные
cp .env.example .env

# 2. Запустите все сервисы
docker-compose up -d

# 3. Проверьте статус
docker-compose ps
```

## Доступ к приложению

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Database:** localhost:5432
- **Health Check:** http://localhost:5000/health

## Полезные команды

### Управление контейнерами

```bash
# Запустить все сервисы
docker-compose up -d

# Остановить все сервисы
docker-compose down

# Перезапустить сервис
docker-compose restart backend

# Посмотреть логи
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Зайти в контейнер
docker-compose exec backend sh
docker-compose exec postgres psql -U portal_user -d portal_razvitie
```

###Пересборка

```bash
# Пересобрать все образы
docker-compose build

# Пересобрать конкретный сервис
docker-compose build backend

# Пересобрать и запустить
docker-compose up -d --build
```

### Очистка

```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить контейнеры и volumes (включая БД!)
docker-compose down -v

# Удалить все неиспользуемые образы
docker system prune -a
```

## Работа с базой данных

### Миграции

Миграции выполняются автоматически при первом запуске из папки `backend-go/migrations/`.

### Подключиться к БД

```bash
# Через docker-compose
docker-compose exec postgres psql -U portal_user -d portal_razvitie

# Напрямую
psql -h localhost -p 5432 -U portal_user -d portal_razvitie
```

### Бэкап и восстановление

```bash
# Создать бэкап
docker-compose exec postgres pg_dump -U portal_user portal_razvitie > backup.sql

# Восстановить из бэкапа
docker-compose exec -T postgres psql -U portal_user portal_razvitie < backup.sql
```

## Development vs Production

### Development (текущая конфигурация)

- Hot reload для frontend и backend
- Исходный код монтируется как volume
- Debug режим включен
- Подробные логи

### Production

Для продакшена нужно:

1. Изменить `GIN_MODE=release` в `.env`
2. Убрать volume моунты в `docker-compose.yml` 
3. Использовать собранные образы вместо live mount
4. Настроить SSL/TLS
5. Добавить reverse proxy (nginx/traefik)

## Troubleshooting

### Порты заняты

Если порты 5000 или 5173 заняты:

```bash
# Изменить порты в .env
SERVER_PORT=5001
# Затем в docker-compose.yml обновить маппинг портов
```

### База данных не стартует

```bash
# Проверьте логи
docker-compose logs postgres

# Удалите volume и создайте заново
docker-compose down -v
docker-compose up -d
```

### Backend не подключается к БД

```bash
# Проверьте что postgres здоров
docker-compose ps

# Проверьте логи бэкенда
docker-compose logs backend

# Убедитесь что DB_HOST=postgres в environment backend
```

### Frontend не видит backend

```bash
# Проверьте что backend запущен
docker-compose ps backend

# Проверьте nginx конфигурацию в контейнере
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

## Переменные окружения

См. `.env.example` для полного списка переменных.

Основные:

- `DB_NAME` - Имя БД
- `DB_USER` - Пользователь БД
- `DB_PASSWORD` - Пароль БД
- `SERVER_PORT` - Порт backend
- `GIN_MODE` - Режим Gin (debug/release)

## Monitoring

### Проверка здоровья сервисов

```bash
# Health check backend
curl http://localhost:5000/health

# Проверка БД
docker-compose exec postgres pg_isready -U portal_user

# Метрики контейнеров
docker stats
```

## CI/CD Integration

Для интеграции с CI/CD используйте:

```bash
# В вашем CI pipeline
docker-compose -f docker-compose.yml -f docker-compose.ci.yml up -d
docker-compose run backend go test ./...
docker-compose run frontend npm test
```

## Полезные ссылки

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
