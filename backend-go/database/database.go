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

// Connect establishes a database connection and returns the GORM DB instance
func Connect(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.GetDSN()), &gorm.Config{
		Logger:         logger.Default.LogMode(logger.Info),
		NamingStrategy: &CustomNamingStrategy{},
	})

	if err != nil {
		return nil, err
	}

	log.Println("✅ Database connection established")

	var dbName, inetServerAddr string
	db.Raw("SELECT current_database()").Scan(&dbName)
	db.Raw("SELECT inet_server_addr() || ':' || inet_server_port()").Scan(&inetServerAddr)
	log.Printf("📂 Connected to database: '%s' at '%s'", dbName, inetServerAddr)

	return db, nil
}

// AutoMigrate runs database migrations for the given DB instance
func AutoMigrate(db *gorm.DB) error {
	log.Println("🔄 Running database migrations...")

	// Удаляем старый индекс, который мог быть создан как глобально уникальный по Code
	// Мы игнорируем ошибку, так как индекcа может и не быть
	_ = db.Migrator().DropIndex(&models.TemplateTask{}, "idx_template_task_code")

	err := db.AutoMigrate(
		&models.Store{},
		&models.User{},
		&models.Project{},
		&models.ProjectTask{},
		&models.ProjectDocument{},
		&models.Notification{},
		&models.Role{},
		&models.Permission{},
		&models.UserActivity{},
		&models.TaskComment{},
		&models.TaskDefinition{},
		&models.ProjectTemplate{},
		&models.TemplateTask{},
		&models.Request{},
	)

	if err != nil {
		return err
	}

	log.Println("✅ Database migrations completed")
	return nil
}
