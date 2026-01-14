package database

import (
	"log"
	"portal-razvitie/models"
	"time"

	"gorm.io/gorm"
)

func SeedStores(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.Store{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Printf("📊 Stores table already has %d records, skipping seed.", count)
		return nil
	}

	log.Println("🌱 Seeding Stores table with mock data...")

	mockStores := []models.Store{
		{
			Code:        "MSK-001",
			Name:        "Чижик Москва-1",
			Address:     "г. Москва, ул. Ленина, 1",
			City:        "Москва",
			Region:      "Москва и МО",
			TotalArea:   450,
			TradeArea:   320,
			Status:      "Active",
			OpeningDate: parseTime("2023-01-15T00:00:00Z"),
			CreatedAt:   parseTime("2022-12-01T00:00:00Z"),
		},
		{
			Code:        "SPB-005",
			Name:        "Чижик СПб-5",
			Address:     "г. Санкт-Петербург, Невский пр., 100",
			City:        "Санкт-Петербург",
			Region:      "Ленинградская область",
			TotalArea:   500,
			TradeArea:   380,
			Status:      "Planning",
			OpeningDate: parseTime("2024-06-01T00:00:00Z"),
			CreatedAt:   parseTime("2024-01-10T00:00:00Z"),
		},
		{
			Code:        "KZN-002",
			Name:        "Чижик Казань-2",
			Address:     "г. Казань, ул. Баумана, 50",
			City:        "Казань",
			Region:      "Татарстан",
			TotalArea:   420,
			TradeArea:   300,
			Status:      "Renovation",
			OpeningDate: parseTime("2024-02-20T00:00:00Z"),
			CreatedAt:   parseTime("2023-11-15T00:00:00Z"),
		},
		{
			Code:        "NKG-001",
			Name:        "Чижик Нижний-1",
			Address:     "г. Нижний Новгород, ул. Большая Покровская, 10",
			City:        "Нижний Новгород",
			Region:      "Нижегородская область",
			TotalArea:   480,
			TradeArea:   350,
			Status:      "Active",
			OpeningDate: parseTime("2023-08-10T00:00:00Z"),
			CreatedAt:   parseTime("2023-05-01T00:00:00Z"),
		},
		{
			Code:        "EKB-003",
			Name:        "Чижик Екат-3",
			Address:     "г. Екатеринбург, ул. Вайнера, 15",
			City:        "Екатеринбург",
			Region:      "Свердловская область",
			TotalArea:   460,
			TradeArea:   330,
			Status:      "Planning",
			OpeningDate: parseTime("2024-09-01T00:00:00Z"),
			CreatedAt:   parseTime("2024-02-01T00:00:00Z"),
		},
		{
			Code:        "MSK-002",
			Name:        "Чижик Москва-2",
			Address:     "г. Москва, пр. Мира, 55",
			City:        "Москва",
			Region:      "Москва и МО",
			TotalArea:   510,
			TradeArea:   400,
			Status:      "Active",
			OpeningDate: parseTime("2023-03-20T00:00:00Z"),
			CreatedAt:   parseTime("2023-01-10T00:00:00Z"),
		},
		{
			Code:        "SAM-001",
			Name:        "Чижик Самара-1",
			Address:     "г. Самара, ул. Куйбышева, 80",
			City:        "Самара",
			Region:      "Самарская область",
			TotalArea:   440,
			TradeArea:   310,
			Status:      "Active",
			OpeningDate: parseTime("2023-11-05T00:00:00Z"),
			CreatedAt:   parseTime("2023-08-20T00:00:00Z"),
		},
		{
			Code:        "VLG-004",
			Name:        "Чижик Волгоград-4",
			Address:     "г. Волгоград, пр. Ленина, 30",
			City:        "Волгоград",
			Region:      "Волгоградская область",
			TotalArea:   470,
			TradeArea:   340,
			Status:      "Renovation",
			OpeningDate: parseTime("2024-04-15T00:00:00Z"),
			CreatedAt:   parseTime("2024-01-05T00:00:00Z"),
		},
	}

	if err := db.Create(&mockStores).Error; err != nil {
		log.Printf("❌ Failed to seed stores: %v", err)
		return err
	}

	log.Printf("✅ Successfully seeded %d stores", len(mockStores))
	return nil
}

func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339, s)
	return t
}

// SeedUsers populates the Users table with initial data
func SeedUsers(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	log.Println("👤 Seeding Users...")

	users := []models.User{
		{
			Name:   "Иванов И.И.",
			Login:  "ivanov",
			Role:   models.RoleMP,
			Avatar: "👨‍💼", // Using emoji as avatar for now to match frontend
		},
		{
			Name:   "Петров П.П.",
			Login:  "petrov",
			Role:   models.RoleMRiZ,
			Avatar: "👷",
		},
		{
			Name:   "Сидоров С.С.",
			Login:  "sidorov",
			Role:   models.RoleBA,
			Avatar: "📊",
		},
		{
			Name:   "Админов А.А.",
			Login:  "admin",
			Role:   models.RoleAdmin,
			Avatar: "🔑",
		},
	}

	return db.Create(&users).Error
}

// SeedRBAC populates Roles and Permissions tables from the hardcoded configuration
func SeedRBAC(db *gorm.DB) error {
	log.Println("🔐 Seeding RBAC data...")

	// 1. Sync Permissions
	permDescriptions := map[string]string{
		models.PermProjectCreate: "Создание проектов",
		models.PermProjectView:   "Просмотр проектов",
		models.PermProjectEdit:   "Редактирование проектов",
		models.PermProjectDelete: "Удаление проектов",

		models.PermTaskView:    "Просмотр задач",
		models.PermTaskCreate:  "Создание задач",
		models.PermTaskEdit:    "Редактирование любых задач",
		models.PermTaskEditOwn: "Редактирование своих задач",

		models.PermUserView:   "Просмотр пользователей",
		models.PermUserManage: "Управление пользователями",

		models.PermStoreView:   "Просмотр магазинов",
		models.PermStoreManage: "Управление магазинами",

		models.PermRoleManage: "Управление ролями и правами",
	}

	uniquePerms := make(map[string]bool)
	for _, perms := range models.RolePermissions {
		for _, p := range perms {
			uniquePerms[p] = true
		}
	}

	for code := range uniquePerms {
		var p models.Permission
		if err := db.Where(models.Permission{Code: code}).FirstOrCreate(&p).Error; err != nil {
			return err
		}
		// Update description
		if desc, ok := permDescriptions[code]; ok && p.Description != desc {
			p.Description = desc
			if err := db.Save(&p).Error; err != nil {
				return err
			}
		}
	}

	// 2. Sync Roles and Links
	for roleCode, permCodes := range models.RolePermissions {
		var role models.Role
		if err := db.Where(models.Role{Code: roleCode}).FirstOrCreate(&role).Error; err != nil {
			return err
		}

		// Проверяем существующие права роли
		var existingPerms []models.Permission
		db.Model(&role).Association("Permissions").Find(&existingPerms)

		// Обновляем права только если роль новая (нет прав)
		if len(existingPerms) == 0 {
			log.Printf("Initializing permissions for new role '%s'", roleCode)

			// Find permission objects for this role
			var perms []models.Permission
			if err := db.Where("\"Code\" IN ?", permCodes).Find(&perms).Error; err != nil {
				return err
			}

			// Replace associations (updates role_permissions table)
			if err := db.Model(&role).Association("Permissions").Replace(perms); err != nil {
				return err
			}
		} else {
			log.Printf("Skipping role '%s' - already has %d permissions (preserving custom config)",
				roleCode, len(existingPerms))
		}
	}

	log.Println("✅ RBAC seeded successfully")
	return nil
}

// SeedProjectTemplates создает шаблон проекта из существующих TaskDefinition
func SeedProjectTemplates(db *gorm.DB) error {
	// Проверяем, есть ли уже шаблоны
	var count int64
	if err := db.Model(&models.ProjectTemplate{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Printf("📋 ProjectTemplate table already has %d records, skipping seed.", count)
		return nil
	}

	log.Println("🌱 Seeding ProjectTemplate from existing TaskDefinition...")

	// Загружаем все TaskDefinition
	var taskDefs []models.TaskDefinition
	if err := db.Order("\"ID\"").Find(&taskDefs).Error; err != nil {
		return err
	}

	if len(taskDefs) == 0 {
		log.Println("⚠️ No TaskDefinition found, skipping ProjectTemplate seed")
		return nil
	}

	// Создаем шаблон по умолчанию
	template := models.ProjectTemplate{
		Name:        "Открытие магазина (стандартный)",
		Description: "Стандартный процесс открытия нового магазина, импортированный из существующей схемы workflow",
		Category:    "Открытие магазина",
		IsActive:    true,
		IsDefault:   true,
	}

	// Конвертируем TaskDefinition в TemplateTask
	for i, def := range taskDefs {
		templateTask := models.TemplateTask{
			Code:            def.Code,
			Name:            def.Name,
			Duration:        def.Duration,
			Stage:           def.Stage,
			DependsOn:       def.DependsOn,
			ResponsibleRole: def.ResponsibleRole,
			TaskType:        def.TaskType,
			Order:           i, // Сохраняем порядок из базы
		}
		template.Tasks = append(template.Tasks, templateTask)
	}

	// Сохраняем шаблон
	if err := db.Create(&template).Error; err != nil {
		log.Printf("❌ Failed to seed project template: %v", err)
		return err
	}

	log.Printf("✅ Successfully created default project template with %d tasks", len(template.Tasks))
	return nil
}
