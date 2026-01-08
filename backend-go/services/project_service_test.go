package services_test

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"portal-razvitie/events"
	"portal-razvitie/models"
	"portal-razvitie/services"
)

// ---------- Mocks that match interfaces defined in original files ----------

type MockProjectRepository struct {
	mock.Mock
}

func (m *MockProjectRepository) Create(project *models.Project) error {
	return m.Called(project).Error(0)
}

func (m *MockProjectRepository) CreateWithTx(tx *gorm.DB, project *models.Project) error {
	// For testing purposes, we can simulate that the ID is set during creation
	project.ID = 1
	return m.Called(tx, project).Error(0)
}

func (m *MockProjectRepository) FindAll() ([]models.Project, error) {
	args := m.Called()
	return args.Get(0).([]models.Project), args.Error(1)
}

func (m *MockProjectRepository) FindByID(id uint) (*models.Project, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Project), args.Error(1)
}

func (m *MockProjectRepository) Update(project *models.Project) error {
	return m.Called(project).Error(0)
}

func (m *MockProjectRepository) UpdateStatus(id uint, status string) error {
	return m.Called(id, status).Error(0)
}

func (m *MockProjectRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}
func (m *MockProjectRepository) FindByStore(storeID uint) ([]models.Project, error) {
	args := m.Called(storeID)
	return args.Get(0).([]models.Project), args.Error(1)
}

type MockWorkflowService struct {
	mock.Mock
}

func (m *MockWorkflowService) GenerateProjectTasksWithTx(tx *gorm.DB, projectID uint, projectCreatedAt time.Time) ([]models.ProjectTask, error) {
	args := m.Called(tx, projectID, projectCreatedAt)
	return args.Get(0).([]models.ProjectTask), args.Error(1)
}

func (m *MockWorkflowService) ProcessTaskCompletion(projectID uint, completedTaskCode string) error {
	return m.Called(projectID, completedTaskCode).Error(0)
}

func (m *MockWorkflowService) ValidateTaskCompletion(task models.ProjectTask) error {
	return m.Called(task).Error(0)
}

func (m *MockWorkflowService) GetTaskDefinitions() ([]models.TaskDefinition, error) {
	args := m.Called()
	return args.Get(0).([]models.TaskDefinition), args.Error(1)
}

func (m *MockWorkflowService) UpdateTaskDefinition(def *models.TaskDefinition) error {
	return m.Called(def).Error(0)
}

// MockEventBus implements events.EventBus interface
type MockEventBus struct {
	mock.Mock
}

func (m *MockEventBus) Publish(event events.Event) {
	m.Called(event)
}

func (m *MockEventBus) Subscribe(eventName string, handler events.EventHandler) {
	m.Called(eventName, handler)
}

// ---------- Tests ----------

func TestProjectService_CreateProject(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	mockRepo := new(MockProjectRepository)
	mockWorkflow := new(MockWorkflowService)
	mockEventBus := new(MockEventBus)

	// We pass the dependencies to the service
	service := services.NewProjectService(mockRepo, mockWorkflow, db, mockEventBus)

	project := &models.Project{
		StoreID:   10,
		Status:    "New",
		CreatedAt: time.Now(),
	}
	actorID := uint(123)

	// Expectations
	// 1. Repo.CreateWithTx should be called.
	// Since we are running inside gorm.Transaction, the tx passed is the transaction instance.
	// We use mock.Anything for tx.
	mockRepo.On("CreateWithTx", mock.Anything, project).Return(nil)

	// 2. Workflow.GenerateProjectTasksWithTx should be called
	mockWorkflow.On("GenerateProjectTasksWithTx", mock.Anything, uint(1), project.CreatedAt).Return([]models.ProjectTask{}, nil)

	// 3. EventBus.Publish should be called for ProjectCreatedEvent
	mockEventBus.On("Publish", mock.MatchedBy(func(e events.ProjectCreatedEvent) bool {
		return e.Project.StoreID == 10 && e.ActorID == actorID
	})).Return()

	// 4. Also ProjectTasksGeneratedEvent if tasks were created?
	// The mock currently returns empty tasks so likely not published.
	// Add return empty slice -> no extra publish.

	// Execute
	err := service.CreateProject(project, actorID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockWorkflow.AssertExpectations(t)
	mockEventBus.AssertExpectations(t)
}

func TestProjectService_CreateProject_RepoError(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	mockRepo := new(MockProjectRepository)
	mockWorkflow := new(MockWorkflowService)
	mockEventBus := new(MockEventBus)

	service := services.NewProjectService(mockRepo, mockWorkflow, db, mockEventBus)

	project := &models.Project{StoreID: 5}
	actorID := uint(1)

	// Expectations: Repo fails -> Transaction rollback -> Error returned
	mockRepo.On("CreateWithTx", mock.Anything, project).Return(errors.New("db creation failed"))

	// Workflow and EventBus should NOT be called

	err := service.CreateProject(project, actorID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "db creation failed")

	mockRepo.AssertExpectations(t)
	mockWorkflow.AssertNotCalled(t, "GenerateProjectTasksWithTx")
	mockEventBus.AssertNotCalled(t, "Publish")
}

func TestProjectService_UpdateStatus(t *testing.T) {
	db := setupTestDB(t)
	mockRepo := new(MockProjectRepository)
	mockWorkflow := new(MockWorkflowService)
	mockEventBus := new(MockEventBus)

	service := services.NewProjectService(mockRepo, mockWorkflow, db, mockEventBus)

	projectID := uint(1)
	newStatus := "In Progress"
	actorID := uint(99)
	oldStatus := "New"

	// Expectations
	// 1. FindByID called to get old status (it returns the project)
	existingProject := &models.Project{
		ID:     projectID,
		Status: oldStatus,
		Store:  &models.Store{Name: "Test Store"},
	}
	mockRepo.On("FindByID", projectID).Return(existingProject, nil)

	// 2. UpdateStatus called on repo
	mockRepo.On("UpdateStatus", projectID, newStatus).Return(nil)

	// 3. EventBus Publish called
	mockEventBus.On("Publish", mock.MatchedBy(func(e events.ProjectStatusChangedEvent) bool {
		return e.ProjectID == projectID && e.NewStatus == newStatus && e.ActorID == actorID
	})).Return()

	err := service.UpdateStatus(projectID, newStatus, actorID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockEventBus.AssertExpectations(t)
}
