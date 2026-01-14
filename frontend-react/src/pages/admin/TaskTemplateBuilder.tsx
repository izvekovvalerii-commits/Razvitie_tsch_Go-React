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
    Trash2, Save, GripVertical, Eye, Code, Plus
} from 'lucide-react';
import { DynamicTaskForm } from '../../components/DynamicTaskForm';
import './TaskTemplateBuilder.css';
import '../../components/ImprovedTaskModal.css';

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

// Auto-generate fieldKey from fieldLabel
const generateFieldKey = (label: string): string => {
    const translitMap: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
        'я': 'ya', ' ': '_', '-': '_', '/': '_', '\\': '_', '(': '', ')': '', '[': '', ']': '',
        '{': '', '}': '', ',': '', '.': '', '!': '', '?': '', ':': '', ';': '', '"': '', "'": ''
    };

    return label
        .toLowerCase()
        .split('')
        .map(char => translitMap[char] || (/[a-z0-9]/.test(char) ? char : ''))
        .join('')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        || 'field';
};

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
    const [mockValues, setMockValues] = useState<Record<string, any>>({});
    const [activeTab, setActiveTab] = useState<'basic' | 'documents'>('basic');

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
        setIsLoading(true);
        try {
            const data = await taskTemplateService.getById(templateId);
            console.log('✅ Loaded template:', data);
            console.log('✅ Template fields count:', data.fields?.length || 0);
            console.log('✅ Template fields:', data.fields);

            // Check field keys
            if (data.fields) {
                data.fields.forEach((field, index) => {
                    console.log(`Field ${index}:`, {
                        fieldKey: field.fieldKey,
                        fieldLabel: field.fieldLabel,
                        fieldType: field.fieldType
                    });

                    // Ensure fieldKey exists
                    if (!field.fieldKey) {
                        console.warn(`⚠️ Field ${index} missing fieldKey, generating one`);
                        field.fieldKey = `field_${Date.now()}_${index}`;
                    }
                });
            }

            setTemplate(data);
        } catch (err) {
            console.error('❌ Failed to load template:', err);
            alert('Failed to load template');
            navigate('/admin/task-templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation with inline feedback
        if (!template.name) {
            // Show error in console for debugging
            console.error('Validation failed: Название шаблона');

            // Visual feedback - scroll to settings
            const settingsForm = document.querySelector('.template-settings-form');
            if (settingsForm) {
                settingsForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            return;
        }

        // Auto-generate code from name if not set
        const templateCode = template.code || generateFieldKey(template.name).toUpperCase().replace(/_/g, '-');

        setIsSaving(true);
        try {
            const orderedFields = template.fields.map((f, index) => ({ ...f, order: index + 1 }));
            const dataToSave = { ...template, code: templateCode, fields: orderedFields };

            if (isNew) {
                const created = await taskTemplateService.create(dataToSave);
                console.log('✓ Шаблон создан:', created);
                navigate(`/admin/task-templates/${created.id}`);
            } else {
                await taskTemplateService.update(template.id, dataToSave);
                console.log('✓ Шаблон обновлен');
                // Show success feedback
                const saveBtn = document.querySelector('.btn-primary');
                if (saveBtn) {
                    const originalText = saveBtn.textContent;
                    saveBtn.textContent = '✓ Сохранено!';
                    setTimeout(() => {
                        saveBtn.textContent = originalText;
                    }, 2000);
                }
            }
        } catch (err: any) {
            console.error('Save error:', err);
            alert(`Ошибка сохранения: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const addField = (type: FieldType) => {
        // Generate unique field key
        const baseKey = `field_${Date.now()}`;

        const newField: TaskFieldTemplate = {
            fieldKey: baseKey,
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

        // Auto-generate fieldKey if fieldLabel is being updated
        if (updates.fieldLabel !== undefined) {
            let newKey = generateFieldKey(updates.fieldLabel);

            // Ensure uniqueness - add counter if key already exists
            let counter = 1;
            const existingKeys = template.fields
                .filter(f => f.fieldKey !== selectedFieldKey)
                .map(f => f.fieldKey);

            while (existingKeys.includes(newKey)) {
                newKey = `${generateFieldKey(updates.fieldLabel)}_${counter}`;
                counter++;
            }

            updates.fieldKey = newKey;

            setTemplate({
                ...template,
                fields: template.fields.map(f => f.fieldKey === selectedFieldKey ? { ...f, ...updates } : f)
            });

            setSelectedFieldKey(newKey);
        } else {
            setTemplate({
                ...template,
                fields: template.fields.map(f => f.fieldKey === selectedFieldKey ? { ...f, ...updates } : f)
            });
        }
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

    const selectedField = template.fields.find(f => f.fieldKey === selectedFieldKey);
    const basicFields = template.fields.filter(f => f.fieldType !== 'file_upload');
    const documentFields = template.fields.filter(f => f.fieldType === 'file_upload');

    if (isLoading) return <div className="loading">Загрузка...</div>;

    return (
        <div className="builder-container">
            {/* Left Sidebar: Field Types */}
            <div className="builder-toolbox">
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
                        Типы полей
                    </h3>
                    <div className="tools-grid" style={{ display: 'grid', gap: '8px' }}>
                        {FIELD_TYPES.map(ft => (
                            <button
                                key={ft.type}
                                className="tool-btn"
                                onClick={() => addField(ft.type)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 12px',
                                    border: '1px solid #cbd5e1',
                                    background: 'white',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    transition: 'all 0.2s',
                                    color: '#475569'
                                }}
                            >
                                {ft.icon}
                                <span>{ft.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Quick Add Document Button */}
                    <div style={{ marginTop: '12px' }}>
                        <button
                            onClick={() => addField('file_upload')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px',
                                border: '2px dashed #cbd5e1',
                                background: 'white',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#3b82f6',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.background = '#eff6ff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.background = 'white';
                            }}
                        >
                            <Upload size={18} />
                            <span>+ Добавить документ</span>
                        </button>
                    </div>
                </div>

                <div className="template-settings-form">
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
                        Настройки шаблона
                    </h3>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                            Название шаблона <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={template.name}
                            onChange={e => setTemplate({ ...template, name: e.target.value })}
                            placeholder="Например: Подготовка к аудиту"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: `1px solid ${!template.name ? '#ef4444' : '#cbd5e1'}`,
                                borderRadius: '6px',
                                fontSize: '13px',
                                background: !template.name ? '#fef2f2' : 'white'
                            }}
                        />
                        {!template.name && (
                            <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                Обязательное поле
                            </small>
                        )}
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                            Категория
                        </label>
                        <input
                            type="text"
                            value={template.category}
                            onChange={e => setTemplate({ ...template, category: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>
                        Поля ({template.fields.length})
                    </h3>
                    {template.fields.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                            Добавьте поля из списка выше
                        </p>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={template.fields.map(f => f.fieldKey)} strategy={verticalListSortingStrategy}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {template.fields.map(field => (
                                        <SortableFieldItem
                                            key={field.fieldKey}
                                            field={field}
                                            onSelect={() => setSelectedFieldKey(field.fieldKey)}
                                            onDelete={deleteField}
                                            isSelected={selectedField?.fieldKey === field.fieldKey}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Center: Live Preview of Task Form */}
            <div className="builder-preview">
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {/* Preview Header */}
                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 4px 0' }}>
                                <Eye size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                                Предпросмотр формы задачи
                            </h2>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                Так будет выглядеть форма при использовании шаблона
                            </p>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 20px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                opacity: isSaving ? 0.6 : 1
                            }}
                        >
                            <Save size={16} />
                            {isSaving ? 'Сохранение...' : 'Сохранить шаблон'}
                        </button>
                    </div>

                    {/* Mock Task Modal */}
                    <div className="modal-container-improved" style={{
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div className="modal-header-improved" style={{
                            padding: '20px 24px',
                            borderBottom: '2px solid #e2e8f0'
                        }}>
                            <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={template.name}
                                        onChange={e => setTemplate({ ...template, name: e.target.value })}
                                        placeholder="Введите название шаблона"
                                        style={{
                                            fontSize: '20px',
                                            fontWeight: '600',
                                            margin: '0 0 8px 0',
                                            color: '#0f172a',
                                            border: '2px solid transparent',
                                            borderRadius: '6px',
                                            padding: '6px 12px',
                                            width: '100%',
                                            outline: 'none',
                                            background: 'transparent',
                                            transition: 'all 0.2s',
                                            cursor: 'text'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#3b82f6';
                                            e.target.style.background = '#eff6ff';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'transparent';
                                            e.target.style.background = 'transparent';
                                        }}
                                    />
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        fontFamily: 'monospace'
                                    }}>
                                        {template.code || (template.name ? generateFieldKey(template.name).toUpperCase().replace(/_/g, '-') : 'TASK-CODE')}
                                    </span>
                                </div>
                                <div className="status-badge-header" style={{
                                    padding: '6px 16px',
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}>
                                    Назначена
                                </div>
                            </div>
                            <div className="header-meta" style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                                <div>
                                    <span style={{ color: '#64748b' }}>Прогресс: </span>
                                    <span style={{ color: '#0f172a', fontWeight: '500' }}>0%</span>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b' }}>До срока: </span>
                                    <span style={{ color: '#0f172a', fontWeight: '500' }}>2 дн.</span>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b' }}>Приоритет: </span>
                                    <span style={{
                                        color: '#dc2626',
                                        fontWeight: '600',
                                        padding: '2px 8px',
                                        background: '#fee2e2',
                                        borderRadius: '4px'
                                    }}>
                                        Высокий
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="modal-tabs" style={{
                            display: 'flex',
                            padding: '0 24px',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc'
                        }}>
                            <button
                                className={activeTab === 'basic' ? 'active' : ''}
                                onClick={() => setActiveTab('basic')}
                                style={{
                                    padding: '12px 20px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '14px',
                                    fontWeight: activeTab === 'basic' ? '600' : '500',
                                    color: activeTab === 'basic' ? '#3b82f6' : '#64748b',
                                    borderBottom: activeTab === 'basic' ? '2px solid #3b82f6' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📋 Основное
                            </button>
                            <button
                                className={activeTab === 'documents' ? 'active' : ''}
                                onClick={() => setActiveTab('documents')}
                                style={{
                                    padding: '12px 20px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '14px',
                                    fontWeight: activeTab === 'documents' ? '600' : '500',
                                    color: activeTab === 'documents' ? '#3b82f6' : '#64748b',
                                    borderBottom: activeTab === 'documents' ? '2px solid #3b82f6' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📎 Документы {documentFields.length > 0 && `(${documentFields.length})`}
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-body-improved" style={{ padding: '24px', minHeight: '300px' }}>
                            {activeTab === 'basic' && (
                                <>
                                    {/* Base Fields - Always Visible */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '16px',
                                        marginBottom: basicFields.length > 0 ? '24px' : '0',
                                        paddingBottom: basicFields.length > 0 ? '24px' : '0',
                                        borderBottom: basicFields.length > 0 ? '2px solid #e2e8f0' : 'none'
                                    }}>
                                        {/* Ответственный */}
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#475569',
                                                marginBottom: '6px'
                                            }}>
                                                👤 Ответственный
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="МП"
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    background: '#f8fafc',
                                                    color: '#64748b'
                                                }}
                                            />
                                        </div>

                                        {/* Плановая дата начала */}
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#475569',
                                                marginBottom: '6px'
                                            }}>
                                                📅 Плановая дата начала
                                            </label>
                                            <input
                                                type="date"
                                                defaultValue="2026-01-13"
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    background: '#f8fafc',
                                                    color: '#64748b'
                                                }}
                                            />
                                        </div>

                                        {/* Статус */}
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#475569',
                                                marginBottom: '6px'
                                            }}>
                                                🔴 Статус
                                            </label>
                                            <select
                                                disabled
                                                defaultValue="Назначена"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    background: '#f8fafc',
                                                    color: '#64748b'
                                                }}
                                            >
                                                <option>Назначена</option>
                                                <option>В работе</option>
                                                <option>Завершена</option>
                                            </select>
                                        </div>

                                        {/* Нормативный срок */}
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#475569',
                                                marginBottom: '6px'
                                            }}>
                                                ⏰ Нормативный срок
                                            </label>
                                            <input
                                                type="date"
                                                defaultValue="2026-01-15"
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    background: '#f8fafc',
                                                    color: '#64748b'
                                                }}
                                            />
                                        </div>

                                        {/* Приоритет */}
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#475569',
                                                marginBottom: '6px'
                                            }}>
                                                ⚡ Приоритет
                                            </label>
                                            <input
                                                type="text"
                                                defaultValue="Высокий"
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    background: '#f8fafc',
                                                    color: '#64748b'
                                                }}
                                            />
                                        </div>

                                        {/* Длительность */}
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#475569',
                                                marginBottom: '6px'
                                            }}>
                                                Длительность (дней):
                                            </label>
                                            <input
                                                type="number"
                                                defaultValue="2"
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    background: '#f8fafc',
                                                    color: '#64748b'
                                                }}
                                            />
                                        </div>

                                        {/* Фактическая дата */}
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#475569',
                                                marginBottom: '6px'
                                            }}>
                                                ✓ Фактическая дата
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="ДД.ММ.ГГГГ"
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    background: '#f8fafc',
                                                    color: '#cbd5e1'
                                                }}
                                            />
                                            <small style={{
                                                display: 'block',
                                                fontSize: '12px',
                                                color: '#94a3b8',
                                                marginTop: '4px',
                                                fontStyle: 'italic'
                                            }}>
                                                Автоматически при завершении
                                            </small>
                                        </div>
                                    </div>

                                    {/* Custom Fields from Template */}
                                    {basicFields.length > 0 && (
                                        <div>
                                            <h4 style={{
                                                fontSize: '15px',
                                                fontWeight: '600',
                                                margin: '0 0 16px 0',
                                                color: '#1e293b'
                                            }}>
                                                Дополнительные поля шаблона
                                            </h4>
                                            <DynamicTaskForm
                                                fields={basicFields}
                                                values={mockValues}
                                                onChange={(key, val) => setMockValues(prev => ({ ...prev, [key]: val }))}
                                                readOnly={false}
                                                users={[]}
                                                onFieldClick={setSelectedFieldKey}
                                                selectedFieldKey={selectedFieldKey}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            {activeTab === 'documents' && (
                                <>
                                    <h4 style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        margin: '0 0 16px 0',
                                        color: '#0f172a'
                                    }}>
                                        📂 Обязательные документы
                                    </h4>
                                    {documentFields.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {documentFields.map(field => {
                                                let maxSize = 10;
                                                let allowedTypes = '';
                                                try {
                                                    if (field.validationRules) {
                                                        const rules = JSON.parse(field.validationRules);
                                                        maxSize = rules.maxSize || 10;
                                                        allowedTypes = rules.allowedTypes || '';
                                                    }
                                                } catch (e) {
                                                    // ignore parsing errors
                                                }

                                                return (
                                                    <div
                                                        key={field.fieldKey}
                                                        onClick={() => setSelectedFieldKey(field.fieldKey)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '12px',
                                                            background: selectedField?.fieldKey === field.fieldKey
                                                                ? 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)'
                                                                : '#f8fafc',
                                                            border: selectedField?.fieldKey === field.fieldKey
                                                                ? '2px solid #3b82f6'
                                                                : '2px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: selectedField?.fieldKey === field.fieldKey
                                                                ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
                                                                : 'none'
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (selectedField?.fieldKey !== field.fieldKey) {
                                                                e.currentTarget.style.background = '#f1f5f9';
                                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (selectedField?.fieldKey !== field.fieldKey) {
                                                                e.currentTarget.style.background = '#f8fafc';
                                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                            }
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '20px' }}>⚠️</span>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{
                                                                fontWeight: '500',
                                                                fontSize: '14px',
                                                                color: '#1e293b'
                                                            }}>
                                                                {field.fieldLabel}
                                                                {field.isRequired && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                                                            </div>
                                                            {(field.helpText || allowedTypes || maxSize) && (
                                                                <small style={{
                                                                    display: 'block',
                                                                    color: '#64748b',
                                                                    fontSize: '12px',
                                                                    marginTop: '4px'
                                                                }}>
                                                                    {field.helpText && <div>{field.helpText}</div>}
                                                                    {allowedTypes && <div>Типы: {allowedTypes}</div>}
                                                                    {maxSize && <div>Макс. размер: {maxSize} МБ</div>}
                                                                </small>
                                                            )}
                                                        </div>
                                                        <button style={{
                                                            padding: '6px 12px',
                                                            fontSize: '13px',
                                                            background: '#f1f5f9',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '6px',
                                                            color: '#64748b',
                                                            cursor: 'not-allowed',
                                                            fontWeight: '500'
                                                        }} disabled>
                                                            Загрузить
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '60px 20px',
                                            color: '#94a3b8'
                                        }}>
                                            <p style={{ fontSize: '14px', margin: 0 }}>
                                                Добавьте поля типа "Файл" для отображения обязательных документов
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer-improved" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderTop: '1px solid #e2e8f0',
                            background: '#f8fafc'
                        }}>
                            <button style={{
                                padding: '10px 20px',
                                border: '1px solid #cbd5e1',
                                background: 'white',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'not-allowed',
                                color: '#64748b'
                            }} disabled>
                                Отмена
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    background: '#10b981',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'not-allowed',
                                    opacity: 0.5
                                }} disabled>
                                    ✓ Завершить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            {/* Right Sidebar: Field Properties */}
            < div className="builder-properties" >
                {
                    selectedField ? (
                        <div>
                            <div style={{
                                borderBottom: '3px solid #fbbf24',
                                paddingBottom: '16px',
                                marginBottom: '24px'
                            }}>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    margin: '0',
                                    color: '#0f172a'
                                }}>
                                    Свойства поля
                                </h3>
                            </div>

                            <div className="properties-form">
                                {/* Название поля */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#64748b',
                                        marginBottom: '8px'
                                    }}>
                                        Название поля
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedField.fieldLabel}
                                        onChange={e => updateSelectedField({ fieldLabel: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            background: 'white'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                {/* Подсказка (placeholder) */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#64748b',
                                        marginBottom: '8px'
                                    }}>
                                        Подсказка (placeholder)
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedField.placeholder || ''}
                                        onChange={e => updateSelectedField({ placeholder: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            background: 'white'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                {/* Подсказка (helpText) */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#64748b',
                                        marginBottom: '8px'
                                    }}>
                                        Подсказка (helpText)
                                    </label>
                                    <textarea
                                        value={selectedField.helpText || ''}
                                        onChange={e => updateSelectedField({ helpText: e.target.value })}
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            background: 'white'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                </div>

                                {/* Select/Multiselect Options */}
                                {(selectedField.fieldType === 'select' || selectedField.fieldType === 'multiselect') && (
                                    <div style={{
                                        marginBottom: '24px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid #e2e8f0'
                                    }}>
                                        <h4 style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#0f172a',
                                            marginBottom: '12px'
                                        }}>
                                            📋 Варианты выбора
                                        </h4>

                                        <div style={{ marginBottom: '12px' }}>
                                            {(() => {
                                                const options = selectedField.parsedOptions || [];
                                                return options.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {options.map((opt, idx) => (
                                                            <div key={idx} style={{
                                                                display: 'flex',
                                                                gap: '8px',
                                                                alignItems: 'center',
                                                                padding: '8px 12px',
                                                                background: '#f8fafc',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0'
                                                            }}>
                                                                <span style={{ flex: 1, fontSize: '13px', color: '#475569' }}>
                                                                    {opt.label}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        const newOptions = options.filter((_, i) => i !== idx);
                                                                        updateSelectedField({
                                                                            parsedOptions: newOptions,
                                                                            options: JSON.stringify(newOptions)
                                                                        });
                                                                    }}
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        color: '#94a3b8',
                                                                        cursor: 'pointer',
                                                                        padding: '4px',
                                                                        borderRadius: '4px',
                                                                        display: 'flex',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p style={{
                                                        fontSize: '12px',
                                                        color: '#94a3b8',
                                                        textAlign: 'center',
                                                        padding: '16px',
                                                        background: '#f8fafc',
                                                        borderRadius: '8px',
                                                        margin: 0
                                                    }}>
                                                        Добавьте варианты для выбора
                                                    </p>
                                                );
                                            })()}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            gap: '8px'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="Введите вариант..."
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                        const newOption = {
                                                            value: e.currentTarget.value.trim().toLowerCase().replace(/\s+/g, '_'),
                                                            label: e.currentTarget.value.trim()
                                                        };
                                                        const currentOptions = selectedField.parsedOptions || [];
                                                        const updatedOptions = [...currentOptions, newOption];
                                                        updateSelectedField({
                                                            parsedOptions: updatedOptions,
                                                            options: JSON.stringify(updatedOptions)
                                                        });
                                                        e.currentTarget.value = '';
                                                    }
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 14px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    outline: 'none'
                                                }}
                                            />
                                            <button
                                                onClick={(e) => {
                                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                    if (input && input.value.trim()) {
                                                        const newOption = {
                                                            value: input.value.trim().toLowerCase().replace(/\s+/g, '_'),
                                                            label: input.value.trim()
                                                        };
                                                        const currentOptions = selectedField.parsedOptions || [];
                                                        const updatedOptions = [...currentOptions, newOption];
                                                        updateSelectedField({
                                                            parsedOptions: updatedOptions,
                                                            options: JSON.stringify(updatedOptions)
                                                        });
                                                        input.value = '';
                                                    }
                                                }}
                                                style={{
                                                    padding: '10px 16px',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <Plus size={16} />
                                                Добавить
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* File Upload Specific Settings */}
                                {selectedField.fieldType === 'file_upload' && (
                                    <>
                                        <div style={{
                                            marginBottom: '24px',
                                            paddingTop: '16px',
                                            borderTop: '1px solid #e2e8f0'
                                        }}>
                                            <h4 style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                margin: '0 0 16px 0',
                                                color: '#1e293b'
                                            }}>
                                                Настройки файла
                                            </h4>

                                            {/* Max file size */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#64748b',
                                                    marginBottom: '8px'
                                                }}>
                                                    Максимальный размер (МБ)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={(() => {
                                                        try {
                                                            const rules = selectedField.validationRules ? JSON.parse(selectedField.validationRules) : {};
                                                            return rules.maxSize || 10;
                                                        } catch {
                                                            return 10;
                                                        }
                                                    })()}
                                                    onChange={e => {
                                                        try {
                                                            const rules = selectedField.validationRules ? JSON.parse(selectedField.validationRules) : {};
                                                            rules.maxSize = parseInt(e.target.value) || 10;
                                                            updateSelectedField({ validationRules: JSON.stringify(rules) });
                                                        } catch {
                                                            updateSelectedField({ validationRules: JSON.stringify({ maxSize: parseInt(e.target.value) || 10 }) });
                                                        }
                                                    }}
                                                    min="1"
                                                    max="100"
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        transition: 'border-color 0.2s',
                                                        background: 'white'
                                                    }}
                                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                                />
                                            </div>

                                            {/* Allowed file types */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#64748b',
                                                    marginBottom: '8px'
                                                }}>
                                                    Допустимые типы файлов
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder=".pdf, .doc, .docx, .jpg, .png"
                                                    value={(() => {
                                                        try {
                                                            const rules = selectedField.validationRules ? JSON.parse(selectedField.validationRules) : {};
                                                            return rules.allowedTypes || '';
                                                        } catch {
                                                            return '';
                                                        }
                                                    })()}
                                                    onChange={e => {
                                                        try {
                                                            const rules = selectedField.validationRules ? JSON.parse(selectedField.validationRules) : {};
                                                            rules.allowedTypes = e.target.value;
                                                            updateSelectedField({ validationRules: JSON.stringify(rules) });
                                                        } catch {
                                                            updateSelectedField({ validationRules: JSON.stringify({ allowedTypes: e.target.value }) });
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        transition: 'border-color 0.2s',
                                                        background: 'white'
                                                    }}
                                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                                />
                                                <small style={{
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    color: '#94a3b8',
                                                    marginTop: '4px'
                                                }}>
                                                    Укажите расширения через запятую
                                                </small>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Checkboxes Section */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #e2e8f0'
                                }}>
                                    {/* Обязательное поле */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedField.isRequired}
                                            onChange={e => updateSelectedField({ isRequired: e.target.checked })}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                accentColor: '#3b82f6'
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '14px',
                                            color: '#0f172a',
                                            fontWeight: '500'
                                        }}>
                                            Обязательное поле
                                        </span>
                                    </label>

                                    {/* Видимое */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedField.isVisible}
                                            onChange={e => updateSelectedField({ isVisible: e.target.checked })}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                accentColor: '#3b82f6'
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '14px',
                                            color: '#0f172a',
                                            fontWeight: '500'
                                        }}>
                                            Видимое
                                        </span>
                                    </label>

                                    {/* Только для чтения */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedField.isReadOnly}
                                            onChange={e => updateSelectedField({ isReadOnly: e.target.checked })}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                accentColor: '#3b82f6'
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '14px',
                                            color: '#0f172a',
                                            fontWeight: '500'
                                        }}>
                                            Только для чтения
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div >
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                            <Code size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p style={{ fontSize: '13px', margin: 0 }}>
                                Выберите поле для настройки его свойств
                            </p>
                        </div>
                    )}
            </div >
        </div >
    );
};
