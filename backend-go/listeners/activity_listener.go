package listeners

import (
	"fmt"
	"portal-razvitie/events"
	"portal-razvitie/models"
	"portal-razvitie/services"
)

type ActivityListener struct {
	activityService *services.ActivityService
}

func NewActivityListener(service *services.ActivityService) *ActivityListener {
	return &ActivityListener{activityService: service}
}

func (l *ActivityListener) Register(bus events.EventBus) {
	bus.Subscribe(events.TaskCreated, l.OnTaskCreated)
	bus.Subscribe(events.TaskStatusChanged, l.OnTaskStatusChanged)
	bus.Subscribe(events.TaskUpdated, l.OnTaskUpdated)
	bus.Subscribe(events.TaskDeleted, l.OnTaskDeleted)
	bus.Subscribe(events.ProjectCreated, l.OnProjectCreated)
	bus.Subscribe(events.ProjectDeleted, l.OnProjectDeleted)
	bus.Subscribe(events.ProjectUpdated, l.OnProjectUpdated)
	bus.Subscribe(events.ProjectStatusChanged, l.OnProjectStatusChanged)
}

func (l *ActivityListener) OnTaskCreated(event events.Event) error {
	e, ok := event.(events.TaskCreatedEvent)
	if !ok {
		return nil
	}
	return l.activityService.LogActivity(e.ActorID, "создал задачу", models.EntityTask, e.Task.ID, e.Task.Name, &e.Task.ProjectID)
}

func (l *ActivityListener) OnTaskStatusChanged(event events.Event) error {
	e, ok := event.(events.TaskStatusChangedEvent)
	if !ok {
		return nil
	}
	action := fmt.Sprintf("изменил статус на '%s'", e.NewStatus)
	return l.activityService.LogActivity(e.ActorID, action, models.EntityTask, e.TaskID, e.TaskName, &e.ProjectID)
}

func (l *ActivityListener) OnTaskUpdated(event events.Event) error {
	e, ok := event.(events.TaskUpdatedEvent)
	if !ok {
		return nil
	}

	// Check if approval status changed
	isApprovedNow := e.Task.IsApproved != nil && *e.Task.IsApproved
	wasApprovedBefore := e.OldTask != nil && (e.OldTask.IsApproved != nil && *e.OldTask.IsApproved)

	if isApprovedNow && !wasApprovedBefore {
		return l.activityService.LogActivity(e.ActorID, "согласовал задачу", models.EntityTask, e.Task.ID, e.Task.Name, &e.Task.ProjectID)
	}

	return l.activityService.LogActivity(e.ActorID, "обновил задачу", models.EntityTask, e.Task.ID, e.Task.Name, &e.Task.ProjectID)
}

func (l *ActivityListener) OnTaskDeleted(event events.Event) error {
	e, ok := event.(events.TaskDeletedEvent)
	if !ok {
		return nil
	}
	return l.activityService.LogActivity(e.ActorID, "удалил задачу", models.EntityTask, e.TaskID, e.TaskName, &e.ProjectID)
}

func (l *ActivityListener) OnProjectCreated(event events.Event) error {
	e, ok := event.(events.ProjectCreatedEvent)
	if !ok {
		return nil
	}
	projectName := "Проект #" + fmt.Sprint(e.Project.ID)
	if e.Project.Store != nil && e.Project.Store.Name != "" {
		projectName = e.Project.Store.Name
	}
	return l.activityService.LogActivity(e.ActorID, "создал проект", models.EntityProject, e.Project.ID, projectName, &e.Project.ID)
}

func (l *ActivityListener) OnProjectDeleted(event events.Event) error {
	e, ok := event.(events.ProjectDeletedEvent)
	if !ok {
		return nil
	}
	// Не устанавливаем projectId, так как проект уже удален
	return l.activityService.LogActivity(e.ActorID, "удалил проект", models.EntityProject, e.ProjectID, e.ProjectName, nil)
}

func (l *ActivityListener) OnProjectUpdated(event events.Event) error {
	e, ok := event.(events.ProjectUpdatedEvent)
	if !ok {
		return nil
	}
	projectName := fmt.Sprintf("Проект #%d", e.Project.ID)
	if e.Project.Store != nil && e.Project.Store.Name != "" {
		projectName = e.Project.Store.Name
	}
	return l.activityService.LogActivity(e.ActorID, "обновил проект", models.EntityProject, e.Project.ID, projectName, &e.Project.ID)
}

func (l *ActivityListener) OnProjectStatusChanged(event events.Event) error {
	e, ok := event.(events.ProjectStatusChangedEvent)
	if !ok {
		return nil
	}
	action := fmt.Sprintf("изменил статус на '%s'", e.NewStatus)
	return l.activityService.LogActivity(e.ActorID, action, models.EntityProject, e.ProjectID, e.ProjectName, &e.ProjectID)
}
