# Multi-stage build for minimal image size
FROM golang:1.21-alpine AS builder

# Установка необходимых пакетов
RUN apk add --no-cache git

# Рабочая директория
WORKDIR /app

# Копирование файлов зависимостей
COPY go.mod go.sum ./

# Загрузка зависимостей
RUN go mod download

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o portal-razvitie main.go

# Production stage
FROM alpine:latest

# Установка ca-certificates для HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Копирование бинарника из builder
COPY --from=builder /app/portal-razvitie .

# Создание директории для загрузок
RUN mkdir -p /root/uploads

# Порт приложения
EXPOSE 5000

# Запуск приложения
CMD ["./portal-razvitie"]
