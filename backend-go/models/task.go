package models

import (
	"errors"
	"time"
)

type ProjectTask struct {
	ID                           uint       `gorm:"column:Id;primaryKey" json:"id"`
	ProjectID                    uint       `gorm:"column:ProjectId;not null" json:"projectId" binding:"required"`
	Name                         string     `gorm:"column:Name;type:varchar(255);not null" json:"name" binding:"required"`
	TaskType                     string     `gorm:"column:TaskType;type:varchar(100)" json:"taskType"`
	Responsible                  string     `gorm:"column:Responsible;type:varchar(255)" json:"responsible"`
	ResponsibleUserID            *int       `gorm:"column:ResponsibleUserId" json:"responsibleUserId"`
	NormativeDeadline            time.Time  `gorm:"column:NormativeDeadline;not null" json:"normativeDeadline" binding:"required"`
	PlannedStartDate             *time.Time `gorm:"column:PlannedStartDate" json:"plannedStartDate"`
	ActualDate                   *time.Time `gorm:"column:ActualDate" json:"actualDate"`
	Status                       string     `gorm:"column:Status;type:varchar(50);default:'Назначена'" json:"status"`
	CreatedAt                    *time.Time `gorm:"column:CreatedAt" json:"createdAt"`
	UpdatedAt                    *time.Time `gorm:"column:UpdatedAt" json:"updatedAt"`
	StartedAt                    *time.Time `gorm:"column:StartedAt" json:"startedAt"`
	CompletedAt                  *time.Time `gorm:"column:CompletedAt" json:"completedAt"`
	Code                         *string    `gorm:"column:Code;type:varchar(50)" json:"code"`
	IsActive                     bool       `gorm:"column:IsActive;default:false" json:"isActive"`
	Stage                        *string    `gorm:"column:Stage;type:varchar(100)" json:"stage"`
	PlannedAuditDate             *time.Time `gorm:"column:PlannedAuditDate" json:"plannedAuditDate"`
	ProjectFolderLink            *string    `gorm:"column:ProjectFolderLink;type:text" json:"projectFolderLink"`
	ActualAuditDate              *time.Time `gorm:"column:ActualAuditDate" json:"actualAuditDate"`
	AlcoholLicenseEligibility    *string    `gorm:"column:AlcoholLicenseEligibility;type:varchar(50)" json:"alcoholLicenseEligibility"`
	TboDocsLink                  *string    `gorm:"column:TboDocsLink;type:text" json:"tboDocsLink"`
	TboAgreementDate             *time.Time `gorm:"column:TboAgreementDate" json:"tboAgreementDate"`
	TboRegistryDate              *time.Time `gorm:"column:TboRegistryDate" json:"tboRegistryDate"`
	PlanningContourAgreementDate *time.Time `gorm:"column:PlanningContourAgreementDate" json:"planningContourAgreementDate"`
	VisualizationAgreementDate   *time.Time `gorm:"column:VisualizationAgreementDate" json:"visualizationAgreementDate"`
	LogisticsNbkpEligibility     *string    `gorm:"column:LogisticsNbkpEligibility;type:varchar(50)" json:"logisticsNbkpEligibility"`
	LayoutAgreementDate          *time.Time `gorm:"column:LayoutAgreementDate" json:"layoutAgreementDate"`
	EquipmentCostNoVat           *float64   `gorm:"column:EquipmentCostNoVat" json:"equipmentCostNoVat"`
	SecurityBudgetNoVat          *float64   `gorm:"column:SecurityBudgetNoVat" json:"securityBudgetNoVat"`
	RsrBudgetNoVat               *float64   `gorm:"column:RsrBudgetNoVat" json:"rsrBudgetNoVat"`
	PisBudgetNoVat               *float64   `gorm:"column:PisBudgetNoVat" json:"pisBudgetNoVat"`
	TotalBudgetNoVat             *float64   `gorm:"column:TotalBudgetNoVat" json:"totalBudgetNoVat"`
	Days                         *int       `gorm:"column:Days" json:"days"`
	DependsOn                    *string    `gorm:"column:DependsOn;type:text" json:"dependsOn"`
	Order                        int        `gorm:"column:Order;default:0" json:"order"`
	// Approval fields
	IsApproved *bool      `gorm:"column:IsApproved;default:false" json:"isApproved"`
	ApprovedBy *string    `gorm:"column:ApprovedBy;type:varchar(255)" json:"approvedBy"`
	ApprovedAt *time.Time `gorm:"column:ApprovedAt" json:"approvedAt"`

	// Dynamic Templates Support
	TaskTemplateID     *uint         `gorm:"column:TaskTemplateID" json:"taskTemplateId"`
	CustomFieldsValues *string       `gorm:"column:CustomFieldsValues;type:text" json:"customFieldsValues"` // JSON хранение значений
	TaskTemplate       *TaskTemplate `gorm:"foreignKey:TaskTemplateID" json:"taskTemplate,omitempty"`

	Project *Project `gorm:"foreignKey:ProjectId;references:Id" json:"project,omitempty"`
}

func (ProjectTask) TableName() string {
	return "ProjectTasks"
}

// Validate проверяет корректность данных задачи
func (t *ProjectTask) Validate() error {
	// Проверка обязательных полей
	if t.ProjectID == 0 {
		return errors.New("projectId обязателен")
	}

	if t.Name == "" {
		return errors.New("название задачи обязательно")
	}

	if t.NormativeDeadline.IsZero() {
		return errors.New("нормативный срок обязателен")
	}

	// Валидация статуса задачи
	if t.Status != "" && !IsValidTaskStatus(t.Status) {
		return errors.New("недопустимый статус задачи")
	}

	// Проверка логики дат
	if t.ActualDate != nil && t.ActualDate.Before(t.NormativeDeadline) {
		// Задача выполнена раньше срока - это нормально
	}

	return nil
}

// SetDefaultValues устанавливает значения по умолчанию
func (t *ProjectTask) SetDefaultValues() {
	if t.Status == "" {
		t.Status = string(TaskStatusAssigned)
	}
}

// IsCompleted проверяет, завершена ли задача
func (t *ProjectTask) IsCompleted() bool {
	return t.Status == string(TaskStatusCompleted)
}

// IsOverdue проверяет, просрочена ли задача
func (t *ProjectTask) IsOverdue() bool {
	if t.IsCompleted() {
		return false
	}
	return time.Now().After(t.NormativeDeadline)
}
