package models

import (
	"time"

	"gorm.io/gorm"
)

type UserActivity struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deletedAt,omitempty"`

	UserID     uint     `gorm:"column:UserId" json:"userId"`
	User       User     `gorm:"foreignKey:UserID" json:"user,omitempty"` // User details for the activity
	Action     string   `gorm:"column:Action" json:"action"`             // e.g. "изменил статус на 'В работе'"
	EntityType string   `gorm:"column:EntityType" json:"entityType"`     // "task", "project"
	EntityID   uint     `gorm:"column:EntityId" json:"entityId"`
	EntityName string   `gorm:"column:EntityName" json:"entityName"` // "Разработка макета"
	ProjectID  *uint    `gorm:"column:ProjectId" json:"projectId,omitempty"`
	Project    *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

// TableName overrides the table name for GORM
func (*UserActivity) TableName() string {
	return "UserActivities"
}
