package routes

import (
	"portal-razvitie/config"
	"portal-razvitie/controllers"
	"portal-razvitie/database"
	"portal-razvitie/events"
	"portal-razvitie/listeners"
	"portal-razvitie/middleware"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"
	"portal-razvitie/websocket"
	"strconv"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, cfg *config.Config, workflowService *services.WorkflowService, hub *websocket.Hub) {
	// Глобальные middleware
	router.Use(middleware.RecoveryMiddleware())
	router.Use(middleware.ErrorHandler())

	// WS endpoint
	router.GET("/ws", func(c *gin.Context) {
		userIdStr := c.Query("userId")
		uid, _ := strconv.Atoi(userIdStr)
		hub.ServeWs(c, uint(uid))
	})

	// Initialize Repositories
	projectRepo := repositories.NewProjectRepository(database.DB)
	taskRepo := repositories.NewTaskRepository(database.DB)
	storeRepo := repositories.NewStoreRepository(database.DB)
	notifRepo := repositories.NewNotificationRepository(database.DB)
	userRepo := repositories.NewUserRepository(database.DB)
	activityRepo := repositories.NewUserActivityRepository(database.DB)
	commentRepo := repositories.NewCommentRepository(database.DB)

	// Services
	notifService := services.NewNotificationService(notifRepo, hub)
	activityService := services.NewActivityService(activityRepo)
	commentService := services.NewCommentService(commentRepo, taskRepo, notifService)

	// Event Bus & Listeners
	eventBus := events.NewEventBus()

	activityListener := listeners.NewActivityListener(activityService)
	activityListener.Register(eventBus)

	notificationListener := listeners.NewNotificationListener(notifService, projectRepo)
	notificationListener.Register(eventBus)

	webSocketListener := listeners.NewWebSocketListener(hub)
	webSocketListener.Register(eventBus)

	// Project Status Service для автоматического управления статусами
	projectStatusService := services.NewProjectStatusService(projectRepo, taskRepo, activityRepo)

	workflowService = services.NewWorkflowService(userRepo, projectRepo, notifService)
	taskService := services.NewTaskService(taskRepo, projectRepo, userRepo, workflowService, eventBus, projectStatusService)
	projectService := services.NewProjectService(projectRepo, workflowService, database.DB, eventBus)
	storeService := services.NewStoreService(storeRepo)

	// Initialize controllers
	storesController := controllers.NewStoresController(storeService)
	tasksController := controllers.NewTasksController(taskService, activityService)
	projectsController := controllers.NewProjectsController(projectService)
	documentsController := controllers.NewDocumentsController(cfg)
	notifController := controllers.NewNotificationController(notifService)
	rbacController := controllers.NewRBACController()
	authController := &controllers.AuthController{}
	dashboardController := controllers.NewDashboardController(activityService, taskService, projectService)
	commentsController := controllers.NewCommentsController(commentService)

	// API group
	api := router.Group("/api")
	{
		// Auth routes (Public)
		auth := api.Group("/auth")
		{
			auth.POST("/login", authController.Login)
			auth.GET("/users", authController.GetUsers) // For demo switcher
		}

		// Apply global authentication middleware for all subsequent routes
		api.Use(middleware.AuthMiddleware())

		// Stores routes
		stores := api.Group("/stores")
		{
			stores.GET("", storesController.GetStores)
			stores.GET("/:id", storesController.GetStore)
			stores.POST("", storesController.CreateStore)
			stores.PUT("/:id", storesController.UpdateStore)
			stores.DELETE("/:id", storesController.DeleteStore)
		}

		// Projects routes
		projects := api.Group("/projects")
		{
			projects.GET("", projectsController.GetProjects)
			projects.GET("/:id", projectsController.GetProject)
			projects.POST("", middleware.RequirePermission(models.PermProjectCreate), projectsController.CreateProject)
			projects.PUT("/:id", middleware.RequirePermission(models.PermProjectEdit), projectsController.UpdateProject)
			projects.PATCH("/:id/status", middleware.RequirePermission(models.PermProjectEdit), projectsController.UpdateProjectStatus)
			projects.DELETE("/:id", middleware.RequirePermission(models.PermProjectDelete), projectsController.DeleteProject)
		}

		// Tasks routes
		tasks := api.Group("/tasks")
		{
			tasks.GET("", tasksController.GetAllTasks)
			tasks.GET("/project/:projectId", tasksController.GetProjectTasks)
			tasks.GET("/debug-assignments", tasksController.DebugAssignments)
			tasks.POST("", middleware.RequirePermission(models.PermTaskCreate), tasksController.CreateTask)
			tasks.PUT("/:id", middleware.RequireTaskEditPermission(), tasksController.UpdateTask)
			tasks.PATCH("/:id/status", middleware.RequireTaskEditPermission(), tasksController.UpdateTaskStatus)
			tasks.DELETE("/:id", middleware.RequireTaskEditPermission(), tasksController.DeleteTask)
			tasks.GET("/:id/history", tasksController.GetHistory)
			tasks.DELETE("/cleanup-old", tasksController.CleanupOldTasks)
		}

		// Documents routes
		documents := api.Group("/documents")
		{
			documents.POST("/upload", documentsController.Upload)
			documents.GET("/:id", documentsController.GetById)
			documents.GET("/project/:projectId", documentsController.GetByProject)
			documents.GET("/task/:taskId", documentsController.GetByTask)
			documents.GET("/download/:id", documentsController.Download)
			documents.DELETE("/:id", documentsController.Delete)
		}

		// Workflow routes
		workflow := api.Group("/workflow")
		{
			workflow.GET("/schema", tasksController.GetWorkflowSchema)
		}

		// Notification routes
		notifications := api.Group("/notifications")
		{
			notifications.GET("", notifController.GetNotifications)
			notifications.POST("/:id/read", notifController.MarkRead)
			notifications.POST("/read-all", notifController.MarkAllRead)
			notifications.DELETE("/:id", notifController.Delete)
			notifications.DELETE("/delete-all", notifController.DeleteAll)
		}

		// Dashboard routes
		dashboard := api.Group("/dashboard")
		{
			dashboard.GET("/activity", dashboardController.GetRecentActivity)
		}

		// Comments routes
		comments := api.Group("/comments")
		{
			comments.GET("/task/:taskId", commentsController.GetTaskComments)
			comments.POST("", commentsController.CreateComment)
		}

		// RBAC routes (Admin only)
		rbac := api.Group("/rbac")
		{
			rbac.Use(middleware.RequirePermission(models.PermRoleManage))
			rbac.GET("/roles", rbacController.GetRoles)
			rbac.POST("/roles", rbacController.CreateRole)
			rbac.POST("/roles/:id/permissions", rbacController.UpdateRolePermissions)
			rbac.GET("/permissions", rbacController.GetPermissions)
		}
	}
}
