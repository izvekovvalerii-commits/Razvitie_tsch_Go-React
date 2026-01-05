package listeners

import (
	"portal-razvitie/events"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"
)

type NotificationListener struct {
	notifService *services.NotificationService
	projectRepo  repositories.ProjectRepository
}

func NewNotificationListener(service *services.NotificationService, projectRepo repositories.ProjectRepository) *NotificationListener {
	return &NotificationListener{
		notifService: service,
		projectRepo:  projectRepo,
	}
}

func (l *NotificationListener) Register(bus events.EventBus) {
	bus.Subscribe(events.TaskCreated, l.OnTaskCreated)
	bus.Subscribe(events.TaskStatusChanged, l.OnTaskStatusChanged)
	bus.Subscribe(events.ProjectTasksGenerated, l.OnProjectTasksGenerated)
}

func (l *NotificationListener) OnProjectTasksGenerated(event events.Event) error {
	e, ok := event.(events.ProjectTasksGeneratedEvent)
	if !ok {
		return nil
	}
	for _, task := range e.Tasks {
		// Pass pointer to task as checkAndNotifyAssignment expects *models.ProjectTask
		// Be careful with loop variable capturing, but here checkAndNotifyAssignment logic is synchronous or uses values
		t := task
		_ = l.checkAndNotifyAssignment(&t)
	}
	return nil
}

func (l *NotificationListener) checkAndNotifyAssignment(task *models.ProjectTask) error {
	// Логика: Если статус "Назначена" и есть ответственный -> уведомляем
	if task.Status == string(models.TaskStatusAssigned) && task.ResponsibleUserID != nil {
		projectName := "неизвестном проекте"
		if project, err := l.projectRepo.FindByID(task.ProjectID); err == nil && project.Store != nil {
			projectName = "проекте " + project.Store.Name
		}
		message := "Вам назначена задача: " + task.Name + " в " + projectName
		return l.notifService.SendNotification(uint(*task.ResponsibleUserID), "Новая задача", message, "TASK_ASSIGNED", "")
	}
	return nil
}

func (l *NotificationListener) OnTaskCreated(event events.Event) error {
	e, ok := event.(events.TaskCreatedEvent)
	if !ok {
		return nil
	}
	return l.checkAndNotifyAssignment(e.Task)
}

func (l *NotificationListener) OnTaskStatusChanged(event events.Event) error {
	e, ok := event.(events.TaskStatusChangedEvent)
	if !ok {
		return nil
	}
	// Для уведомления нам нужен полный объект задачи с ResponsibleUserID.
	// В событии TaskStatusChangedEvent я добавил поле Task.
	if e.Task != nil {
		return l.checkAndNotifyAssignment(e.Task)
	}
	return nil
}
