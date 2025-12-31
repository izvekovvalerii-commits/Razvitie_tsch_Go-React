.PHONY: help run build test clean install dev prod docker

help: ## Показать справку
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости
	go mod download
	go mod tidy

run: ## Запустить сервер в режиме разработки
	@echo "🚀 Запуск сервера..."
	@go run main.go

dev: ## Запустить с hot-reload (требует air)
	@echo "🔥 Запуск с hot-reload..."
	@air

build: ## Собрать бинарный файл
	@echo "🔨 Сборка..."
	@go build -o portal-razvitie main.go
	@echo "✅ Готово! Запустите ./portal-razvitie"

build-linux: ## Собрать для Linux
	@echo "🐧 Сборка для Linux..."
	@GOOS=linux GOARCH=amd64 go build -o portal-razvitie-linux main.go
	@echo "✅ Готово!"

build-windows: ## Собрать для Windows
	@echo "🪟 Сборка для Windows..."
	@GOOS=windows GOARCH=amd64 go build -o portal-razvitie.exe main.go
	@echo "✅ Готово!"

test: ## Запустить тесты
	@echo "🧪 Запуск тестов..."
	@go test -v ./...

test-coverage: ## Запустить тесты с покрытием
	@echo "📊 Тесты с покрытием..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out

clean: ## Очистить сгенерированные файлы
	@echo "🧹 Очистка..."
	@rm -f portal-razvitie portal-razvitie-linux portal-razvitie.exe
	@rm -f coverage.out
	@rm -rf uploads/*
	@echo "✅ Очищено!"

format: ## Форматировать код
	@echo "✨ Форматирование кода..."
	@go fmt ./...
	@echo "✅ Готово!"

lint: ## Проверить код линтером
	@echo "🔍 Проверка линтером..."
	@golint ./...

vet: ## Проверить код vet
	@echo "🔬 Проверка vet..."
	@go vet ./...

check: format vet ## Форматирование и проверка кода

docker-build: ## Собрать Docker образ
	@echo "🐳 Сборка Docker образа..."
	@docker build -t portal-razvitie:latest .
	@echo "✅ Готово!"

docker-run: ## Запустить в Docker
	@echo "🐳 Запуск в Docker..."
	@docker run -p 5000:5000 --env-file .env portal-razvitie:latest

prod: ## Запустить в production режиме
	@echo "🚀 Запуск в production..."
	@GIN_MODE=release ./portal-razvitie

migrate: ## Запустить миграции БД
	@echo "🔄 Миграции БД..."
	@go run main.go migrate

health: ## Проверить health endpoint
	@curl -s http://localhost:5000/health | python3 -m json.tool || curl -s http://localhost:5000/health

api-test: ## Протестировать основные API endpoints
	@echo "🧪 Тестирование API..."
	@echo "Health:"
	@curl -s http://localhost:5000/health
	@echo "\n\nStores:"
	@curl -s http://localhost:5000/api/stores | head -c 200
	@echo "\n\nProjects:"
	@curl -s http://localhost:5000/api/projects | head -c 200
	@echo "\n\nTasks:"
	@curl -s http://localhost:5000/api/tasks | head -c 200
	@echo "\n✅ Готово!"

.DEFAULT_GOAL := help
