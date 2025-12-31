package models

import (
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
	Project                      *Project   `gorm:"foreignKey:ProjectId;references:Id" json:"project,omitempty"`
}

func (ProjectTask) TableName() string {
	return "ProjectTasks"
}
