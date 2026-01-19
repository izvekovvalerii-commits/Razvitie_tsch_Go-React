package models

import (
	"errors"
	"time"
)

// RequestStatus представляет статус заявки
type RequestStatus string

const (
	RequestStatusNew        RequestStatus = "Новая"     // Создана, не просмотрена
	RequestStatusInProgress RequestStatus = "В работе"  // Ответственный принял в работу
	RequestStatusAnswered   RequestStatus = "Отвечена"  // Ответственный предоставил информацию
	RequestStatusClosed     RequestStatus = "Закрыта"   // Инициатор закрыл заявку
	RequestStatusRejected   RequestStatus = "Отклонена" // Ответственный отклонил заявку
)

// RequestPriority представляет приоритет заявки
type RequestPriority string

const (
	RequestPriorityLow    RequestPriority = "Низкий"
	RequestPriorityMedium RequestPriority = "Средний"
	RequestPriorityHigh   RequestPriority = "Высокий"
	RequestPriorityUrgent RequestPriority = "Срочный"
)

// Request представляет заявку на получение информации
type Request struct {
	ID          uint   `gorm:"column:Id;primaryKey" json:"id"`
	Title       string `gorm:"column:Title;type:varchar(255);not null" json:"title" binding:"required"`
	Description string `gorm:"column:Description;type:text" json:"description"`
	Status      string `gorm:"column:Status;type:varchar(50);default:'Новая'" json:"status"`
	Priority    string `gorm:"column:Priority;type:varchar(50);default:'Средний'" json:"priority"`

	// Инициатор заявки
	CreatedByUserID uint  `gorm:"column:CreatedByUserId;not null" json:"createdByUserId" binding:"required"`
	CreatedByUser   *User `gorm:"foreignKey:CreatedByUserId" json:"createdByUser,omitempty"`

	// Ответственный за выполнение заявки
	AssignedToUserID uint  `gorm:"column:AssignedToUserId;not null" json:"assignedToUserId" binding:"required"`
	AssignedToUser   *User `gorm:"foreignKey:AssignedToUserId" json:"assignedToUser,omitempty"`

	// Ответ на заявку
	Response string `gorm:"column:Response;type:text" json:"response"`

	// Связь с проектом (опционально)
	ProjectID *uint    `gorm:"column:ProjectId" json:"projectId"`
	Project   *Project `gorm:"foreignKey:ProjectId" json:"project,omitempty"`

	// Связь с задачей (опционально)
	TaskID *uint        `gorm:"column:TaskId" json:"taskId"`
	Task   *ProjectTask `gorm:"foreignKey:TaskId" json:"task,omitempty"`

	// Временные метки
	CreatedAt  time.Time  `gorm:"column:CreatedAt" json:"createdAt"`
	UpdatedAt  time.Time  `gorm:"column:UpdatedAt" json:"updatedAt"`
	TakenAt    *time.Time `gorm:"column:TakenAt" json:"takenAt"`       // Когда взята в работу
	AnsweredAt *time.Time `gorm:"column:AnsweredAt" json:"answeredAt"` // Когда отвечена
	ClosedAt   *time.Time `gorm:"column:ClosedAt" json:"closedAt"`     // Когда закрыта

	// Дедлайн
	DueDate *time.Time `gorm:"column:DueDate" json:"dueDate"`
}

func (Request) TableName() string {
	return "Requests"
}

// Validate проверяет корректность данных заявки
func (r *Request) Validate() error {
	// Проверка обязательных полей
	if r.Title == "" {
		return errors.New("название заявки обязательно")
	}

	if r.CreatedByUserID == 0 {
		return errors.New("инициатор заявки обязателен")
	}

	if r.AssignedToUserID == 0 {
		return errors.New("ответственный за заявку обязателен")
	}

	// Проверка, что инициатор и ответственный - разные пользователи
	if r.CreatedByUserID == r.AssignedToUserID {
		return errors.New("инициатор и ответственный не могут быть одним и тем же пользователем")
	}

	// Валидация статуса
	if r.Status != "" && !IsValidRequestStatus(r.Status) {
		return errors.New("недопустимый статус заявки")
	}

	// Валидация приоритета
	if r.Priority != "" && !IsValidRequestPriority(r.Priority) {
		return errors.New("недопустимый приоритет заявки")
	}

	return nil
}

// SetDefaultValues устанавливает значения по умолчанию
func (r *Request) SetDefaultValues() {
	if r.Status == "" {
		r.Status = string(RequestStatusNew)
	}
	if r.Priority == "" {
		r.Priority = string(RequestPriorityMedium)
	}
}

// IsValidRequestStatus проверяет валидность статуса заявки
func IsValidRequestStatus(status string) bool {
	validStatuses := []RequestStatus{
		RequestStatusNew,
		RequestStatusInProgress,
		RequestStatusAnswered,
		RequestStatusClosed,
		RequestStatusRejected,
	}
	for _, validStatus := range validStatuses {
		if string(validStatus) == status {
			return true
		}
	}
	return false
}

// IsValidRequestPriority проверяет валидность приоритета заявки
func IsValidRequestPriority(priority string) bool {
	validPriorities := []RequestPriority{
		RequestPriorityLow,
		RequestPriorityMedium,
		RequestPriorityHigh,
		RequestPriorityUrgent,
	}
	for _, validPriority := range validPriorities {
		if string(validPriority) == priority {
			return true
		}
	}
	return false
}

// IsClosed проверяет, закрыта ли заявка
func (r *Request) IsClosed() bool {
	return r.Status == string(RequestStatusClosed) || r.Status == string(RequestStatusRejected)
}

// IsOverdue проверяет, просрочена ли заявка
func (r *Request) IsOverdue() bool {
	if r.IsClosed() || r.DueDate == nil {
		return false
	}
	return time.Now().After(*r.DueDate)
}

// CanBeAnswered проверяет, может ли заявка быть отвечена
func (r *Request) CanBeAnswered() bool {
	return r.Status == string(RequestStatusInProgress) || r.Status == string(RequestStatusNew)
}

// CanBeClosed проверяет, может ли заявка быть закрыта
func (r *Request) CanBeClosed() bool {
	return r.Status == string(RequestStatusAnswered)
}
