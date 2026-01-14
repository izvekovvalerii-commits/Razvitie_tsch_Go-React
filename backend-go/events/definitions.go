package events

import "portal-razvitie/models"

// Event Names
const (
	TaskCreated       = "task.created"
	TaskUpdated       = "task.updated"
	TaskStatusChanged = "task.status_changed"
	TaskDeleted       = "task.deleted"

	ProjectCreated        = "project.created"
	ProjectDeleted        = "project.deleted"
	ProjectTasksGenerated = "project.tasks_generated"
	ProjectUpdated        = "project.updated"
	ProjectStatusChanged  = "project.status_changed"
)

// --- Task Events ---

type TaskCreatedEvent struct {
	Task    *models.ProjectTask
	ActorID uint
}

func (e TaskCreatedEvent) Name() string { return TaskCreated }

type TaskUpdatedEvent struct {
	Task    *models.ProjectTask
	OldTask *models.ProjectTask
	ActorID uint
}

func (e TaskUpdatedEvent) Name() string { return TaskUpdated }

type TaskStatusChangedEvent struct {
	TaskID    uint
	TaskName  string
	ProjectID uint
	OldStatus string
	NewStatus string
	ActorID   uint
	Task      *models.ProjectTask // Full object for WebSockets or other needs
}

func (e TaskStatusChangedEvent) Name() string { return TaskStatusChanged }

type TaskDeletedEvent struct {
	TaskID    uint
	TaskName  string
	ProjectID uint
	ActorID   uint
}

func (e TaskDeletedEvent) Name() string { return TaskDeleted }

// --- Project Events ---

type ProjectCreatedEvent struct {
	Project *models.Project
	ActorID uint
}

func (e ProjectCreatedEvent) Name() string { return ProjectCreated }

type ProjectDeletedEvent struct {
	ProjectID   uint
	ProjectName string
	ActorID     uint
}

func (e ProjectDeletedEvent) Name() string { return ProjectDeleted }

type ProjectTasksGeneratedEvent struct {
	Tasks     []models.ProjectTask
	ProjectID uint
	ActorID   uint
}

func (e ProjectTasksGeneratedEvent) Name() string { return ProjectTasksGenerated }

type ProjectUpdatedEvent struct {
	Project *models.Project
	ActorID uint
}

func (e ProjectUpdatedEvent) Name() string { return ProjectUpdated }

type ProjectStatusChangedEvent struct {
	ProjectID   uint
	ProjectName string
	OldStatus   string
	NewStatus   string
	ActorID     uint
}

func (e ProjectStatusChangedEvent) Name() string { return ProjectStatusChanged }
