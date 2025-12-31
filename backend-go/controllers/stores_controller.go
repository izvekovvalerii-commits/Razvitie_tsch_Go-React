package controllers

import (
	"net/http"
	"portal-razvitie/database"
	"portal-razvitie/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

type StoresController struct{}

// GetStores godoc
// @Summary Get all stores
// @Description Get list of all stores
// @Tags stores
// @Produce json
// @Success 200 {array} models.Store
// @Router /api/stores [get]
func (sc *StoresController) GetStores(c *gin.Context) {
	var stores []models.Store

	if err := database.DB.Find(&stores).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stores)
}

// GetStore godoc
// @Summary Get store by ID
// @Description Get a single store by ID
// @Tags stores
// @Produce json
// @Param id path int true "Store ID"
// @Success 200 {object} models.Store
// @Failure 404 {object} map[string]string
// @Router /api/stores/{id} [get]
func (sc *StoresController) GetStore(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var store models.Store
	if err := database.DB.First(&store, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Store not found"})
		return
	}

	c.JSON(http.StatusOK, store)
}

// CreateStore godoc
// @Summary Create a new store
// @Description Create a new store
// @Tags stores
// @Accept json
// @Produce json
// @Param store body models.Store true "Store object"
// @Success 201 {object} models.Store
// @Failure 400 {object} map[string]string
// @Router /api/stores [post]
func (sc *StoresController) CreateStore(c *gin.Context) {
	var store models.Store

	if err := c.ShouldBindJSON(&store); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&store).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, store)
}

// UpdateStore godoc
// @Summary Update a store
// @Description Update an existing store
// @Tags stores
// @Accept json
// @Produce json
// @Param id path int true "Store ID"
// @Param store body models.Store true "Store object"
// @Success 204
// @Failure 400 {object} map[string]string
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

	if err := database.DB.Save(&store).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteStore godoc
// @Summary Delete a store
// @Description Delete a store by ID
// @Tags stores
// @Param id path int true "Store ID"
// @Success 204
// @Failure 404 {object} map[string]string
// @Router /api/stores/{id} [delete]
func (sc *StoresController) DeleteStore(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	result := database.DB.Delete(&models.Store{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Store not found"})
		return
	}

	c.Status(http.StatusNoContent)
}
