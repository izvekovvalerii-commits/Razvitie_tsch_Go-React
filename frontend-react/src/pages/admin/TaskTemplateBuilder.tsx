import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { taskTemplateService } from '../../services/taskTemplates';
import { TaskTemplate, TaskFieldTemplate, FieldType } from '../../types/taskTemplate';
import {
    Type, Hash, Calendar, CheckSquare, List, Upload, User,
    Trash2, Save, ArrowLeft, GripVertical, Settings
} from 'lucide-react';
import './TaskTemplateBuilder.css';

// --- Field Types Configuration ---
const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Текст', icon: <Type size={18} /> },
    { type: 'textarea', label: 'Многострочный текст', icon: <List size={18} /> },
    { type: 'number', label: 'Число', icon: <Hash size={18} /> },
    { type: 'date', label: 'Дата', icon: <Calendar size={18} /> },
    { type: 'select', label: 'Выпадающий список', icon: <CheckSquare size={18} /> },
    { type: 'checkbox', label: 'Чекбокс', icon: <CheckSquare size={18} /> },
    { type: 'file_upload', label: 'Файл', icon: <Upload size={18} /> },
    { type: 'user_select', label: 'Пользователь', icon: <User size={18} /> },
    { type: 'currency', label: 'Деньги', icon: <span style={{ fontSize: 18, fontWeight: 700 }}>₽</span> }
];

// --- Sortable Field Item Component ---
const SortableFieldItem = ({ field, onSelect, onDelete, isSelected }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.fieldKey });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`field-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(field)}
        >
            <div className="field-drag-handle" {...attributes} {...listeners}>
                <GripVertical size={16} />
            </div>
            <div className="field-content">
                <span className="field-label">{field.fieldLabel}</span>
                <span className="field-type-badge">{field.fieldType}</span>
                {field.isRequired && <span className="field-required">*</span>}
            </div>
            <button className="field-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(field.fieldKey); }}>
                <Trash2 size={16} />
            </button>
        </div>
    );
};

export const TaskTemplateBuilder: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [template, setTemplate] = useState<TaskTemplate>({
        id: 0,
        code: '',
        name: '',
        description: '',
        category: 'Общее',
        isActive: true,
        fields: []
    });

    const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(!isNew);
    const [isSaving, setIsSaving] = useState(false);

    // Draggable Config
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (!isNew) {
            loadTemplate(parseInt(id!));
        }
    }, [id]);

    const loadTemplate = async (templateId: number) => {
        try {
            const data = await taskTemplateService.getById(templateId);
            setTemplate(data);
        } catch (err) {
            alert('Failed to load template');
            navigate('/admin/task-templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!template.code || !template.name) {
            alert('Код и название обязательны');
            return;
        }

        setIsSaving(true);
        try {
            // Re-index orders
            const orderedFields = template.fields.map((f, index) => ({ ...f, order: index + 1 }));
            const dataToSave = { ...template, fields: orderedFields };

            if (isNew) {
                const created = await taskTemplateService.create(dataToSave);
                alert('Шаблон создан!');
                navigate(`/admin/task-templates/${created.id}`);
            } else {
                await taskTemplateService.update(template.id, dataToSave);
                alert('Шаблон обновлен!');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const addField = (type: FieldType) => {
        const newField: TaskFieldTemplate = {
            fieldKey: `field_${Date.now()}`,
            fieldLabel: `Новое поле ${type}`,
            fieldType: type,
            isRequired: false,
            isVisible: true,
            isReadOnly: false,
            order: template.fields.length + 1,
            section: 'Основное'
        };

        setTemplate({ ...template, fields: [...template.fields, newField] });
        setSelectedFieldKey(newField.fieldKey);
    };

    const updateSelectedField = (updates: Partial<TaskFieldTemplate>) => {
        if (!selectedFieldKey) return;
        setTemplate({
            ...template,
            fields: template.fields.map(f => f.fieldKey === selectedFieldKey ? { ...f, ...updates } : f)
        });
    };

    const deleteField = (key: string) => {
        setTemplate({
            ...template,
            fields: template.fields.filter(f => f.fieldKey !== key)
        });
        if (selectedFieldKey === key) setSelectedFieldKey(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = template.fields.findIndex(f => f.fieldKey === active.id);
            const newIndex = template.fields.findIndex(f => f.fieldKey === over?.id);
            setTemplate({
                ...template,
                fields: arrayMove(template.fields, oldIndex, newIndex)
            });
        }
    };

    if (isLoading) return <div className="loading">Загрузка...</div>;

    const selectedField = template.fields.find(f => f.fieldKey === selectedFieldKey);

    return (
        <div className="builder-container">
            {/* Header */}
            <div className="builder-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin/task-templates')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>{isNew ? 'Новый шаблон' : 'Редактирование шаблона'}</h1>
                        <span className="template-meta">{template.code} • {template.fields.length} полей</span>
                    </div>
                </div>
                <button className="btn-primary save-btn" onClick={handleSave} disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? 'Сохранение...' : 'Сохранить шаблон'}
                </button>
            </div>

            <div className="builder-layout">
                {/* 1. Left Sidebar: Toolbox */}
                <div className="builder-toolbox">
                    <h3>Инструменты</h3>
                    <div className="tools-grid">
                        {FIELD_TYPES.map(ft => (
                            <button key={ft.type} className="tool-btn" onClick={() => addField(ft.type)}>
                                {ft.icon}
                                <span>{ft.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="template-settings-form">
                        <h3>Настройки шаблона</h3>
                        <div className="form-group">
                            <label>Название шаблона</label>
                            <input
                                type="text"
                                value={template.name}
                                onChange={e => setTemplate({ ...template, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Код (уникальный)</label>
                            <input
                                type="text"
                                value={template.code}
                                onChange={e => setTemplate({ ...template, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Категория</label>
                            <input
                                type="text"
                                value={template.category}
                                onChange={e => setTemplate({ ...template, category: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Main Canvas: Form Preview */}
                <div className="builder-canvas">
                    <div className="canvas-header">
                        <h2>Предпросмотр формы</h2>
                        <p>Перетаскивайте поля для изменения порядка</p>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={template.fields.map(f => f.fieldKey)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="form-fields-list">
                                {template.fields.length === 0 ? (
                                    <div className="empty-canvas">
                                        <p>Выберите поля из панели слева</p>
                                    </div>
                                ) : (
                                    template.fields.map(field => (
                                        <SortableFieldItem
                                            key={field.fieldKey}
                                            field={field}
                                            onSelect={setSelectedFieldKey} // Pass key, but expecting object in SortableFieldItem
                                            onDelete={deleteField}
                                            isSelected={selectedFieldKey === field.fieldKey}
                                        />
                                    ))
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* 3. Right Sidebar: Properties */}
                <div className="builder-properties">
                    <div className="properties-header">
                        <h3>Свойства поля</h3>
                        {!selectedField && <span className="no-selection">Выберите поле</span>}
                    </div>

                    {selectedField ? (
                        <div className="properties-form">
                            <div className="form-group">
                                <label>Название поля</label>
                                <input
                                    type="text"
                                    value={selectedField.fieldLabel}
                                    onChange={e => updateSelectedField({ fieldLabel: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Ключ поля (англ)</label>
                                <input
                                    type="text"
                                    value={selectedField.fieldKey}
                                    onChange={e => updateSelectedField({ fieldKey: e.target.value })}
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={selectedField.isRequired}
                                        onChange={e => updateSelectedField({ isRequired: e.target.checked })}
                                    />
                                    Обязательное поле
                                </label>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={selectedField.isReadOnly}
                                        onChange={e => updateSelectedField({ isReadOnly: e.target.checked })}
                                    />
                                    Только для чтения
                                </label>
                            </div>

                            <div className="form-group">
                                <label>Секция</label>
                                <select
                                    value={selectedField.section || 'Основное'}
                                    onChange={e => updateSelectedField({ section: e.target.value })}
                                >
                                    <option value="Основное">Основное</option>
                                    <option value="Документы">Документы</option>
                                    <option value="Бюджет">Бюджет</option>
                                    <option value="Сроки">Сроки</option>
                                    <option value="Результаты">Результаты</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Placeholder</label>
                                <input
                                    type="text"
                                    value={selectedField.placeholder || ''}
                                    onChange={e => updateSelectedField({ placeholder: e.target.value })}
                                />
                            </div>

                            {/* Specific logic for Select types */}
                            {(selectedField.fieldType === 'select' || selectedField.fieldType === 'multiselect') && (
                                <div className="form-group">
                                    <label>Опции (JSON)</label>
                                    <textarea
                                        className="code-input"
                                        value={selectedField.options || ''}
                                        placeholder='[{"value":"1", "label":"Option 1"}]'
                                        onChange={e => updateSelectedField({ options: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="delete-section">
                                <button className="btn-danger full-width" onClick={() => deleteField(selectedField.fieldKey)}>
                                    Удалить поле
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-properties">
                            <Settings size={48} color="#eee" />
                            <p>Выберите поле для настройки</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
