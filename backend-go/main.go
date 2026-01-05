package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"portal-razvitie/config"
	"portal-razvitie/database"
	"portal-razvitie/logger"
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

	// Initialize logger
	logger.Init(cfg.Environment)
	logger.Info().Msg("🚀 Starting Portal Razvitie API Server...")

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		logger.Fatal().Err(err).Msg("Failed to connect to database")
	}
	logger.Info().Msg("✅ Database connected")

	// Run migrations
	if err := database.AutoMigrate(); err != nil {
		logger.Fatal().Err(err).Msg("Failed to run migrations")
	}
	logger.Info().Msg("✅ Migrations completed")

	// Seed database
	if err := database.SeedStores(); err != nil {
		logger.Warn().Err(err).Msg("Failed to seed stores")
	}

	if err := database.SeedRBAC(); err != nil {
		logger.Warn().Err(err).Msg("Failed to seed RBAC")
	}

	if err := database.SeedUsers(); err != nil {
		logger.Warn().Err(err).Msg("Failed to seed users")
	}

	// Initialize repositories
	userRepo := repositories.NewUserRepository(database.DB)
	projectRepo := repositories.NewProjectRepository(database.DB)
	notifRepo := repositories.NewNotificationRepository(database.DB)

	// Initialize and run WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()
	logger.Info().Msg("✅ WebSocket Hub started")

	// Initialize notification service
	notifService := services.NewNotificationService(notifRepo, hub)

	// Initialize workflow service with all dependencies
	workflowService := &services.WorkflowService{}
	workflowService.SetUserRepo(userRepo)
	workflowService.SetNotificationService(notifService)
	workflowService.SetProjectRepo(projectRepo)

	// Initialize Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
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
		c.JSON(200, gin.H{"status": "OK", "service": "portal-razvitie"})
	})

	// Create HTTP server
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info().
			Str("port", cfg.ServerPort).
			Str("environment", cfg.Environment).
			Msg("✅ Server is running")
		logger.Info().
			Str("url", fmt.Sprintf("http://localhost:%s", cfg.ServerPort)).
			Msg("📡 API endpoint")
		logger.Info().
			Str("url", fmt.Sprintf("http://localhost:%s/swagger/index.html", cfg.ServerPort)).
			Msg("📚 API Documentation")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	// Kill (no param) default send syscall.SIGTERM
	// SIGINT - Ctrl+C
	// SIGTERM - kill command
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info().Msg("🛑 Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	logger.Info().Msg("👋 Server exited")
}
