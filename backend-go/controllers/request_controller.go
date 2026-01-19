package controllers

import (
	"net/http"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type RequestController struct {
	service *services.RequestService
}

func NewRequestController(service *services.RequestService) *RequestController {
	return &RequestController{service: service}
}

// CreateRequest создает новую заявку
// POST /api/requests
func (ctrl *RequestController) CreateRequest(c *gin.Context) {
	var request models.Request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.service.CreateRequest(&request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, request)
}

// GetRequest возвращает заявку по ID
// GET /api/requests/:id
func (ctrl *RequestController) GetRequest(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	request, err := ctrl.service.GetRequest(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
		return
	}

	c.JSON(http.StatusOK, request)
}

// GetAllRequests возвращает все заявки или фильтрованные по параметрам
// GET /api/requests
// Query params: createdBy, assignedTo, status
func (ctrl *RequestController) GetAllRequests(c *gin.Context) {
	createdByStr := c.Query("createdBy")
	assignedToStr := c.Query("assignedTo")
	status := c.Query("status")

	var requests []models.Request
	var err error

	// Фильтрация по создателю
	if createdByStr != "" {
		createdBy, parseErr := strconv.ParseUint(createdByStr, 10, 32)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID создателя"})
			return
		}
		requests, err = ctrl.service.GetRequestsByCreator(uint(createdBy))
	} else if assignedToStr != "" {
		// Фильтрация по ответственному
		assignedTo, parseErr := strconv.ParseUint(assignedToStr, 10, 32)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID ответственного"})
			return
		}
		requests, err = ctrl.service.GetRequestsByAssignee(uint(assignedTo))
	} else {
		// Все заявки
		requests, err = ctrl.service.GetAllRequests()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Дополнительная фильтрация по статусу
	if status != "" {
		var filteredRequests []models.Request
		for _, req := range requests {
			if req.Status == status {
				filteredRequests = append(filteredRequests, req)
			}
		}
		requests = filteredRequests
	}

	c.JSON(http.StatusOK, requests)
}

// TakeInWork переводит заявку в работу
// PUT /api/requests/:id/take
func (ctrl *RequestController) TakeInWork(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var body struct {
		UserID uint `json:"userId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.service.TakeInWork(uint(id), body.UserID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request, _ := ctrl.service.GetRequest(uint(id))
	c.JSON(http.StatusOK, request)
}

// AnswerRequest отвечает на заявку
// PUT /api/requests/:id/answer
func (ctrl *RequestController) AnswerRequest(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var body struct {
		UserID   uint   `json:"userId" binding:"required"`
		Response string `json:"response" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.service.AnswerRequest(uint(id), body.UserID, body.Response); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request, _ := ctrl.service.GetRequest(uint(id))
	c.JSON(http.StatusOK, request)
}

// CloseRequest закрывает заявку
// PUT /api/requests/:id/close
func (ctrl *RequestController) CloseRequest(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var body struct {
		UserID uint `json:"userId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.service.CloseRequest(uint(id), body.UserID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request, _ := ctrl.service.GetRequest(uint(id))
	c.JSON(http.StatusOK, request)
}

// RejectRequest отклоняет заявку
// PUT /api/requests/:id/reject
func (ctrl *RequestController) RejectRequest(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var body struct {
		UserID uint   `json:"userId" binding:"required"`
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.service.RejectRequest(uint(id), body.UserID, body.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request, _ := ctrl.service.GetRequest(uint(id))
	c.JSON(http.StatusOK, request)
}

// UpdateRequest обновляет заявку
// PUT /api/requests/:id
func (ctrl *RequestController) UpdateRequest(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var request models.Request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request.ID = uint(id)
	if err := ctrl.service.UpdateRequest(&request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, request)
}

// DeleteRequest удаляет заявку
// DELETE /api/requests/:id
func (ctrl *RequestController) DeleteRequest(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID"})
		return
	}

	var body struct {
		UserID uint `json:"userId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.service.DeleteRequest(uint(id), body.UserID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Заявка успешно удалена"})
}

// GetUserRequestsStats возвращает статистику по заявкам пользователя
// GET /api/requests/stats/:userId
func (ctrl *RequestController) GetUserRequestsStats(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("userId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID пользователя"})
		return
	}

	stats, err := ctrl.service.GetUserRequestsStats(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
