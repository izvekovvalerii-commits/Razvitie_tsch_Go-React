package services

import (
	"portal-razvitie/models"
	"portal-razvitie/repositories"
)

type StoreService struct {
	repo repositories.StoreRepository
}

func NewStoreService(repo repositories.StoreRepository) *StoreService {
	return &StoreService{repo: repo}
}

func (s *StoreService) GetAllStores() ([]models.Store, error) {
	return s.repo.FindAll()
}

func (s *StoreService) GetStore(id uint) (*models.Store, error) {
	return s.repo.FindByID(id)
}

func (s *StoreService) CreateStore(store *models.Store) error {
	return s.repo.Create(store)
}

func (s *StoreService) UpdateStore(store *models.Store) error {
	return s.repo.Update(store)
}

func (s *StoreService) DeleteStore(id uint) error {
	return s.repo.Delete(id)
}
