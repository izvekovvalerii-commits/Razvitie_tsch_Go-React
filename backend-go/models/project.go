package models

import (
	"time"
)

type Project struct {
	ID          uint       `gorm:"column:Id;primaryKey" json:"id"`
	StoreID     uint       `gorm:"column:StoreId;not null" json:"storeId" binding:"required,gt=0"`
	ProjectType string     `gorm:"column:ProjectType;type:varchar(50);not null" json:"projectType" binding:"required,oneof=Открытие Реконструкция Закрытие"`
	Status      string     `gorm:"column:Status;type:varchar(50);default:'Создан'" json:"status" binding:"omitempty,oneof=Создан Аудит 'Бюджет сформирован' 'Утвержден ИК' 'Подписан договор' РСР Открыт Слетел"`
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
}

func (Project) TableName() string {
	return "Projects"
}
