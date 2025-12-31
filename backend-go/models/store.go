package models

import (
	"time"
)

type Store struct {
	ID          uint      `gorm:"column:Id;primaryKey" json:"id"`
	Code        string    `gorm:"column:Code;type:varchar(50);not null" json:"code" binding:"required"`
	Name        string    `gorm:"column:Name;type:varchar(255);not null" json:"name" binding:"required"`
	Address     string    `gorm:"column:Address;type:text" json:"address"`
	City        string    `gorm:"column:City;type:varchar(100)" json:"city"`
	Region      string    `gorm:"column:Region;type:varchar(100)" json:"region"`
	TotalArea   float64   `gorm:"column:TotalArea" json:"totalArea"`
	TradeArea   float64   `gorm:"column:TradeArea" json:"tradeArea"`
	Status      string    `gorm:"column:Status;type:varchar(50);default:'Active'" json:"status"`
	OpeningDate time.Time `gorm:"column:OpeningDate" json:"openingDate"`
	CreatedAt   time.Time `gorm:"column:CreatedAt" json:"createdAt"`
}

func (Store) TableName() string {
	return "Stores"
}
