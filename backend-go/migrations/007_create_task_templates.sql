-- Миграция для создания таблиц конструктора задач
-- Файл: 007_create_task_templates.sql

-- Таблица шаблонов задач
CREATE TABLE IF NOT EXISTS task_templates (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица определений полей в шаблонах
CREATE TABLE IF NOT EXISTS task_field_templates (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    is_read_only BOOLEAN DEFAULT false,
    default_value TEXT,
    validation_rules TEXT,
    options TEXT,
    "order" INTEGER DEFAULT 0,
    section VARCHAR(100),
    placeholder VARCHAR(255),
    help_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, field_key)
);

-- Индексы для производительности
CREATE INDEX idx_task_templates_code ON task_templates(code);
CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_is_active ON task_templates(is_active);
CREATE INDEX idx_task_field_templates_template_id ON task_field_templates(template_id);
CREATE INDEX idx_task_field_templates_order ON task_field_templates(template_id, "order");

-- Добавление поля template_id в ProjectTasks (опционально)
ALTER TABLE "ProjectTasks" 
ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES task_templates(id);

-- Добавление поля для хранения кастомных полей
ALTER TABLE "ProjectTasks" 
ADD COLUMN IF NOT EXISTS custom_fields TEXT;

-- Индекс для template_id
CREATE INDEX IF NOT EXISTS idx_project_tasks_template_id ON "ProjectTasks"(template_id);

-- Создание предустановленных шаблонов (seed data)
INSERT INTO task_templates (code, name, description, category, is_active) VALUES
('AUDIT_STORE', 'Аудит магазина', 'Стандартный шаблон для проведения аудита магазина', 'Аудит', true),
('BUDGET_APPROVAL', 'Утверждение бюджета', 'Шаблон для согласования и утверждения бюджета проекта', 'Бюджет', true),
('CONSTRUCTION', 'СМР и ремонт', 'Шаблон для строительно-монтажных работ', 'СМР', true)
ON CONFLICT (code) DO NOTHING;

-- Базовые поля для шаблона "Аудит магазина"
INSERT INTO task_field_templates (template_id, field_key, field_label, field_type, is_required, "order", section) 
SELECT id, 'auditDate', 'Дата аудита', 'date', true, 1, 'Основное'
FROM task_templates WHERE code = 'AUDIT_STORE';

INSERT INTO task_field_templates (template_id, field_key, field_label, field_type, is_required, "order", section, options) 
SELECT id, 'auditType', 'Тип аудита', 'select', true, 2, 'Основное', 
'[{"value":"initial","label":"Первичный"},{"value":"repeat","label":"Повторный"},{"value":"control","label":"Контрольный"}]'
FROM task_templates WHERE code = 'AUDIT_STORE';

INSERT INTO task_field_templates (template_id, field_key, field_label, field_type, is_required, "order", section) 
SELECT id, 'auditorNotes', 'Заметки аудитора', 'textarea', false, 3, 'Результаты'
FROM task_templates WHERE code = 'AUDIT_STORE';

INSERT INTO task_field_templates (template_id, field_key, field_label, field_type, is_required, "order", section) 
SELECT id, 'auditDocuments', 'Документы аудита', 'file_upload', true, 4, 'Документы'
FROM task_templates WHERE code = 'AUDIT_STORE';

-- Базовые поля для шаблона "Утверждение бюджета"
INSERT INTO task_field_templates (template_id, field_key, field_label, field_type, is_required, "order", section, validation_rules) 
SELECT id, 'budgetAmount', 'Сумма бюджета', 'currency', true, 1, 'Бюджет',
'[{"type":"min","value":1000,"message":"Минимальная сумма 1000 руб"}]'
FROM task_templates WHERE code = 'BUDGET_APPROVAL';

INSERT INTO task_field_templates (template_id, field_key, field_label, field_type, is_required, "order", section) 
SELECT id, 'approver', 'Утверждающий', 'user_select', true, 2, 'Основное'
FROM task_templates WHERE code = 'BUDGET_APPROVAL';

INSERT INTO task_field_templates (template_id, field_key, field_label, field_type, is_required, "order", section) 
SELECT id, 'budgetDocument', 'Документ бюджета', 'file_upload', true, 3, 'Документы'
FROM task_templates WHERE code = 'BUDGET_APPROVAL';

COMMENT ON TABLE task_templates IS 'Шаблоны задач для конструктора';
COMMENT ON TABLE task_field_templates IS 'Определения полей для шаблонов задач';
