package controllers

import (
	"net/http"
	"portal-razvitie/models"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type StoresController struct {
	storeService *services.StoreService
}

func NewStoresController(storeService *services.StoreService) *StoresController {
	return &StoresController{storeService: storeService}
}

// GetStores godoc
// @Summary Get all stores
// @Router /api/stores [get]
func (sc *StoresController) GetStores(c *gin.Context) {
	stores, err := sc.storeService.GetAllStores()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stores)
}

// GetStore godoc
// @Summary Get store by ID
// @Router /api/stores/{id} [get]
func (sc *StoresController) GetStore(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	store, err := sc.storeService.GetStore(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Store not found"})
		return
	}

	c.JSON(http.StatusOK, store)
}

// CreateStore godoc
// @Summary Create a new store
// @Router /api/stores [post]
func (sc *StoresController) CreateStore(c *gin.Context) {
	var store models.Store
	if err := c.ShouldBindJSON(&store); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := sc.storeService.CreateStore(&store); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, store)
}

// UpdateStore godoc
// @Summary Update a store
// @Router /api/stores/{id} [put]
func (sc *StoresController) UpdateStore(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var store models.Store
	if err := c.ShouldBindJSON(&store); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if uint(id) != store.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID mismatch"})
		return
	}

	if err := sc.storeService.UpdateStore(&store); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteStore godoc
// @Summary Delete a store
// @Router /api/stores/{id} [delete]
func (sc *StoresController) DeleteStore(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := sc.storeService.DeleteStore(uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Store not found or error deleting"})
		return
	}

	c.Status(http.StatusNoContent)
}
