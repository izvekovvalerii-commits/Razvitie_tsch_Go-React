import React, { useState, useEffect } from 'react';
import { projectTemplateService, ProjectTemplate, TemplateTask } from '../services/projectTemplates';
import { taskTemplateService } from '../services/taskTemplates';
import { TaskTemplate } from '../types/taskTemplate';
import './ProjectManagement.css';


interface TemplateManagementProps {
    isEmbedded?: boolean;
}

const TemplateManagement: React.FC<TemplateManagementProps> = ({ isEmbedded = false }) => {
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
    const [tasks, setTasks] = useState<TemplateTask[]>([]);
    type DisplayTaskItem = TaskTemplate & {
        sourceType: 'template' | 'history';
        suggestedDuration?: number;
        suggestedStage?: string;
        suggestedRole?: string;
    };

    const [availableTasks, setAvailableTasks] = useState<DisplayTaskItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [draggedTask, setDraggedTask] = useState<TemplateTask | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDescription, setNewTemplateDescription] = useState('');
    const [newTemplateCategory, setNewTemplateCategory] = useState('Открытие магазина');

    const [activeTemplateDetail, setActiveTemplateDetail] = useState<TaskTemplate | null>(null);

    // Custom Task State
    const [isCustomTaskMode, setIsCustomTaskMode] = useState(false);
    const [customTask, setCustomTask] = useState<{
        code: string;
        name: string;
        stage: string;
        responsibleRole: string;
        duration: number;
        taskType: string;
        taskTemplateId?: number;
    }>({
        code: '',
        name: '',
        stage: 'Инициализация',
        responsibleRole: 'МП',
        duration: 1,
        taskType: 'UserTask',
        taskTemplateId: undefined
    });

    // Загрузка всех шаблонов
    useEffect(() => {
        loadTemplates();
        loadAvailableTasks();
    }, []);

    const loadTemplates = async (targetId?: number) => {
        setLoading(true);
        try {
            const data = await projectTemplateService.getAll();
            setTemplates(data);

            // Выбрать шаблон по умолчанию или первый
            if (data.length > 0) {
                let templateToSet = null;

                if (targetId) {
                    templateToSet = data.find(t => t.id === targetId);
                }

                if (!templateToSet) {
                    templateToSet = data.find(t => t.isDefault) || data[0];
                }

                if (templateToSet) {
                    setSelectedTemplate(templateToSet);
                    setTasks(templateToSet.tasks || []);
                }
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableTasks = async () => {
        try {
            const [activeTemplates, knownTasks] = await Promise.all([
                taskTemplateService.getActive(),
                projectTemplateService.getKnownTasks()
            ]);

            const mappedTemplates: DisplayTaskItem[] = activeTemplates.map(t => ({
                ...t,
                sourceType: 'template'
            }));

            const mappedKnown: DisplayTaskItem[] = knownTasks.map((t: any) => ({
                id: -Math.floor(Math.random() * 1000000),
                name: t.name,
                code: t.code,
                description: `Стандартная задача`,
                category: 'Стандартные',
                isActive: true,
                fields: [],
                createdAt: '',
                updatedAt: '',
                version: 1,
                sourceType: 'history',
                suggestedDuration: t.duration,
                suggestedStage: t.stage,
                suggestedRole: t.responsibleRole
            }));

            setAvailableTasks([...mappedTemplates, ...mappedKnown]);
        } catch (error) {
            console.error('Error loading available templates:', error);
        }
    };

    const handleTemplateChange = (templateId: number) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setTasks(template.tasks || []);
        }
    };

    const handleDragStart = (task: TemplateTask) => {
        setDraggedTask(task);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (targetTask: TemplateTask) => {
        if (!draggedTask || draggedTask.id === targetTask.id || !selectedTemplate) return;

        const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
        const targetIndex = tasks.findIndex(t => t.id === targetTask.id);

        const newTasks = [...tasks];
        newTasks.splice(draggedIndex, 1);
        newTasks.splice(targetIndex, 0, draggedTask);

        // Обновить order
        const updatedTasks = newTasks.map((t, index) => ({ ...t, order: index }));
        setTasks(updatedTasks);
        setDraggedTask(null);

        // TODO: Сохранить новый порядок на сервере
        console.log('New task order:', updatedTasks.map((t, i) => ({ index: i, code: t.code, name: t.name })));
    };

    const handleEditTask = (task: TemplateTask) => {
        setEditingTask({ ...task });
        setShowEditModal(true);
    };

    const handleSaveTask = async () => {
        if (!editingTask || !selectedTemplate) return;

        try {
            await projectTemplateService.updateTask(selectedTemplate.id, editingTask.id, editingTask);
            await loadTemplates(selectedTemplate.id);
            setShowEditModal(false);
            setEditingTask(null);
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Ошибка при сохранении задачи');
        }
    };

    const handleSelectTemplate = async (template: DisplayTaskItem) => {
        if (!selectedTemplate) return;

        // Для стандартных/исторических задач пробуем добавить сразу
        if (template.sourceType === 'history') {
            try {
                // Генерация уникального кода
                let newCode = template.code;
                let counter = 1;
                while (tasks.some(t => t.code === newCode)) {
                    newCode = `${template.code}_${counter}`;
                    counter++;
                }

                await projectTemplateService.addCustomTask(selectedTemplate.id, {
                    code: newCode,
                    name: template.name,
                    stage: template.suggestedStage || 'Инициализация',
                    responsibleRole: template.suggestedRole || 'МП',
                    duration: template.suggestedDuration || 1,
                    taskType: 'UserTask',
                    order: tasks.length,
                    dependsOn: []
                });

                await loadTemplates(selectedTemplate.id);
                // setShowAddTaskModal(false); // Оставляем открытым для добавления других?
                // Обычно лучше закрыть или показать успех.
                // Пользователь сказал "не добавляет выбранную", значит он ждет добавления.
                // Закроем модал для подтверждения действия.
                setShowAddTaskModal(false);
            } catch (error: any) {
                console.error('Error auto-adding task:', error);
                alert('Не удалось добавить задачу: ' + (error.message || 'Unknown error'));
            }
            return;
        }

        // Для новых шаблонов открываем форму настройки
        setCustomTask({
            code: template.code + '-1', // Default suffix
            name: template.name,
            stage: 'Инициализация',
            responsibleRole: 'МП',
            duration: 1,
            taskType: 'UserTask',
            taskTemplateId: template.id
        });

        // Загружаем детали шаблона для отображения полей
        try {
            const detail = await taskTemplateService.getById(template.id);
            setActiveTemplateDetail(detail);
        } catch (e) {
            console.error("Failed to load template details", e);
            setActiveTemplateDetail(null);
        }

        setIsCustomTaskMode(true);
    };

    const handleAddCustomTask = async () => {
        if (!selectedTemplate) return;
        if (!customTask.code || !customTask.name) {
            alert('Код задачи и название обязательны');
            return;
        }

        // Basic code validation
        if (!/^[A-Z0-9-_]+$/.test(customTask.code)) {
            alert('Код задачи может содержать только заглавные латинские буквы, цифры, "-" и "_"');
            return;
        }

        try {
            await projectTemplateService.addCustomTask(selectedTemplate.id, {
                ...customTask,
                projectTemplateId: selectedTemplate.id,
                dependsOn: [],
                order: tasks.length
            });
            await loadTemplates(selectedTemplate.id);
            setShowAddTaskModal(false);

            // Reset state
            setCustomTask({
                code: '',
                name: '',
                stage: 'Инициализация',
                responsibleRole: 'МП',
                duration: 1,
                taskType: 'UserTask'
            });
            setIsCustomTaskMode(false);
        } catch (error: any) {
            console.error('Error adding custom task:', error);
            alert(error.message || 'Ошибка при добавлении кастомной задачи');
        }
    };

    const handleDeleteTask = async (task: TemplateTask) => {
        if (!selectedTemplate) return;

        if (!window.confirm(`Вы уверены, что хотите удалить задачу "${task.name}"?`)) {
            return;
        }

        try {
            await projectTemplateService.deleteTask(selectedTemplate.id, task.id);
            await loadTemplates(selectedTemplate.id);
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Ошибка при удалении задачи');
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) {
            alert('Введите название шаблона');
            return;
        }

        try {
            const newTemplate = await projectTemplateService.create({
                name: newTemplateName,
                description: newTemplateDescription,
                category: newTemplateCategory,
                isActive: true,
                isDefault: templates.length === 0,
                tasks: []
            });

            setShowNewTemplateModal(false);
            setNewTemplateName('');
            setNewTemplateDescription('');
            setNewTemplateCategory('Открытие магазина');
            await loadTemplates(newTemplate.id);
        } catch (error) {
            console.error('Error creating template:', error);
            alert('Ошибка при создании шаблона');
        }
    };

    const handleCloneTemplate = async () => {
        if (!selectedTemplate) return;

        const name = prompt(`Введите название для копии шаблона "${selectedTemplate.name}":`, selectedTemplate.name + ' (копия)');
        if (!name) return;

        try {
            const clonedTemplate = await projectTemplateService.clone(selectedTemplate.id, name);
            await loadTemplates(clonedTemplate.id);
        } catch (error) {
            console.error('Error cloning template:', error);
            alert('Ошибка при клонировании шаблона');
        }
    };

    const handleSetDefault = async (templateId: number) => {
        try {
            await projectTemplateService.setDefault(templateId);
            await loadTemplates(selectedTemplate?.id);
        } catch (error) {
            console.error('Error setting default template:', error);
            alert('Ошибка при установке шаблона по умолчанию');
        }
    };

    const handleDeleteTemplate = async (templateId: number) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        if (!window.confirm(`Вы уверены, что хотите удалить шаблон "${template.name}"?`)) {
            return;
        }

        try {
            await projectTemplateService.delete(templateId);
            await loadTemplates();
        } catch (error: any) {
            console.error('Error deleting template:', error);
            alert(error.message || 'Ошибка при удалении шаблона');
        }
    };

    const filteredTasks = tasks.filter(task =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.stage?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            'МП': '#3b82f6',
            'МРиЗ': '#10b981',
            'НОР': '#f59e0b',
            'РНР': '#8b5cf6',
        };
        return colors[role] || '#6b7280';
    };

    const getTasksByStage = () => {
        const grouped: Record<string, TemplateTask[]> = {};
        filteredTasks.forEach(task => {
            const stage = task.stage || 'Без этапа';
            if (!grouped[stage]) {
                grouped[stage] = [];
            }
            grouped[stage].push(task);
        });
        return grouped;
    };

    const tasksByStage = getTasksByStage();

    return (
        <div className={`project-management ${isEmbedded ? 'embedded' : ''}`}>
            <div className="pm-header">
                <div className="pm-header-content">
                    <div className="pm-title-section">
                        <h1>Управление шаблонами проектов</h1>
                    </div>

                    <div className="pm-template-controls">
                        {selectedTemplate && templates.length > 1 && (
                            <select
                                className="pm-select"
                                value={selectedTemplate.id}
                                onChange={(e) => handleTemplateChange(Number(e.target.value))}
                            >
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.isDefault && '⭐ '}{template.name}
                                        {!template.isActive && ' (неактивен)'}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            className="pm-btn-primary"
                            onClick={() => setShowNewTemplateModal(true)}
                            title="Создать новый шаблон"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Новый шаблон
                        </button>
                    </div>
                </div>
            </div>

            <div className="pm-content">
                <div className="pm-toolbar">
                    <div className="pm-search">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input
                            type="text"
                            placeholder="Поиск задач..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {selectedTemplate && (
                            <>
                                {!selectedTemplate.isDefault && (
                                    <button
                                        className="pm-btn-secondary"
                                        onClick={() => handleSetDefault(selectedTemplate.id)}
                                        title="Установить как шаблон по умолчанию"
                                    >
                                        ⭐ По умолчанию
                                    </button>
                                )}

                                <button
                                    className="pm-btn-secondary"
                                    onClick={handleCloneTemplate}
                                    title="Создать копию шаблона"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    Копировать
                                </button>

                                {templates.length > 1 && (
                                    <button
                                        className="pm-btn-danger"
                                        onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                                        title="Удалить шаблон"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        Удалить
                                    </button>
                                )}
                            </>
                        )}

                        <button
                            className="pm-btn-primary"
                            onClick={() => setShowAddTaskModal(true)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Добавить задачу
                        </button>
                    </div>
                </div>

                {selectedTemplate && (
                    <div className="pm-stats">
                        <div className="pm-stat-card">
                            <div className="stat-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{tasks.length}</div>
                            </div>
                        </div>

                        <div className="pm-stat-card">
                            <div className="stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 7h16M4 12h16M4 17h16"></path>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{Object.keys(tasksByStage).length}</div>
                            </div>
                        </div>

                        <div className="pm-stat-card">
                            <div className="stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">
                                    {tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.duration, 0) / tasks.length) : 0} дн.
                                </div>
                            </div>
                        </div>

                        <div className="pm-stat-card">
                            <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">
                                    {tasks.filter(t => t.dependsOn && t.dependsOn.length > 0).length}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pm-tasks-container" style={{ display: 'flex', flexDirection: 'column' }}>
                    {loading ? (
                        <div className="pm-loading">Загрузка шаблонов...</div>
                    ) : !selectedTemplate ? (
                        <div className="pm-empty">
                            <p>Нет шаблонов. Создайте новый шаблон.</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="pm-empty">
                            <p>{searchQuery ? 'Задачи не найдены' : 'Нет задач в этом шаблоне'}</p>
                        </div>
                    ) : (
                        <div className="workflow-board">
                            {Object.entries(tasksByStage).map(([stage, stageTasks]) => (
                                <div key={stage} className="stage-column" onDragOver={handleDragOver}>
                                    <div className="stage-header">
                                        <h2 title={stage}>{stage}</h2>
                                        <span className="count-badge">{stageTasks.length}</span>
                                    </div>

                                    <div className="stage-tasks-list">
                                        {stageTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className={`task-board-card ${draggedTask?.id === task.id ? 'dragging' : ''}`}
                                                draggable
                                                onDragStart={() => handleDragStart(task)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => {
                                                    e.stopPropagation();
                                                    handleDrop(task);
                                                }}
                                                onClick={() => handleEditTask(task)}
                                            >
                                                <div className="task-actions-overlay">
                                                    <button
                                                        className="action-btn-mini delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTask(task);
                                                        }}
                                                        title="Удалить задачу"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span className="code-pill">{task.code}</span>
                                                    <span className="role-pill" style={{
                                                        background: `${getRoleColor(task.responsibleRole)}20`,
                                                        color: getRoleColor(task.responsibleRole),
                                                        border: `1px solid ${getRoleColor(task.responsibleRole)}40`
                                                    }}>
                                                        {task.responsibleRole}
                                                    </span>
                                                </div>

                                                <h3 className="task-title">{task.name}</h3>

                                                <div className="task-footer">
                                                    <div className="duration-pill" style={{
                                                        color: task.duration > 5 ? '#d97706' : '#059669',
                                                        background: task.duration > 5 ? '#fffbeb' : '#ecfdf5'
                                                    }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <polyline points="12 6 12 12 16 14"></polyline>
                                                        </svg>
                                                        {task.duration} дн.
                                                    </div>
                                                    {task.dependsOn && task.dependsOn.length > 0 && (
                                                        <div className="deps-indicator" title={`Зависит от: ${task.dependsOn.join(', ')}`}>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                            </svg>
                                                            <span>{task.dependsOn.length}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Task Modal */}
            {showEditModal && editingTask && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modalheader">
                            <h2>Редактирование: {editingTask.name}</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                                <div className="form-group">
                                    <label>Название задачи</label>
                                    <input
                                        type="text"
                                        value={editingTask.name}
                                        onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Длительность (дней)</label>
                                    <input
                                        type="number"
                                        value={editingTask.duration}
                                        onChange={(e) => setEditingTask({ ...editingTask, duration: parseInt(e.target.value) || 0 })}
                                        min="1"
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Код задачи</label>
                                    <input
                                        type="text"
                                        value={editingTask.code}
                                        disabled
                                        className="form-input disabled"
                                    />
                                    <small>Код задачи изменить нельзя</small>
                                </div>

                                <div className="form-group">
                                    <label>Этап</label>
                                    <select
                                        value={editingTask.stage}
                                        onChange={(e) => setEditingTask({ ...editingTask, stage: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="Инициализация">Инициализация</option>
                                        <option value="Проектирование">Проектирование</option>
                                        <option value="Согласование">Согласование</option>
                                        <option value="Закупка">Закупка</option>
                                        <option value="Производство">Производство</option>
                                        <option value="Монтаж">Монтаж</option>
                                        <option value="Приёмка">Приёмка</option>
                                        <option value="Запуск">Запуск</option>
                                        <option value="Завершение">Завершение</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Ответственная роль</label>
                                    <select
                                        value={editingTask.responsibleRole}
                                        onChange={(e) => setEditingTask({ ...editingTask, responsibleRole: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="МП">МП</option>
                                        <option value="МРиЗ">МРиЗ</option>
                                        <option value="НОР">НОР</option>
                                        <option value="РНР">РНР</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Зависимости задачи</label>
                                    <small style={{ display: 'block', marginBottom: '8px' }}>
                                        Задача начнется только после завершения выбранных зависимостей
                                    </small>

                                    <div style={{ marginBottom: '12px' }}>
                                        <select
                                            className="form-input"
                                            onChange={(e) => {
                                                if (e.target.value && !editingTask.dependsOn.includes(e.target.value)) {
                                                    setEditingTask({
                                                        ...editingTask,
                                                        dependsOn: [...editingTask.dependsOn, e.target.value]
                                                    });
                                                    e.target.value = '';
                                                }
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="">+ Добавить зависимость</option>
                                            {tasks
                                                .filter(t =>
                                                    t.code !== editingTask.code &&
                                                    !editingTask.dependsOn.includes(t.code)
                                                )
                                                .map(t => (
                                                    <option key={t.code} value={t.code}>
                                                        {t.code} - {t.name}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>

                                    {editingTask.dependsOn && editingTask.dependsOn.length > 0 ? (
                                        <div className="dependencies-editor">
                                            {editingTask.dependsOn.map((depCode, idx) => {
                                                const depTask = tasks.find(t => t.code === depCode);
                                                return (
                                                    <div key={idx} className="dependency-item">
                                                        <div className="dependency-info">
                                                            <span className="dependency-code">{depCode}</span>
                                                            {depTask && (
                                                                <span className="dependency-name">{depTask.name}</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="dependency-remove"
                                                            onClick={() => {
                                                                setEditingTask({
                                                                    ...editingTask,
                                                                    dependsOn: editingTask.dependsOn.filter((_, i) => i !== idx)
                                                                });
                                                            }}
                                                            title="Удалить зависимость"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '12px',
                                            background: '#f8fafc',
                                            borderRadius: '6px',
                                            color: '#64748b',
                                            fontSize: '13px',
                                            textAlign: 'center'
                                        }}>
                                            Нет зависимостей - задача начнется сразу
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                                Отмена
                            </button>
                            <button className="btn-primary" onClick={handleSaveTask}>
                                Сохранить изменения
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* New Template Modal */}
            {
                showNewTemplateModal && (
                    <div className="modal-overlay" onClick={() => setShowNewTemplateModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Создать новый шаблон проекта</h2>
                                <button className="modal-close" onClick={() => setShowNewTemplateModal(false)}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Название шаблона *</label>
                                    <input
                                        type="text"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        className="form-input"
                                        placeholder="Например: Открытие магазина классический"
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Описание</label>
                                    <textarea
                                        value={newTemplateDescription}
                                        onChange={(e) => setNewTemplateDescription(e.target.value)}
                                        className="form-input"
                                        rows={3}
                                        placeholder="Краткое описание назначения шаблона"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Категория</label>
                                    <select
                                        value={newTemplateCategory}
                                        onChange={(e) => setNewTemplateCategory(e.target.value)}
                                        className="form-input"
                                    >
                                        <option value="Открытие магазина">Открытие магазина</option>
                                        <option value="Реконструкция">Реконструкция</option>
                                        <option value="Редизайн">Редизайн</option>
                                        <option value="Ремонт">Ремонт</option>
                                        <option value="Прочее">Прочее</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setShowNewTemplateModal(false)}>
                                    Отмена
                                </button>
                                <button className="btn-primary" onClick={handleCreateTemplate}>
                                    Создать шаблон
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Task Modal */}
            {
                showAddTaskModal && (
                    <div className="modal-overlay" onClick={() => setShowAddTaskModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Добавить задачу в шаблон</h2>
                                <button className="modal-close" onClick={() => setShowAddTaskModal(false)}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="modal-body">
                                <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
                                    {/* Toggle Mode */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomTaskMode(false)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                border: '1px solid #e2e8f0',
                                                background: !isCustomTaskMode ? '#dbeafe' : 'white',
                                                color: !isCustomTaskMode ? '#1e40af' : '#64748b',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: !isCustomTaskMode ? 600 : 400
                                            }}
                                        >
                                            Выбрать из списка
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomTaskMode(true)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                border: '1px solid #e2e8f0',
                                                background: isCustomTaskMode ? '#dbeafe' : 'white',
                                                color: isCustomTaskMode ? '#1e40af' : '#64748b',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: isCustomTaskMode ? 600 : 400
                                            }}
                                        >
                                            Создать новую
                                        </button>
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', minHeight: 0 }}>
                                    {isCustomTaskMode ? (
                                        <div className="custom-task-form">
                                            {activeTemplateDetail ? (
                                                <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                                    <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '8px', fontSize: '14px' }}>
                                                        Шаблон: {activeTemplateDetail.name}
                                                    </div>
                                                    {activeTemplateDetail.fields && activeTemplateDetail.fields.length > 0 && (
                                                        <div style={{ fontSize: '12px' }}>
                                                            <div style={{ color: '#64748b', marginBottom: '4px' }}>Включает поля:</div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {activeTemplateDetail.fields.map(f => (
                                                                    <span key={f.fieldKey} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        {f.fieldType === 'file_upload' ? '📎' : '📝'} {f.fieldLabel}
                                                                        {f.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Новая задача</h3>
                                            )}
                                            <div className="form-group">
                                                <label>Код задачи (например: TASK-NEW-01) *</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={customTask.code}
                                                    onChange={e => setCustomTask({ ...customTask, code: e.target.value.toUpperCase() })}
                                                    placeholder="TASK-..."
                                                />
                                                <small style={{ color: '#64748b' }}>Только латинские буквы, цифры и знаки - _</small>
                                            </div>
                                            <div className="form-group">
                                                <label>Название задачи *</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={customTask.name}
                                                    onChange={e => setCustomTask({ ...customTask, name: e.target.value })}
                                                    placeholder="Название задачи"
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label>Этап</label>
                                                    <select
                                                        className="form-input"
                                                        value={customTask.stage}
                                                        onChange={e => setCustomTask({ ...customTask, stage: e.target.value })}
                                                    >
                                                        <option value="Инициализация">Инициализация</option>
                                                        <option value="Проектирование">Проектирование</option>
                                                        <option value="Согласование">Согласование</option>
                                                        <option value="Закупка">Закупка</option>
                                                        <option value="Производство">Производство</option>
                                                        <option value="Монтаж">Монтаж</option>
                                                        <option value="Приёмка">Приёмка</option>
                                                        <option value="Запуск">Запуск</option>
                                                        <option value="Завершение">Завершение</option>
                                                    </select>
                                                </div>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label>Роль</label>
                                                    <select
                                                        className="form-input"
                                                        value={customTask.responsibleRole}
                                                        onChange={e => setCustomTask({ ...customTask, responsibleRole: e.target.value })}
                                                    >
                                                        <option value="МП">МП</option>
                                                        <option value="МРиЗ">МРиЗ</option>
                                                        <option value="НОР">НОР</option>
                                                        <option value="РНР">РНР</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Длительность (дней)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={customTask.duration}
                                                    min="1"
                                                    onChange={e => setCustomTask({ ...customTask, duration: parseInt(e.target.value) || 1 })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{ marginBottom: '16px', color: '#64748b' }}>
                                                Выберите задачу из существующих определений задач:
                                            </p>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {availableTasks.map(template => (
                                                    <div
                                                        key={template.id}
                                                        style={{
                                                            padding: '12px',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            marginBottom: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        className="task-definition-item"
                                                        onClick={() => handleSelectTemplate(template)}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{template.name}</h4>
                                                                    {template.sourceType === 'template' && (
                                                                        <span title="Новый шаблон" style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>NEW</span>
                                                                    )}
                                                                </div>
                                                                <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{template.code}</span>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    background: '#f1f5f9',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    color: '#64748b',
                                                                    display: 'inline-block',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    {template.category}
                                                                </span>
                                                                {template.suggestedDuration && (
                                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                                        {template.suggestedDuration} дн.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {availableTasks.length === 0 && (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                                                        Нет доступных шаблонов задач.
                                                        <br />
                                                        <a href="/admin/task-templates" style={{ color: '#3b82f6', fontSize: '12px' }}>Создать шаблоны</a>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button className="btn-secondary" onClick={() => setShowAddTaskModal(false)}>
                                        Отмена
                                    </button>
                                    {isCustomTaskMode && (
                                        <button className="btn-primary" onClick={handleAddCustomTask}>
                                            Добавить задачу
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TemplateManagement;
