package models

import "time"

type UserActivity struct {
	ID     uint `gorm:"primaryKey" json:"id"`
	UserID uint `json:"userId"`
	User   User `gorm:"foreignKey:UserID" json:"user,omitempty"` // User details for the activity

	Action     string `json:"action"`     // e.g. "изменил статус на 'В работе'"
	EntityType string `json:"entityType"` // "task", "project"
	EntityID   uint   `json:"entityId"`
	EntityName string `json:"entityName"` // "Разработка макета"

	ProjectID *uint    `json:"projectId,omitempty"`
	Project   *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`

	CreatedAt time.Time `json:"timestamp"`
}
