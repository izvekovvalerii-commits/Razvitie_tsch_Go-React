package models

import "time"

type TaskComment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"createdAt"`

	TaskID uint `gorm:"column:TaskId" json:"taskId"`
	UserID uint `gorm:"column:UserId" json:"userId"`
	User   User `gorm:"foreignKey:UserID" json:"user"`

	Content string `json:"content"`
}
