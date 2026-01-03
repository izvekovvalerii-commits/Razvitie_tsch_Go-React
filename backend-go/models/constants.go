package models

// Project Statuses
const (
	ProjectStatusCreated    = "Создан"
	ProjectStatusInProgress = "В работе"
	ProjectStatusCompleted  = "Завершен"
	ProjectStatusArchived   = "Архив"
	ProjectStatusPlanning   = "Planning" // Пример legacy статусов, если есть
	ProjectStatusActive     = "Active"
	ProjectStatusRenovation = "Renovation"
)

// Task Statuses
const (
	TaskStatusAssigned   = "Назначена"
	TaskStatusInProgress = "В работе"
	TaskStatusReview     = "На проверке"
	TaskStatusCompleted  = "Завершена"
	TaskStatusExpired    = "Просрочена"
)

// Roles
const (
	RoleAdmin = "admin"
	RoleMP    = "МП" // Менеджер проектов
	RoleMRiZ  = "МРиЗ"
	RoleBA    = "БА" // Бизнес-аналитик
)

// Entity Types for Activity
const (
	EntityTask    = "task"
	EntityProject = "project"
)
