package services_test

import (
	"portal-razvitie/events"
	"portal-razvitie/listeners"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestTaskService_UpdateTask(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewTaskRepository(db)
	mockWorkflow := &MockWorkflowService{}

	userRepo := repositories.NewUserRepository(db)
	projectRepo := repositories.NewProjectRepository(db)

	eventBus := events.NewEventBus()
	service := services.NewTaskService(repo, projectRepo, userRepo, mockWorkflow, eventBus)

	// Create
	task := &models.ProjectTask{Name: "Task 1", Status: "Создана"}
	db.Create(task)

	// Update
	task.Name = "Task 1 Updated"
	err := service.UpdateTask(task, 1)
	assert.NoError(t, err)

	var updated models.ProjectTask
	db.First(&updated, task.ID)
	assert.Equal(t, "Task 1 Updated", updated.Name)
	assert.NotNil(t, updated.UpdatedAt)
}

func TestTaskService_UpdateStatus_Completion(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewTaskRepository(db)
	mockWorkflow := &MockWorkflowService{}

	userRepo := repositories.NewUserRepository(db)
	projectRepo := repositories.NewProjectRepository(db)

	eventBus := events.NewEventBus()
	service := services.NewTaskService(repo, projectRepo, userRepo, mockWorkflow, eventBus)

	// Create
	code := "TEST-CODE"
	task := &models.ProjectTask{Name: "Task 2", Status: "В работе", Code: &code}
	db.Create(task)

	// Update Status to Completed
	err := service.UpdateStatus(task.ID, models.TaskStatusCompleted, 1)
	assert.NoError(t, err)

	var updated models.ProjectTask
	db.First(&updated, task.ID)
	assert.Equal(t, models.TaskStatusCompleted, updated.Status)
	assert.NotNil(t, updated.ActualDate)
}

func TestTaskService_DeleteTask_LogsActivity(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewTaskRepository(db)
	mockWorkflow := &MockWorkflowService{}

	userRepo := repositories.NewUserRepository(db)
	projectRepo := repositories.NewProjectRepository(db)

	activityRepo := repositories.NewUserActivityRepository(db)
	activityService := services.NewActivityService(activityRepo)

	// Event Bus Setup
	eventBus := events.NewEventBus()
	listener := listeners.NewActivityListener(activityService)
	listener.Register(eventBus)

	service := services.NewTaskService(repo, projectRepo, userRepo, mockWorkflow, eventBus)

	// Create
	task := &models.ProjectTask{Name: "Task To Delete", Status: "Создана"}
	db.Create(task)

	// Delete
	err := service.DeleteTask(task.ID, 1)
	assert.NoError(t, err)

	// Wait for async event
	time.Sleep(100 * time.Millisecond)

	// Verify Deleted
	var count int64
	db.Model(&models.ProjectTask{}).Count(&count)

	var activities []models.UserActivity
	db.Find(&activities)
	assert.Equal(t, 1, len(activities))
	assert.Equal(t, "удалил задачу", activities[0].Action)
}
