package models

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID  uint       `gorm:"index;not null" json:"userId"`
	Title   string     `gorm:"not null" json:"title"`
	Message string     `gorm:"not null" json:"message"`
	Type    string     `json:"type"` // e.g. 'TASK', 'SYSTEM', 'ALERT'
	Link    string     `json:"link"` // e.g. "/projects/123"
	IsRead  bool       `gorm:"default:false" json:"isRead"`
	ReadAt  *time.Time `json:"readAt"`

	// Related entities for navigation
	RelatedProjectID *uint `json:"relatedProjectId,omitempty"`
	RelatedTaskID    *uint `json:"relatedTaskId,omitempty"`
}
