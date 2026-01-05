package controllers

import (
	"net/http"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CommentsController struct {
	commentService *services.CommentService
}

func NewCommentsController(commentService *services.CommentService) *CommentsController {
	return &CommentsController{commentService: commentService}
}

// GetComments godoc
// @Summary Get comments for a task
// @Router /api/comments/task/{taskId} [get]
func (cc *CommentsController) GetTaskComments(c *gin.Context) {
	taskId, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Task ID"})
		return
	}

	comments, err := cc.commentService.GetTaskComments(uint(taskId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// CreateComment godoc
// @Summary Create a comment
// @Router /api/comments [post]
func (cc *CommentsController) CreateComment(c *gin.Context) {
	var req struct {
		TaskID  uint   `json:"taskId"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*models.User)

	comment, err := cc.commentService.CreateComment(req.TaskID, user.ID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, comment)
}
