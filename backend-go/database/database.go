package database

import (
	"log"
	"portal-razvitie/config"
	"portal-razvitie/models"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

var DB *gorm.DB

// CustomNamingStrategy implements GORM naming strategy for PascalCase
type CustomNamingStrategy struct{}

func (CustomNamingStrategy) TableName(table string) string {
	return table // Return table name as-is (e.g., "Stores")
}

func (CustomNamingStrategy) SchemaName(table string) string {
	return table
}

func (CustomNamingStrategy) ColumnName(table, column string) string {
	// Convert to PascalCase: first letter uppercase, rest as-is
	if len(column) == 0 {
		return column
	}
	// Special handling for common abbreviations
	if strings.HasPrefix(column, "id") && len(column) == 2 {
		return "Id"
	}
	return strings.ToUpper(column[:1]) + column[1:]
}

func (CustomNamingStrategy) JoinTableName(table string) string {
	return table
}

func (CustomNamingStrategy) RelationshipFKName(relationship schema.Relationship) string {
	return relationship.Name + "Id"
}

func (CustomNamingStrategy) CheckerName(table, column string) string {
	return "chk_" + table + "_" + column
}

func (CustomNamingStrategy) IndexName(table, column string) string {
	return "idx_" + table + "_" + column
}

func (CustomNamingStrategy) UniqueName(table, column string) string {
	return "uni_" + table + "_" + column
}

func Connect(cfg *config.Config) error {
	var err error

	DB, err = gorm.Open(postgres.Open(cfg.GetDSN()), &gorm.Config{
		Logger:         logger.Default.LogMode(logger.Info),
		NamingStrategy: &CustomNamingStrategy{},
	})

	if err != nil {
		return err
	}

	log.Println("✅ Database connection established")

	var dbName, inetServerAddr string
	DB.Raw("SELECT current_database()").Scan(&dbName)
	DB.Raw("SELECT inet_server_addr() || ':' || inet_server_port()").Scan(&inetServerAddr)
	log.Printf("📂 Connected to database: '%s' at '%s'", dbName, inetServerAddr)

	// Check existing stores count
	var count int64
	DB.Table("Stores").Count(&count)
	log.Printf("📊 Existing stores in DB: %d", count)

	return nil
}

func AutoMigrate() error {
	log.Println("🔄 Running database migrations...")

	err := DB.AutoMigrate(
		&models.Store{},
		&models.User{},
		&models.Project{},
		&models.ProjectTask{},
		&models.ProjectDocument{},
		&models.Notification{},
		&models.Role{},
		&models.Permission{},
	)

	if err != nil {
		return err
	}

	log.Println("✅ Database migrations completed")
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
