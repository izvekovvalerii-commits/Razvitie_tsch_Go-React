package services_test

import (
	"portal-razvitie/models"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate models needed for services tests
	err = db.AutoMigrate(
		&models.User{},
		&models.Store{},
		&models.Project{},
		&models.ProjectTask{},
		&models.ProjectDocument{},
		&models.Notification{},
		&models.UserActivity{},
		&models.Role{},
		&models.Permission{},
	)
	if err != nil {
		t.Fatalf("failed to migrate database: %v", err)
	}

	return db
}
