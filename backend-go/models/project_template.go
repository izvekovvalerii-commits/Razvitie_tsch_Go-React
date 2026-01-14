package models

import (
	"time"

	"github.com/lib/pq"
)

// ProjectTemplate представляет шаблон проекта с набором задач
type ProjectTemplate struct {
	ID          uint      `gorm:"primaryKey;column:ID" json:"id"`
	Name        string    `gorm:"column:Name;not null" json:"name"`
	Description string    `gorm:"column:Description" json:"description"`
	Category    string    `gorm:"column:Category" json:"category"` // e.g., "Открытие", "Реконструкция"
	IsActive    bool      `gorm:"column:IsActive;default:true" json:"isActive"`
	IsDefault   bool      `gorm:"column:IsDefault;default:false" json:"isDefault"` // Шаблон по умолчанию
	CreatedAt   time.Time `gorm:"column:CreatedAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:UpdatedAt" json:"updatedAt"`

	// Связь с задачами шаблона
	Tasks []TemplateTask `gorm:"foreignKey:ProjectTemplateID" json:"tasks"`
}

// TemplateTask задача в шаблоне проекта
type TemplateTask struct {
	ID                uint           `gorm:"primaryKey;column:ID" json:"id"`
	ProjectTemplateID uint           `gorm:"column:ProjectTemplateID;not null;uniqueIndex:idx_template_task_code" json:"projectTemplateId"`
	Code              string         `gorm:"column:Code;not null;uniqueIndex:idx_template_task_code" json:"code"`
	Name              string         `gorm:"column:Name;not null" json:"name"`
	Duration          int            `gorm:"column:Duration;not null" json:"duration"`
	Stage             string         `gorm:"column:Stage" json:"stage"`
	DependsOn         pq.StringArray `gorm:"column:DependsOn;type:text[]" json:"dependsOn"`
	ResponsibleRole   string         `gorm:"column:ResponsibleRole" json:"responsibleRole"`
	TaskType          string         `gorm:"column:TaskType;default:UserTask" json:"taskType"`
	Order             int            `gorm:"column:Order;default:0" json:"order"` // Порядок задачи

	// Optional link to master TaskTemplate
	TaskTemplateID *uint         `gorm:"column:TaskTemplateID" json:"taskTemplateId"`
	TaskTemplate   *TaskTemplate `gorm:"foreignKey:TaskTemplateID" json:"taskTemplate,omitempty"`

	CreatedAt time.Time `gorm:"column:CreatedAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:UpdatedAt" json:"updatedAt"`
}

// TableName для GORM
func (ProjectTemplate) TableName() string {
	return "ProjectTemplate"
}

// TableName для GORM
func (TemplateTask) TableName() string {
	return "TemplateTask"
}
