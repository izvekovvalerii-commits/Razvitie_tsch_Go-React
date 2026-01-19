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
	projectTemplateRepo := repositories.NewProjectTemplateRepository(db)

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
	projectTemplateService := services.NewProjectTemplateService(projectTemplateRepo)
	requestService := services.NewRequestService(db, notifService, eventBus)

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
	projectTemplateController := controllers.NewProjectTemplateController(projectTemplateService, db)
	requestController := controllers.NewRequestController(requestService)

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

		// Task Templates routes
		taskTemplates := api.Group("/task-templates")
		{
			// Read routes - accessible to all authenticated users
			taskTemplates.GET("", taskTemplateController.GetAllTemplates)
			taskTemplates.GET("/active", taskTemplateController.GetActiveTemplates)
			taskTemplates.GET("/category", taskTemplateController.GetTemplatesByCategory)
			taskTemplates.GET("/:id", taskTemplateController.GetTemplateByID)

			// Write routes - Admin only
			adminTemplates := taskTemplates.Group("")
			adminTemplates.Use(middleware.RequirePermission(models.PermRoleManage))
			{
				adminTemplates.POST("", taskTemplateController.CreateTemplate)
				adminTemplates.PUT("/:id", taskTemplateController.UpdateTemplate)
				adminTemplates.DELETE("/:id", taskTemplateController.DeleteTemplate)
				adminTemplates.POST("/:id/clone", taskTemplateController.CloneTemplate)
				adminTemplates.PATCH("/:id/toggle", taskTemplateController.ToggleTemplateStatus)
			}
		}

		// Project Templates routes (Read access for all authenticated, Write for Admins)
		projectTemplates := api.Group("/project-templates")
		{
			// Read routes - open to all authenticated users
			projectTemplates.GET("", projectTemplateController.GetAll)
			projectTemplates.GET("/active", projectTemplateController.GetActive)
			projectTemplates.GET("/known-tasks", projectTemplateController.GetKnownTasks)
			projectTemplates.GET("/default", projectTemplateController.GetDefault)
			projectTemplates.GET("/:id", projectTemplateController.GetByID)

			// Write routes - restricted to admin
			manage := projectTemplates.Group("")
			manage.Use(middleware.RequirePermission(models.PermRoleManage))
			{
				manage.POST("", projectTemplateController.Create)
				manage.PUT("/:id", projectTemplateController.Update)
				manage.DELETE("/:id", projectTemplateController.Delete)
				manage.POST("/:id/set-default", projectTemplateController.SetDefault)
				manage.POST("/:id/clone", projectTemplateController.Clone)
				manage.PUT("/:id/tasks/:taskId", projectTemplateController.UpdateTask)
				manage.POST("/:id/tasks", projectTemplateController.AddTask)
				manage.POST("/:id/tasks/custom", projectTemplateController.AddCustomTask)
				manage.DELETE("/:id/tasks/:taskId", projectTemplateController.DeleteTask)
			}
		}

		// Requests routes
		requests := api.Group("/requests")
		{
			requests.GET("", requestController.GetAllRequests)
			requests.GET("/:id", requestController.GetRequest)
			requests.POST("", requestController.CreateRequest)
			requests.PUT("/:id", requestController.UpdateRequest)
			requests.DELETE("/:id", requestController.DeleteRequest)
			requests.PUT("/:id/take", requestController.TakeInWork)
			requests.PUT("/:id/answer", requestController.AnswerRequest)
			requests.PUT("/:id/close", requestController.CloseRequest)
			requests.PUT("/:id/reject", requestController.RejectRequest)
			requests.GET("/stats/:userId", requestController.GetUserRequestsStats)
		}
	}
}
