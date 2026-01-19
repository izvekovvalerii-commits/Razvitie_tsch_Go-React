package services

import (
	"errors"
	"portal-razvitie/events"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"time"

	"gorm.io/gorm"
)

type RequestService struct {
	repo                *repositories.RequestRepository
	notificationService *NotificationService
	eventBus            *events.InMemoryEventBus
}

func NewRequestService(
	db *gorm.DB,
	notifService *NotificationService,
	eventBus *events.InMemoryEventBus,
) *RequestService {
	return &RequestService{
		repo:                repositories.NewRequestRepository(db),
		notificationService: notifService,
		eventBus:            eventBus,
	}
}

// CreateRequest создает новую заявку
func (s *RequestService) CreateRequest(request *models.Request) error {
	// Валидация
	if err := request.Validate(); err != nil {
		return err
	}

	// Установка значений по умолчанию
	request.SetDefaultValues()

	// Создание заявки
	if err := s.repo.Create(request); err != nil {
		return err
	}

	// Загрузка связанных данных
	createdRequest, err := s.repo.FindByID(request.ID)
	if err != nil {
		return err
	}

	// Логирование активности будет выполнено через событие RequestCreatedEvent

	// Создание уведомления для ответственного
	if s.notificationService != nil {
		s.notificationService.SendNotification(
			createdRequest.AssignedToUserID,
			"Новая заявка",
			"Вам назначена новая заявка: "+createdRequest.Title,
			"request_assigned",
			"/requests/"+string(rune(createdRequest.ID)),
			nil,
			nil,
		)
	}

	// Публикация события
	s.eventBus.Publish(events.RequestCreatedEvent{
		Request: createdRequest,
		ActorID: createdRequest.CreatedByUserID,
	})

	return nil
}

// GetRequest возвращает заявку по ID
func (s *RequestService) GetRequest(id uint) (*models.Request, error) {
	return s.repo.FindByID(id)
}

// GetAllRequests возвращает все заявки
func (s *RequestService) GetAllRequests() ([]models.Request, error) {
	return s.repo.FindAll()
}

// GetRequestsByCreator возвращает заявки, созданные пользователем
func (s *RequestService) GetRequestsByCreator(userID uint) ([]models.Request, error) {
	return s.repo.FindByCreatedByUser(userID)
}

// GetRequestsByAssignee возвращает заявки, назначенные пользователю
func (s *RequestService) GetRequestsByAssignee(userID uint) ([]models.Request, error) {
	return s.repo.FindByAssignedToUser(userID)
}

// TakeInWork переводит заявку в работу
func (s *RequestService) TakeInWork(requestID uint, userID uint) error {
	request, err := s.repo.FindByID(requestID)
	if err != nil {
		return err
	}

	// Проверка, что пользователь является ответственным
	if request.AssignedToUserID != userID {
		return errors.New("только ответственный может взять заявку в работу")
	}

	// Проверка статуса
	if request.Status != string(models.RequestStatusNew) {
		return errors.New("заявка уже в работе")
	}

	// Обновление статуса
	now := time.Now()
	request.Status = string(models.RequestStatusInProgress)
	request.TakenAt = &now

	if err := s.repo.Update(request); err != nil {
		return err
	}

	// Уведомление инициатора
	if s.notificationService != nil {
		s.notificationService.SendNotification(
			request.CreatedByUserID,
			"Заявка в работе",
			"Заявка \""+request.Title+"\" взята в работу",
			"request_in_progress",
			"/requests/"+string(rune(request.ID)),
			nil,
			nil,
		)
	}

	// Публикация события
	s.eventBus.Publish(events.RequestTakenEvent{
		RequestID:        request.ID,
		RequestTitle:     request.Title,
		AssignedToUserID: request.AssignedToUserID,
		ActorID:          userID,
	})

	return nil
}

// AnswerRequest отвечает на заявку
func (s *RequestService) AnswerRequest(requestID uint, userID uint, response string) error {
	request, err := s.repo.FindByID(requestID)
	if err != nil {
		return err
	}

	// Проверка, что пользователь является ответственным
	if request.AssignedToUserID != userID {
		return errors.New("только ответственный может ответить на заявку")
	}

	// Проверка, что заявка может быть отвечена
	if !request.CanBeAnswered() {
		return errors.New("заявка не может быть отвечена в текущем статусе")
	}

	if response == "" {
		return errors.New("ответ не может быть пустым")
	}

	// Обновление заявки
	now := time.Now()
	request.Status = string(models.RequestStatusAnswered)
	request.Response = response
	request.AnsweredAt = &now

	if err := s.repo.Update(request); err != nil {
		return err
	}

	// Уведомление инициатора
	if s.notificationService != nil {
		s.notificationService.SendNotification(
			request.CreatedByUserID,
			"Получен ответ",
			"На заявку \""+request.Title+"\" получен ответ",
			"request_answered",
			"/requests/"+string(rune(request.ID)),
			nil,
			nil,
		)
	}

	// Публикация события
	s.eventBus.Publish(events.RequestAnsweredEvent{
		Request: request,
		ActorID: userID,
	})

	return nil
}

// CloseRequest закрывает заявку
func (s *RequestService) CloseRequest(requestID uint, userID uint) error {
	request, err := s.repo.FindByID(requestID)
	if err != nil {
		return err
	}

	// Проверка, что пользователь является инициатором
	if request.CreatedByUserID != userID {
		return errors.New("только инициатор может закрыть заявку")
	}

	// Проверка, что заявка может быть закрыта
	if !request.CanBeClosed() {
		return errors.New("заявка не может быть закрыта в текущем статусе")
	}

	// Обновление заявки
	now := time.Now()
	request.Status = string(models.RequestStatusClosed)
	request.ClosedAt = &now

	if err := s.repo.Update(request); err != nil {
		return err
	}

	// Уведомление ответственного
	if s.notificationService != nil {
		s.notificationService.SendNotification(
			request.AssignedToUserID,
			"Заявка закрыта",
			"Заявка \""+request.Title+"\" закрыта инициатором",
			"request_closed",
			"/requests/"+string(rune(request.ID)),
			nil,
			nil,
		)
	}

	// Публикация события
	s.eventBus.Publish(events.RequestClosedEvent{
		RequestID:    request.ID,
		RequestTitle: request.Title,
		ActorID:      userID,
	})

	return nil
}

// RejectRequest отклоняет заявку
func (s *RequestService) RejectRequest(requestID uint, userID uint, reason string) error {
	request, err := s.repo.FindByID(requestID)
	if err != nil {
		return err
	}

	// Проверка, что пользователь является ответственным
	if request.AssignedToUserID != userID {
		return errors.New("только ответственный может отклонить заявку")
	}

	if reason == "" {
		return errors.New("необходимо указать причину отклонения")
	}

	// Обновление заявки
	now := time.Now()
	request.Status = string(models.RequestStatusRejected)
	request.Response = "Отклонено: " + reason
	request.ClosedAt = &now

	if err := s.repo.Update(request); err != nil {
		return err
	}

	// Уведомление инициатора
	if s.notificationService != nil {
		s.notificationService.SendNotification(
			request.CreatedByUserID,
			"Заявка отклонена",
			"Заявка \""+request.Title+"\" отклонена",
			"request_rejected",
			"/requests/"+string(rune(request.ID)),
			nil,
			nil,
		)
	}

	// Публикация события
	s.eventBus.Publish(events.RequestRejectedEvent{
		RequestID:    request.ID,
		RequestTitle: request.Title,
		Reason:       reason,
		ActorID:      userID,
	})

	return nil
}

// UpdateRequest обновляет заявку
func (s *RequestService) UpdateRequest(request *models.Request) error {
	// Валидация
	if err := request.Validate(); err != nil {
		return err
	}

	return s.repo.Update(request)
}

// DeleteRequest удаляет заявку
func (s *RequestService) DeleteRequest(id uint, userID uint) error {
	request, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	// Только инициатор может удалить заявку
	if request.CreatedByUserID != userID {
		return errors.New("только инициатор может удалить заявку")
	}

	// Можно удалить только новые заявки
	if request.Status != string(models.RequestStatusNew) {
		return errors.New("можно удалить только новые заявки")
	}

	return s.repo.Delete(id)
}

// GetUserRequestsStats возвращает статистику по заявкам пользователя
func (s *RequestService) GetUserRequestsStats(userID uint) (map[string]int64, error) {
	stats := make(map[string]int64)

	// Количество активных заявок
	activeCount, err := s.repo.CountByAssignedUser(userID)
	if err != nil {
		return nil, err
	}
	stats["active"] = activeCount

	// Количество просроченных заявок
	overdueCount, err := s.repo.CountOverdueByAssignedUser(userID)
	if err != nil {
		return nil, err
	}
	stats["overdue"] = overdueCount

	return stats, nil
}
