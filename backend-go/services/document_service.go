package services

import (
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type DocumentService struct {
	db *gorm.DB
}

func NewDocumentService(db *gorm.DB) *DocumentService {
	return &DocumentService{db: db}
}

func (s *DocumentService) Create(doc *models.ProjectDocument) error {
	return s.db.Create(doc).Error
}

func (s *DocumentService) GetByID(id int) (*models.ProjectDocument, error) {
	var doc models.ProjectDocument
	if err := s.db.First(&doc, id).Error; err != nil {
		return nil, err
	}
	return &doc, nil
}

func (s *DocumentService) GetByProjectID(projectID int) ([]models.ProjectDocument, error) {
	var docs []models.ProjectDocument
	if err := s.db.Where("\"ProjectId\" = ?", projectID).Order("\"UploadDate\" DESC").Find(&docs).Error; err != nil {
		return nil, err
	}
	return docs, nil
}

func (s *DocumentService) GetByTaskID(taskID int) ([]models.ProjectDocument, error) {
	var docs []models.ProjectDocument
	if err := s.db.Where("\"TaskId\" = ?", taskID).Order("\"UploadDate\" DESC").Find(&docs).Error; err != nil {
		return nil, err
	}
	return docs, nil
}

func (s *DocumentService) Count(projectID uint, docType string) (int64, error) {
	var count int64
	err := s.db.Model(&models.ProjectDocument{}).
		Where("project_id = ? AND type = ?", projectID, docType).
		Count(&count).Error
	return count, err
}

func (s *DocumentService) Delete(doc *models.ProjectDocument) error {
	return s.db.Delete(doc).Error
}
