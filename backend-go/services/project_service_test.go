package services_test

import (
	"errors"
	"portal-razvitie/events"
	"portal-razvitie/listeners"
	"testing"
	"time"

	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"

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
	err = db.AutoMigrate(&models.Project{}, &models.Store{}, &models.ProjectTask{}, &models.Notification{}, &models.UserActivity{})
	if err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}

	return db
}

func TestProjectService_CreateProject_Success(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewProjectRepository(db)
	mockWorkflow := &MockWorkflowService{ShouldFail: false}

	activityRepo := repositories.NewUserActivityRepository(db)
	activityService := services.NewActivityService(activityRepo)

	// Event Bus
	eventBus := events.NewEventBus()
	listener := listeners.NewActivityListener(activityService)
	listener.Register(eventBus)

	service := services.NewProjectService(repo, mockWorkflow, db, eventBus)

	newProject := &models.Project{
		Region: "Test Region",
		CFO:    "Test CFO",
		Status: "Создан",
	}

	err := service.CreateProject(newProject, 1)

	assert.NoError(t, err)
	assert.NotZero(t, newProject.ID)

	// Verify it exists in DB
	var count int64
	db.Model(&models.Project{}).Count(&count)
	assert.Equal(t, int64(1), count)

	time.Sleep(100 * time.Millisecond)

	// Verify Activity Logged
	var activityCount int64
	db.Model(&models.UserActivity{}).Count(&activityCount)
	assert.Equal(t, int64(1), activityCount)
}

func TestProjectService_CreateProject_RollbackOnError(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewProjectRepository(db)

	// Configure mock to fail
	mockWorkflow := &MockWorkflowService{ShouldFail: true}

	eventBus := events.NewEventBus()
	service := services.NewProjectService(repo, mockWorkflow, db, eventBus)

	newProject := &models.Project{
		Region: "Test Region",
	}

	err := service.CreateProject(newProject, 1)

	// Expect error
	assert.Error(t, err)
	assert.Equal(t, "workflow error", err.Error())

	// Verify Rollback: Project should NOT exist
	var count int64
	db.Model(&models.Project{}).Count(&count)
	assert.Equal(t, int64(0), count, "Project should have been rolled back")
}

func TestProjectService_Delete_LogsActivity(t *testing.T) {
	db := setupTestDB(t)
	if !db.Migrator().HasTable(&models.UserActivity{}) {
		t.Fatal("Table UserActivity does not exist after migration")
	}
	repo := repositories.NewProjectRepository(db)
	mockWorkflow := &MockWorkflowService{ShouldFail: false}

	activityRepo := repositories.NewUserActivityRepository(db)
	activityService := services.NewActivityService(activityRepo)

	eventBus := events.NewEventBus()
	listener := listeners.NewActivityListener(activityService)
	listener.Register(eventBus)

	service := services.NewProjectService(repo, mockWorkflow, db, eventBus)

	// Create project first
	project := &models.Project{Region: "Test", Status: "Создан"}
	service.CreateProject(project, 1)

	time.Sleep(50 * time.Millisecond)

	// Delete
	err := service.Delete(project.ID, 1)
	assert.NoError(t, err)

	time.Sleep(100 * time.Millisecond)

	// Verify Activity Logged (1 create + 1 delete = 2)
	var activities []models.UserActivity
	db.Find(&activities)
	assert.Equal(t, 2, len(activities))
	if len(activities) > 1 {
		assert.Equal(t, "удалил проект", activities[1].Action)
	}
}
