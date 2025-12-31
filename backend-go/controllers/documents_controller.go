package controllers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"portal-razvitie/config"
	"portal-razvitie/database"
	"portal-razvitie/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DocumentsController struct {
	config *config.Config
}

func NewDocumentsController(cfg *config.Config) *DocumentsController {
	return &DocumentsController{config: cfg}
}

// Upload godoc
// @Summary Upload a document
// @Description Upload a document file for a project or task
// @Tags documents
// @Accept multipart/form-data
// @Produce json
// @Param projectId formData int true "Project ID"
// @Param file formData file true "File to upload"
// @Param type formData string true "Document type"
// @Param taskId formData int false "Task ID (optional)"
// @Success 201 {object} models.ProjectDocument
// @Failure 400 {object} map[string]string
// @Router /api/documents/upload [post]
func (dc *DocumentsController) Upload(c *gin.Context) {
	// Parse form data
	projectIdStr := c.PostForm("projectId")
	docType := c.PostForm("type")
	taskIdStr := c.PostForm("taskId")

	projectIdUint, err := strconv.ParseUint(projectIdStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}
	projectId := uint(projectIdUint)

	var taskId *int
	if taskIdStr != "" {
		tid, err := strconv.Atoi(taskIdStr)
		if err == nil {
			taskId = &tid
		}
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Файл не выбран"})
		return
	}

	// Create uploads directory if not exists
	uploadsDir := dc.config.UploadDir
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	uniqueFileName := fmt.Sprintf("%s_%s", uuid.New().String(), filepath.Base(file.Filename))
	filePath := filepath.Join(uploadsDir, uniqueFileName)

	// Save file
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Count existing documents for versioning
	var existingCount int64
	database.DB.Model(&models.ProjectDocument{}).
		Where("project_id = ? AND type = ?", projectId, docType).
		Count(&existingCount)

	version := int(existingCount) + 1

	// Create document record
	doc := models.ProjectDocument{
		ProjectID:   projectId,
		TaskID:      taskId,
		Name:        file.Filename,
		Type:        docType,
		UploadDate:  time.Now().UTC(),
		Version:     version,
		Author:      "Системный Администратор",
		Status:      "Доступен",
		FileName:    uniqueFileName,
		FilePath:    filePath,
		ContentType: file.Header.Get("Content-Type"),
		Size:        file.Size,
	}

	if err := database.DB.Create(&doc).Error; err != nil {
		// Remove uploaded file if database insert fails
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, doc)
}

// GetById godoc
// @Summary Get document by ID
// @Description Get document metadata by ID
// @Tags documents
// @Produce json
// @Param id path int true "Document ID"
// @Success 200 {object} models.ProjectDocument
// @Failure 404 {object} map[string]string
// @Router /api/documents/{id} [get]
func (dc *DocumentsController) GetById(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var doc models.ProjectDocument
	if err := database.DB.First(&doc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	c.JSON(http.StatusOK, doc)
}

// GetByProject godoc
// @Summary Get documents by project ID
// @Description Get all documents for a specific project
// @Tags documents
// @Produce json
// @Param projectId path int true "Project ID"
// @Success 200 {array} models.ProjectDocument
// @Router /api/documents/project/{projectId} [get]
func (dc *DocumentsController) GetByProject(c *gin.Context) {
	projectId, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var docs []models.ProjectDocument
	if err := database.DB.
		Where("\"ProjectId\" = ?", projectId).
		Order("\"UploadDate\" DESC").
		Find(&docs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, docs)
}

// GetByTask godoc
// @Summary Get documents by task ID
// @Description Get all documents for a specific task
// @Tags documents
// @Produce json
// @Param taskId path int true "Task ID"
// @Success 200 {array} models.ProjectDocument
// @Router /api/documents/task/{taskId} [get]
func (dc *DocumentsController) GetByTask(c *gin.Context) {
	taskId, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var docs []models.ProjectDocument
	if err := database.DB.
		Where("\"TaskId\" = ?", taskId).
		Order("\"UploadDate\" DESC").
		Find(&docs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, docs)
}

// Download godoc
// @Summary Download a document
// @Description Download document file by ID
// @Tags documents
// @Produce application/octet-stream
// @Param id path int true "Document ID"
// @Success 200 {file} file
// @Failure 404 {object} map[string]string
// @Router /api/documents/download/{id} [get]
func (dc *DocumentsController) Download(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var doc models.ProjectDocument
	if err := database.DB.First(&doc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	// Check if file exists
	if _, err := os.Stat(doc.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Файл не найден на сервере"})
		return
	}

	// Open file
	file, err := os.Open(doc.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer file.Close()

	// Set headers
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", doc.Name))
	c.Header("Content-Type", doc.ContentType)

	// Stream file
	io.Copy(c.Writer, file)
}

// Delete godoc
// @Summary Delete a document
// @Description Delete document and its file by ID
// @Tags documents
// @Param id path int true "Document ID"
// @Success 204
// @Failure 404 {object} map[string]string
// @Router /api/documents/{id} [delete]
func (dc *DocumentsController) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var doc models.ProjectDocument
	if err := database.DB.First(&doc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	// Delete file from disk if exists
	if _, err := os.Stat(doc.FilePath); err == nil {
		if err := os.Remove(doc.FilePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
			return
		}
	}

	// Delete database record
	if err := database.DB.Delete(&doc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
