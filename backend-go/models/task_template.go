package models

import (
	"encoding/json"
	"errors"
	"time"
)

// TaskTemplate представляет шаблон задачи
type TaskTemplate struct {
	ID          uint                `gorm:"column:id;primaryKey" json:"id"`
	Code        string              `gorm:"column:code;type:varchar(100);unique;not null" json:"code"`
	Name        string              `gorm:"column:name;type:varchar(255);not null" json:"name"`
	Description string              `gorm:"column:description;type:text" json:"description"`
	Category    string              `gorm:"column:category;type:varchar(100)" json:"category"`
	IsActive    bool                `gorm:"column:is_active;default:true" json:"isActive"`
	Fields      []TaskFieldTemplate `gorm:"foreignKey:TemplateID" json:"fields"`
	CreatedAt   time.Time           `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time           `gorm:"column:updated_at" json:"updatedAt"`
}

func (TaskTemplate) TableName() string {
	return "task_templates"
}

// Validate проверяет корректность шаблона
func (t *TaskTemplate) Validate() error {
	if t.Code == "" {
		return errors.New("код шаблона обязателен")
	}
	if t.Name == "" {
		return errors.New("название шаблона обязательно")
	}
	if t.Category == "" {
		return errors.New("категория шаблона обязательна")
	}
	return nil
}

// TaskFieldTemplate определяет поле в шаблоне задачи
type TaskFieldTemplate struct {
	ID              uint      `gorm:"column:id;primaryKey" json:"id"`
	TemplateID      uint      `gorm:"column:template_id;not null" json:"templateId"`
	FieldKey        string    `gorm:"column:field_key;type:varchar(100);not null" json:"fieldKey"`
	FieldLabel      string    `gorm:"column:field_label;type:varchar(255);not null" json:"fieldLabel"`
	FieldType       string    `gorm:"column:field_type;type:varchar(50);not null" json:"fieldType"`
	IsRequired      bool      `gorm:"column:is_required;default:false" json:"isRequired"`
	IsVisible       bool      `gorm:"column:is_visible;default:true" json:"isVisible"`
	IsReadOnly      bool      `gorm:"column:is_read_only;default:false" json:"isReadOnly"`
	DefaultValue    *string   `gorm:"column:default_value;type:text" json:"defaultValue"`
	ValidationRules *string   `gorm:"column:validation_rules;type:text" json:"validationRules"`
	Options         *string   `gorm:"column:options;type:text" json:"options"`
	Order           int       `gorm:"column:order;default:0" json:"order"`
	Section         string    `gorm:"column:section;type:varchar(100)" json:"section"`
	Placeholder     *string   `gorm:"column:placeholder;type:varchar(255)" json:"placeholder"`
	HelpText        *string   `gorm:"column:help_text;type:text" json:"helpText"`
	CreatedAt       time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (TaskFieldTemplate) TableName() string {
	return "task_field_templates"
}

// Validate проверяет корректность определения поля
func (f *TaskFieldTemplate) Validate() error {
	if f.FieldKey == "" {
		return errors.New("ключ поля обязателен")
	}
	if f.FieldLabel == "" {
		return errors.New("название поля обязательно")
	}
	if f.FieldType == "" {
		return errors.New("тип поля обязателен")
	}
	if !IsValidFieldType(f.FieldType) {
		return errors.New("недопустимый тип поля")
	}
	return nil
}

// FieldType представляет тип поля
type FieldType string

const (
	FieldTypeText        FieldType = "text"
	FieldTypeTextarea    FieldType = "textarea"
	FieldTypeNumber      FieldType = "number"
	FieldTypeDate        FieldType = "date"
	FieldTypeDatetime    FieldType = "datetime"
	FieldTypeSelect      FieldType = "select"
	FieldTypeMultiselect FieldType = "multiselect"
	FieldTypeCheckbox    FieldType = "checkbox"
	FieldTypeFileUpload  FieldType = "file_upload"
	FieldTypeUserSelect  FieldType = "user_select"
	FieldTypeCurrency    FieldType = "currency"
)

// IsValidFieldType проверяет допустимость типа поля
func IsValidFieldType(fieldType string) bool {
	validTypes := []string{
		string(FieldTypeText),
		string(FieldTypeTextarea),
		string(FieldTypeNumber),
		string(FieldTypeDate),
		string(FieldTypeDatetime),
		string(FieldTypeSelect),
		string(FieldTypeMultiselect),
		string(FieldTypeCheckbox),
		string(FieldTypeFileUpload),
		string(FieldTypeUserSelect),
		string(FieldTypeCurrency),
	}
	for _, vt := range validTypes {
		if vt == fieldType {
			return true
		}
	}
	return false
}

// ValidationRule представляет правило валидации
type ValidationRule struct {
	Type    string      `json:"type"`    // min, max, regex, email, url, etc.
	Value   interface{} `json:"value"`   // значение правила
	Message string      `json:"message"` // сообщение об ошибке
}

// SelectOption представляет опцию для select/multiselect
type SelectOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// ParseValidationRules парсит JSON правил валидации
func ParseValidationRules(rulesJSON *string) ([]ValidationRule, error) {
	if rulesJSON == nil || *rulesJSON == "" {
		return []ValidationRule{}, nil
	}
	var rules []ValidationRule
	err := json.Unmarshal([]byte(*rulesJSON), &rules)
	return rules, err
}

// ParseSelectOptions парсит JSON опций для select
func ParseSelectOptions(optionsJSON *string) ([]SelectOption, error) {
	if optionsJSON == nil || *optionsJSON == "" {
		return []SelectOption{}, nil
	}
	var options []SelectOption
	err := json.Unmarshal([]byte(*optionsJSON), &options)
	return options, err
}
