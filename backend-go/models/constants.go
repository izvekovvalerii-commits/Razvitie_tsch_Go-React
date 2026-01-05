package models

// ProjectStatus представляет статус проекта
type ProjectStatus string

// TaskStatus представляет статус задачи
type TaskStatus string

// ProjectType представляет тип проекта
type ProjectType string

// Project Statuses - статусы на основе задач workflow
const (
	ProjectStatusCreated        ProjectStatus = "Создан"
	ProjectStatusPrepAudit      ProjectStatus = "Подготовка к аудиту"
	ProjectStatusAuditObject    ProjectStatus = "Аудит объекта"
	ProjectStatusAlcoholLicense ProjectStatus = "Алкогольная лицензия"
	ProjectStatusWaste          ProjectStatus = "Площадка ТБО"
	ProjectStatusContour        ProjectStatus = "Контур планировки"
	ProjectStatusVisualization  ProjectStatus = "Визуализация"
	ProjectStatusLogistics      ProjectStatus = "Оценка логистики"
	ProjectStatusLayout         ProjectStatus = "Планировка с расстановкой"
	ProjectStatusBudgetEquip    ProjectStatus = "Расчет бюджета оборудования"
	ProjectStatusBudgetSecurity ProjectStatus = "Расчет бюджета СБ"
	ProjectStatusBudgetRSR      ProjectStatus = "ТЗ и расчет бюджета РСР"
	ProjectStatusBudgetPIS      ProjectStatus = "Расчет бюджета ПиС"
	ProjectStatusTotalBudget    ProjectStatus = "Общий бюджет проекта"
	ProjectStatusContractSigned ProjectStatus = "Подписан договор"
	ProjectStatusRSR            ProjectStatus = "РСР"
	ProjectStatusOpened         ProjectStatus = "Открыт"
	ProjectStatusFailed         ProjectStatus = "Слетел"
	ProjectStatusClosed         ProjectStatus = "Закрыт"
	ProjectStatusArchived       ProjectStatus = "Архив"
)

// Task Statuses - все возможные статусы задач
const (
	TaskStatusPending    TaskStatus = "Ожидание"
	TaskStatusAssigned   TaskStatus = "Назначена"
	TaskStatusInProgress TaskStatus = "В работе"
	TaskStatusReview     TaskStatus = "На проверке"
	TaskStatusCompleted  TaskStatus = "Завершена"
	TaskStatusExpired    TaskStatus = "Просрочена"
)

// Project Types - все возможные типы проектов
const (
	ProjectTypeOpening        ProjectType = "Открытие"
	ProjectTypeReconstruction ProjectType = "Реконструкция"
	ProjectTypeClosure        ProjectType = "Закрытие"
)

// Roles
const (
	RoleAdmin = "admin"
	RoleMP    = "МП"   // Менеджер проектов
	RoleMRiZ  = "МРиЗ" // Менеджер развития и закупок
	RoleBA    = "БА"   // Бизнес-аналитик
	RoleNOR   = "НОР"  // Начальник отдела развития
	RoleRNR   = "РНР"  // Руководитель направления развития
)

// Entity Types for Activity
const (
	EntityTask    = "task"
	EntityProject = "project"
	EntityStore   = "store"
)

// ValidProjectStatuses возвращает список всех валидных статусов проектов
func ValidProjectStatuses() []ProjectStatus {
	return []ProjectStatus{ProjectStatusCreated,
		ProjectStatusPrepAudit,
		ProjectStatusAuditObject,
		ProjectStatusAlcoholLicense,
		ProjectStatusWaste,
		ProjectStatusContour,
		ProjectStatusVisualization,
		ProjectStatusLogistics,
		ProjectStatusLayout,
		ProjectStatusBudgetEquip,
		ProjectStatusBudgetSecurity,
		ProjectStatusBudgetRSR,
		ProjectStatusBudgetPIS,
		ProjectStatusTotalBudget,
		ProjectStatusContractSigned,
		ProjectStatusRSR,
		ProjectStatusOpened,
		ProjectStatusFailed,
		ProjectStatusClosed,
		ProjectStatusArchived,
	}
}

// ValidTaskStatuses возвращает список всех валидных статусов задач
func ValidTaskStatuses() []TaskStatus {
	return []TaskStatus{
		TaskStatusPending,
		TaskStatusAssigned,
		TaskStatusInProgress,
		TaskStatusReview,
		TaskStatusCompleted,
		TaskStatusExpired,
	}
}

// ValidProjectTypes возвращает список всех валидных типов проектов
func ValidProjectTypes() []ProjectType {
	return []ProjectType{
		ProjectTypeOpening,
		ProjectTypeReconstruction,
		ProjectTypeClosure,
	}
}

// IsValidProjectStatus проверяет, является ли статус валидным
func IsValidProjectStatus(status string) bool {
	for _, s := range ValidProjectStatuses() {
		if string(s) == status {
			return true
		}
	}
	return false
}

// IsValidTaskStatus проверяет, является ли статус задачи валидным
func IsValidTaskStatus(status string) bool {
	for _, s := range ValidTaskStatuses() {
		if string(s) == status {
			return true
		}
	}
	return false
}

// IsValidProjectType проверяет, является ли тип проекта валидным
func IsValidProjectType(projectType string) bool {
	for _, t := range ValidProjectTypes() {
		if string(t) == projectType {
			return true
		}
	}
	return false
}
