package models

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Login     string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"login"`
	Role      string    `gorm:"type:varchar(50);not null" json:"role"` // "МП", "МРиЗ", "БА", "admin"
	Avatar    string    `gorm:"type:varchar(100)" json:"avatar"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
