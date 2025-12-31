package database

import (
	"log"
	"portal-razvitie/models"
	"time"
)

func SeedStores() error {
	var count int64
	if err := DB.Model(&models.Store{}).Count(&count).Error; err != nil {
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

	if err := DB.Create(&mockStores).Error; err != nil {
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
func SeedUsers() error {
	var count int64
	if err := DB.Model(&models.User{}).Count(&count).Error; err != nil {
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
			Role:   "МП",
			Avatar: "👨‍💼", // Using emoji as avatar for now to match frontend
		},
		{
			Name:   "Петров П.П.",
			Login:  "petrov",
			Role:   "МРиЗ",
			Avatar: "👷",
		},
		{
			Name:   "Сидоров С.С.",
			Login:  "sidorov",
			Role:   "БА",
			Avatar: "📊",
		},
		{
			Name:   "Админов А.А.",
			Login:  "admin",
			Role:   "admin",
			Avatar: "🔑",
		},
	}

	return DB.Create(&users).Error
}
