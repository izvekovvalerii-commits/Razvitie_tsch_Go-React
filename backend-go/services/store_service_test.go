package services_test

import (
	"testing"

	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"

	"github.com/stretchr/testify/assert"
)

func TestStoreService_CRUD(t *testing.T) {
	db := setupTestDB(t)
	repo := repositories.NewStoreRepository(db)
	service := services.NewStoreService(repo)

	// Create
	store := &models.Store{
		Name:    "Test Store",
		Address: "123 Test St",
		Region:  "Test Region",
	}
	err := service.CreateStore(store)
	assert.NoError(t, err)
	assert.NotZero(t, store.ID)

	// Read
	fetched, err := service.GetStore(store.ID)
	assert.NoError(t, err)
	assert.Equal(t, store.Name, fetched.Name)

	// Update
	store.Name = "Updated Store"
	err = service.UpdateStore(store)
	assert.NoError(t, err)

	fetchedUpdated, _ := service.GetStore(store.ID)
	assert.Equal(t, "Updated Store", fetchedUpdated.Name)

	// Delete
	err = service.DeleteStore(store.ID)
	assert.NoError(t, err)

	_, err = service.GetStore(store.ID)
	assert.Error(t, err) // Should be not found
}
