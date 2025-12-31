package models

import (
	"time"
)

type ProjectDocument struct {
	ID          uint      `gorm:"column:Id;primaryKey" json:"id"`
	ProjectID   uint      `gorm:"column:ProjectId;not null" json:"projectId" binding:"required"`
	TaskID      *int      `gorm:"column:TaskId" json:"taskId"`
	Name        string    `gorm:"column:Name;type:varchar(255);not null" json:"name" binding:"required"`
	Type        string    `gorm:"column:Type;type:varchar(100);not null" json:"type" binding:"required"`
	UploadDate  time.Time `gorm:"column:UploadDate;not null" json:"uploadDate"`
	Version     int       `gorm:"column:Version;default:1" json:"version"`
	Author      string    `gorm:"column:Author;type:varchar(255);default:'Системный Администратор'" json:"author"`
	Status      string    `gorm:"column:Status;type:varchar(50);default:'Доступен'" json:"status"`
	FilePath    string    `gorm:"column:FilePath;type:text;not null" json:"filePath"`
	FileName    string    `gorm:"column:FileName;type:varchar(255);not null" json:"fileName"`
	ContentType string    `gorm:"column:ContentType;type:varchar(100)" json:"contentType"`
	Size        int64     `gorm:"column:Size" json:"size"`
}

func (ProjectDocument) TableName() string {
	return "ProjectDocuments"
}
