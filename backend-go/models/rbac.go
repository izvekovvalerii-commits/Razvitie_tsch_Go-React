package models

// Permission represents a specific action allowed in the system
type Permission struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Code        string `gorm:"type:varchar(100);uniqueIndex;not null" json:"code"` // e.g., "project:create"
	Description string `gorm:"type:varchar(255)" json:"description"`
}

// Role represents a user role holding a collection of permissions
type Role struct {
	ID          uint         `gorm:"primaryKey" json:"id"`
	Code        string       `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"` // e.g., "МП". Matches User.Role
	Name        string       `gorm:"type:varchar(100)" json:"name"`                     // Human readable name
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions"`
}
