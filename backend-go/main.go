package main

import (
	"fmt"
	"log"
	"portal-razvitie/config"
	"portal-razvitie/database"
	"portal-razvitie/repositories"
	"portal-razvitie/routes"
	"portal-razvitie/services"
	"portal-razvitie/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// @title Portal Razvitie API
// @version 1.0
// @description API сервер для портала развития торговых объектов
// @host localhost:8080
// @BasePath /
func main() {
	// Load configuration
	cfg := config.Load()
	log.Println("🚀 Starting Portal Razvitie API Server...")

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.AutoMigrate(); err != nil {
		log.Fatal("❌ Failed to run migrations:", err)
	}

	// Seed database
	if err := database.SeedStores(); err != nil {
		log.Printf("⚠️ Warning: Failed to seed stores: %v", err)
	}

	if err := database.SeedRBAC(); err != nil {
		log.Printf("⚠️ Warning: Failed to seed RBAC: %v", err)
	}

	if err := database.SeedUsers(); err != nil {
		log.Printf("⚠️ Warning: Failed to seed users: %v", err)
	}

	// Initialize services
	userRepo := repositories.NewUserRepository(database.DB)
	workflowService := &services.WorkflowService{}
	workflowService.SetUserRepo(userRepo)

	// Initialize and run WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize Gin router
	router := gin.Default()

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin, "http://localhost:5173", "http://localhost:5174"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Setup routes (включая middleware)
	routes.SetupRoutes(router, cfg, workflowService, hub)

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK"})
	})

	// Start server
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("✅ Server is running on http://localhost:%s\n", cfg.ServerPort)
	log.Printf("�� API Documentation: http://localhost:%s/swagger/index.html\n", cfg.ServerPort)

	if err := router.Run(addr); err != nil {
		log.Fatal("❌ Failed to start server:", err)
	}
}
