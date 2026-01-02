package services_test

import (
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"
	"portal-razvitie/websocket"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTaskService_UpdateTask(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewTaskRepository(db)
	mockWorkflow := &MockWorkflowService{}
	hub := websocket.NewHub()
	// Must run hub listener to avoid blocking on broadcast channel
	go hub.Run()

	notifRepo := repositories.NewNotificationRepository(db)
	notifService := services.NewNotificationService(notifRepo, hub)
	userRepo := repositories.NewUserRepository(db)
	projectRepo := repositories.NewProjectRepository(db)
	service := services.NewTaskService(repo, projectRepo, userRepo, mockWorkflow, hub, notifService)

	// Create
	task := &models.ProjectTask{Name: "Task 1", Status: "Создана"}
	db.Create(task)

	// Update
	task.Name = "Task 1 Updated"
	err := service.UpdateTask(task)
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
	hub := websocket.NewHub()
	go hub.Run()

	notifRepo := repositories.NewNotificationRepository(db)
	notifService := services.NewNotificationService(notifRepo, hub)
	userRepo := repositories.NewUserRepository(db)
	projectRepo := repositories.NewProjectRepository(db)
	service := services.NewTaskService(repo, projectRepo, userRepo, mockWorkflow, hub, notifService)

	// Create
	code := "TEST-CODE"
	task := &models.ProjectTask{Name: "Task 2", Status: "В работе", Code: &code}
	db.Create(task)

	// Update Status to Completed
	err := service.UpdateStatus(task.ID, "Завершена")
	assert.NoError(t, err)

	var updated models.ProjectTask
	db.First(&updated, task.ID)
	assert.Equal(t, "Завершена", updated.Status)
	assert.NotNil(t, updated.ActualDate)
}
