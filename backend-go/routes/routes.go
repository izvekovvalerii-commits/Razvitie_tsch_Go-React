package routes

import (
	"portal-razvitie/config"
	"portal-razvitie/controllers"
	"portal-razvitie/events"
	"portal-razvitie/listeners"
	"portal-razvitie/middleware"
	"portal-razvitie/models"
	"portal-razvitie/repositories"
	"portal-razvitie/services"
	"portal-razvitie/websocket"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, cfg *config.Config, db *gorm.DB, hub *websocket.Hub) {
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
	projectRepo := repositories.NewProjectRepository(db)
	taskRepo := repositories.NewTaskRepository(db)
	storeRepo := repositories.NewStoreRepository(db)
	notifRepo := repositories.NewNotificationRepository(db)
	userRepo := repositories.NewUserRepository(db)
	activityRepo := repositories.NewUserActivityRepository(db)
	commentRepo := repositories.NewCommentRepository(db)
	taskTemplateRepo := repositories.NewTaskTemplateRepository(db)

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

	workflowService := services.NewWorkflowService(userRepo, projectRepo, notifService, db)
	taskService := services.NewTaskService(taskRepo, projectRepo, userRepo, workflowService, eventBus, projectStatusService)
	projectService := services.NewProjectService(projectRepo, workflowService, db, eventBus)
	storeService := services.NewStoreService(storeRepo)
	authService := services.NewAuthService(db)
	rbacService := services.NewRBACService(db)

	docService := services.NewDocumentService(db)
	taskTemplateService := services.NewTaskTemplateService(taskTemplateRepo)

	// Initialize controllers
	storesController := controllers.NewStoresController(storeService)
	tasksController := controllers.NewTasksController(taskService, activityService)
	projectsController := controllers.NewProjectsController(projectService)
	documentsController := controllers.NewDocumentsController(cfg, docService)
	notifController := controllers.NewNotificationController(notifService)
	rbacController := controllers.NewRBACController(rbacService)
	authController := controllers.NewAuthController(authService)
	dashboardController := controllers.NewDashboardController(activityService, taskService, projectService)
	commentsController := controllers.NewCommentsController(commentService)
	taskTemplateController := controllers.NewTaskTemplateController(taskTemplateService)

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
		api.Use(middleware.AuthMiddleware(authService))

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
			workflow.PUT("/schema", middleware.RequirePermission(models.PermRoleManage), tasksController.UpdateWorkflowDefinition)
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

		// Task Templates routes (Admin only)
		taskTemplates := api.Group("/task-templates")
		{
			taskTemplates.Use(middleware.RequirePermission(models.PermRoleManage))
			taskTemplates.GET("", taskTemplateController.GetAllTemplates)
			taskTemplates.GET("/active", taskTemplateController.GetActiveTemplates)
			taskTemplates.GET("/category", taskTemplateController.GetTemplatesByCategory)
			taskTemplates.GET("/:id", taskTemplateController.GetTemplateByID)
			taskTemplates.POST("", taskTemplateController.CreateTemplate)
			taskTemplates.PUT("/:id", taskTemplateController.UpdateTemplate)
			taskTemplates.DELETE("/:id", taskTemplateController.DeleteTemplate)
			taskTemplates.POST("/:id/clone", taskTemplateController.CloneTemplate)
			taskTemplates.PATCH("/:id/toggle", taskTemplateController.ToggleTemplateStatus)
		}
	}
}
