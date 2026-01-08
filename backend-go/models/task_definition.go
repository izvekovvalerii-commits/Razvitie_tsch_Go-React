package models

import "github.com/lib/pq"

// TaskDefinition represents a template for a task in the standard workflow.
type TaskDefinition struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Code              string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"code"`
	Name              string         `gorm:"type:varchar(255);not null" json:"name"`
	Duration          int            `gorm:"not null" json:"duration"`     // Default duration in days
	DependsOn         pq.StringArray `gorm:"type:text[]" json:"dependsOn"` // Codes of tasks this depends on
	ResponsibleRole   string         `gorm:"type:varchar(50)" json:"responsibleRole"`
	ResponsibleUserID *int           `json:"responsibleUserId"` // Optional fixed user ID
	TaskType          string         `gorm:"type:varchar(50)" json:"taskType"`
	Stage             string         `gorm:"type:varchar(100)" json:"stage"`
}
