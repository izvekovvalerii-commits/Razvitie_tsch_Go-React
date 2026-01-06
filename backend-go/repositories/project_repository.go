package repositories

import (
	"log"
	"portal-razvitie/models"

	"gorm.io/gorm"
)

type ProjectRepository interface {
	Create(project *models.Project) error
	CreateWithTx(tx *gorm.DB, project *models.Project) error
	FindAll() ([]models.Project, error)
	FindByID(id uint) (*models.Project, error)
	Update(project *models.Project) error
	UpdateStatus(id uint, status string) error
	Delete(id uint) error
}

type projectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepository{db: db}
}

func (r *projectRepository) Create(project *models.Project) error {
	return r.db.Create(project).Error
}

func (r *projectRepository) CreateWithTx(tx *gorm.DB, project *models.Project) error {
	return tx.Create(project).Error
}

func (r *projectRepository) FindAll() ([]models.Project, error) {
	var projects []models.Project

	// Прелоадим Store для всех проектов сразу (избегаем N+1)
	err := r.db.Preload("Store").Find(&projects).Error
	if err != nil {
		return nil, err
	}

	// Оптимизация: получаем статистику задач для всех проектов одним запросом
	// SELECT "ProjectId", count(*) as total, sum(case when "Status" = 'Завершена' then 1 else 0 end) as completed
	// FROM "ProjectTasks" GROUP BY "ProjectId"

	// Оптимизация: получаем статистику задач для всех проектов одним запросом
	type TaskStats struct {
		ProjectId uint
		Total     int64
		Completed int64
	}
	var stats []TaskStats

	// Используем Model для правильного определения имени таблицы
	result := r.db.Model(&models.ProjectTask{}).
		Select("\"ProjectId\", count(*) as Total, sum(case when \"Status\" = 'Завершена' then 1 else 0 end) as Completed").
		Group("\"ProjectId\"").
		Scan(&stats)

	if result.Error != nil {
		return nil, result.Error
	}

	// Создаем мапу для быстрого доступа
	statsMap := make(map[uint]TaskStats)
	for _, s := range stats {
		statsMap[s.ProjectId] = s
	}

	// Заполняем проекты
	for i := range projects {
		if s, ok := statsMap[projects[i].ID]; ok {
			projects[i].TotalTasks = s.Total
			projects[i].CompletedTasks = s.Completed
		}
	}

	return projects, nil
}

func (r *projectRepository) FindByID(id uint) (*models.Project, error) {
	var project models.Project
	err := r.db.Preload("Store").First(&project, id).Error
	if err != nil {
		return nil, err
	}

	// Загружаем статистику задач
	var stat struct {
		Total     int64
		Completed int64
	}
	err = r.db.Model(&models.ProjectTask{}).
		Select("count(*) as Total, sum(case when \"Status\" = 'Завершена' then 1 else 0 end) as Completed").
		Where("\"ProjectId\" = ?", id).
		Scan(&stat).Error
	if err != nil {
		return nil, err
	}

	project.TotalTasks = stat.Total
	project.CompletedTasks = stat.Completed

	return &project, nil
}

func (r *projectRepository) Update(project *models.Project) error {
	return r.db.Save(project).Error
}

func (r *projectRepository) UpdateStatus(id uint, status string) error {
	result := r.db.Model(&models.Project{}).Where("\"Id\" = ?", id).Update("\"Status\"", status)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *projectRepository) Delete(id uint) error {
	// Используем транзакцию для атомарного удаления
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Удаляем все задачи проекта (HARD DELETE)
		if err := tx.Unscoped().Where("\"ProjectId\" = ?", id).Delete(&models.ProjectTask{}).Error; err != nil {
			log.Printf("Error deleting project tasks for project %d: %v", id, err)
			return err
		}
		log.Printf("Successfully deleted tasks for project %d", id)

		// 2. Удаляем ВСЕ активности, связанные с проектом (HARD DELETE)
		// Это включает активности проекта и активности его задач
		result := tx.Unscoped().Where("\"ProjectId\" = ?", id).Delete(&models.UserActivity{})
		if result.Error != nil {
			log.Printf("Error deleting all activities for project %d: %v", id, result.Error)
			return result.Error
		}
		log.Printf("Successfully deleted %d activities for project %d", result.RowsAffected, id)

		// 3. Удаляем сам проект
		result = tx.Delete(&models.Project{}, id)
		if result.Error != nil {
			log.Printf("Error deleting project %d: %v", id, result.Error)
			return result.Error
		}
		if result.RowsAffected == 0 {
			log.Printf("Project %d not found", id)
			return gorm.ErrRecordNotFound
		}

		log.Printf("Successfully deleted project %d", id)
		return nil
	})
}
