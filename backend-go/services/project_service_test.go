package services_test

import (
	"errors"
	"testing"
	"time"

	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"
	"portal-razvitie/websocket"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockWorkflowService for testing interactions
type MockWorkflowService struct {
	ShouldFail bool
}

func (m *MockWorkflowService) GenerateProjectTasksWithTx(tx *gorm.DB, projectID uint, projectCreatedAt time.Time) ([]models.ProjectTask, error) {
	if m.ShouldFail {
		return nil, errors.New("workflow error")
	}
	return []models.ProjectTask{{Name: "Test Task"}}, nil
}

func (m *MockWorkflowService) ProcessTaskCompletion(projectID uint, completedTaskCode string) error {
	return nil
}

func (m *MockWorkflowService) ValidateTaskCompletion(task models.ProjectTask) error {
	return nil
}

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	// Migrate schema
	err = db.AutoMigrate(&models.Project{}, &models.Store{}, &models.ProjectTask{}, &models.Notification{})
	if err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}

	return db
}

func TestProjectService_CreateProject_Success(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewProjectRepository(db)
	mockWorkflow := &MockWorkflowService{ShouldFail: false}

	notifRepo := repositories.NewNotificationRepository(db)
	hub := websocket.NewHub()
	go hub.Run()
	notifService := services.NewNotificationService(notifRepo, hub)

	service := services.NewProjectService(repo, mockWorkflow, db, notifService)

	newProject := &models.Project{
		Region: "Test Region",
		CFO:    "Test CFO",
		Status: "Создан",
	}

	err := service.CreateProject(newProject)

	assert.NoError(t, err)
	assert.NotZero(t, newProject.ID)

	// Verify it exists in DB
	var count int64
	db.Model(&models.Project{}).Count(&count)
	assert.Equal(t, int64(1), count)
}

func TestProjectService_CreateProject_RollbackOnError(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewProjectRepository(db)

	// Configure mock to fail
	mockWorkflow := &MockWorkflowService{ShouldFail: true}

	notifRepo := repositories.NewNotificationRepository(db)
	hub := websocket.NewHub()
	go hub.Run()
	notifService := services.NewNotificationService(notifRepo, hub)

	service := services.NewProjectService(repo, mockWorkflow, db, notifService)

	newProject := &models.Project{
		Region: "Test Region",
	}

	err := service.CreateProject(newProject)

	// Expect error
	assert.Error(t, err)
	assert.Equal(t, "workflow error", err.Error())

	// Verify Rollback: Project should NOT exist
	var count int64
	db.Model(&models.Project{}).Count(&count)
	assert.Equal(t, int64(0), count, "Project should have been rolled back")
}
