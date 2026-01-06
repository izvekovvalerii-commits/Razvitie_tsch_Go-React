package models

import (
	"errors"
	"time"
)

type Project struct {
	ID          uint       `gorm:"column:Id;primaryKey" json:"id"`
	StoreID     uint       `gorm:"column:StoreId;not null" json:"storeId" binding:"required,gt=0"`
	ProjectType string     `gorm:"column:ProjectType;type:varchar(50);not null" json:"projectType" binding:"required"`
	Status      string     `gorm:"column:Status;type:varchar(50);default:'Создан'" json:"status" binding:"omitempty"`
	GISCode     string     `gorm:"column:GisCode;type:varchar(50)" json:"gisCode" binding:"omitempty,min=3,max=50"`
	Address     string     `gorm:"column:Address;type:text" json:"address" binding:"omitempty,min=5,max=500"`
	TotalArea   *float64   `gorm:"column:TotalArea" json:"totalArea" binding:"omitempty,gt=0,lt=100000"`
	TradeArea   *float64   `gorm:"column:TradeArea" json:"tradeArea" binding:"omitempty,gt=0,ltfield=TotalArea"`
	Region      string     `gorm:"column:Region;type:varchar(100)" json:"region" binding:"omitempty,min=2,max=100"`
	CFO         string     `gorm:"column:CFO;type:varchar(100)" json:"cfo"`
	MP          string     `gorm:"column:MP;type:varchar(255)" json:"mp"`
	NOR         string     `gorm:"column:NOR;type:varchar(255)" json:"nor"`
	StMRiZ      string     `gorm:"column:StMRiZ;type:varchar(255)" json:"stMRiZ"`
	RNR         string     `gorm:"column:RNR;type:varchar(255)" json:"rnr"`
	CreatedAt   time.Time  `gorm:"column:CreatedAt" json:"createdAt"`
	UpdatedAt   *time.Time `gorm:"column:UpdatedAt" json:"updatedAt"`
	Store       *Store     `gorm:"foreignKey:StoreId;references:Id" json:"store,omitempty"`

	// Вычисляемые поля для прогресс-бара
	TotalTasks     int64 `gorm:"-" json:"totalTasks"`
	CompletedTasks int64 `gorm:"-" json:"completedTasks"`
}

func (Project) TableName() string {
	return "Projects"
}

// Validate проверяет корректность данных проекта
func (p *Project) Validate() error {
	// Проверка обязательных полей
	if p.StoreID == 0 {
		return errors.New("storeId обязателен")
	}

	if p.ProjectType == "" {
		return errors.New("тип проекта обязателен")
	}

	// Валидация типа проекта через константы
	if !IsValidProjectType(p.ProjectType) {
		return errors.New("недопустимый тип проекта")
	}

	// Валидация статуса проекта
	if p.Status != "" && !IsValidProjectStatus(p.Status) {
		return errors.New("недопустимый статус проекта")
	}

	// Проверка GIS кода если указан
	if p.GISCode != "" && (len(p.GISCode) < 3 || len(p.GISCode) > 50) {
		return errors.New("код ГИС должен быть от 3 до 50 символов")
	}

	// Проверка площадей
	if p.TotalArea != nil && *p.TotalArea <= 0 {
		return errors.New("общая площадь должна быть положительным числом")
	}

	if p.TradeArea != nil && p.TotalArea != nil {
		if *p.TradeArea <= 0 {
			return errors.New("торговая площадь должна быть положительным числом")
		}
		if *p.TradeArea > *p.TotalArea {
			return errors.New("торговая площадь не может превышать общую площадь")
		}
	}

	return nil
}

// SetDefaultValues устанавливает значения по умолчанию
func (p *Project) SetDefaultValues() {
	if p.Status == "" {
		p.Status = string(ProjectStatusCreated)
	}
}
