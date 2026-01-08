import React, { useState, useEffect } from 'react';
import { ProjectTask, ProjectDocument, Project, UserActivity, TaskComment } from '../types';
import { tasksService } from '../services/tasks';
import { commentsService } from '../services/comments';
import './ImprovedTaskModal.css';

interface ImprovedTaskModalProps {
    task: ProjectTask | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: ProjectTask) => Promise<void>;
    onUpdateStatus: (taskId: number, status: string) => Promise<void>;
    onComplete: (task?: ProjectTask) => Promise<void>;
    workflowConfig: any[];
    projectDocs: ProjectDocument[];
    onDocumentUpload: (file: File, docType: string) => Promise<void>;
    onDocumentDelete: (doc: ProjectDocument) => Promise<void>;
    canTakeTask: boolean;
    hasEditPermission: boolean;
    project: Project | null;
    isAdmin?: boolean;
}

const REQUIRED_DOCS_MAP: Record<string, { type: string; exts?: string[] }[]> = {
    'TASK-PREP-AUDIT': [{ type: 'Технический план' }],
    'TASK-CONTOUR': [
        { type: 'Фотографии объекта' },
        { type: 'Обмерный план', exts: ['.dwg'] },
        { type: 'Предварительный контур', exts: ['.dwg'] }
    ],
    'TASK-VISUALIZATION': [
        { type: 'Концепт визуализации' },
        { type: 'Выписка ЕГРН' },
        { type: 'Визуализация внешнего вида магазина' }
    ],
    'TASK-LOGISTICS': [
        { type: 'Схема подъездных путей' },
        { type: 'Оценка логистики и подъездных путей', exts: ['.pdf'] },
        { type: 'Оценка возможности НБКП', exts: ['.pdf'] }
    ],
    'TASK-LAYOUT': [
        { type: 'Технологическая планировка (DWG)', exts: ['.dwg'] },
        { type: 'Технологическая планировка (PDF)', exts: ['.pdf'] }
    ],
    'TASK-BUDGET-EQUIP': [
        { type: 'Расчет затрат на оборудование', exts: ['.xls', '.xlsx'] }
    ],
    'TASK-BUDGET-SECURITY': [
        { type: 'Анкета СБ' },
        { type: 'Расчет затрат на оборудование СБ', exts: ['.xls', '.xlsx'] }
    ],
    'TASK-BUDGET-RSR': [
        { type: 'Распределительная ведомость' },
        { type: 'Расчет бюджета РСР', exts: ['.xls', '.xlsx'] }
    ]
};

type TabType = 'basic' | 'documents' | 'history' | 'comments';

export const ImprovedTaskModal: React.FC<ImprovedTaskModalProps> = ({
    task,
    isOpen,
    onClose,
    onSave,
    onUpdateStatus,
    onComplete,
    workflowConfig,
    projectDocs,
    onDocumentUpload,
    onDocumentDelete,
    canTakeTask,
    hasEditPermission,
    isAdmin = false
    // project 
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('basic');
    const [editedTask, setEditedTask] = useState<ProjectTask | null>(task);
    const [isSaving, setIsSaving] = useState(false);

    // History state
    const [history, setHistory] = useState<UserActivity[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Comments state
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);

    const handleSendComment = async () => {
        if (!editedTask || !newComment.trim()) return;
        setIsSendingComment(true);
        try {
            const added = await commentsService.createComment(editedTask.id, newComment);
            setComments([added, ...comments]);
            setNewComment('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsSendingComment(false);
        }
    };

    useEffect(() => {
        if (task?.id) {
            // Load history
            setIsLoadingHistory(true);
            tasksService.getTaskHistory(task.id)
                .then(setHistory)
                .catch(err => console.error("Failed to load history", err))
                .finally(() => setIsLoadingHistory(false));

            // Load comments
            setIsLoadingComments(true);
            commentsService.getTaskComments(task.id)
                .then(setComments)
                .catch(err => console.error("Failed to load comments", err))
                .finally(() => setIsLoadingComments(false));
        }
    }, [task?.id]);

    React.useEffect(() => {
        if (task) {
            setEditedTask({ ...task });
        }
    }, [task]);

    if (!isOpen || !editedTask) return null;

    // Calculate task metadata
    const getTaskCode = () => editedTask.code || 'CUSTOM';
    const getTaskProgress = () => {
        if (editedTask.status === 'Завершена') return 100;
        if (editedTask.status === 'В работе') return 50;
        if (editedTask.status === 'Назначена') return 0;
        return 0;
    };

    const getDaysUntilDeadline = () => {
        if (!editedTask.normativeDeadline) return null;
        const now = new Date().getTime();
        const deadline = new Date(editedTask.normativeDeadline).getTime();
        const days = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        return days;
    };

    const getPriority = () => {
        const days = getDaysUntilDeadline();
        if (days === null) return 'Средний';
        if (days < 0) return 'Просрочена';
        if (days <= 2) return 'Высокий';
        if (days <= 7) return 'Средний';
        return 'Низкий';
    };



    // Get dependencies
    const getPredecessors = () => {
        const def = workflowConfig.find((d: any) => (d.Code || d.code) === editedTask.code);
        const dependsOn = def ? (def.DependsOn || def.dependsOn) : [];

        if (!def || !dependsOn || dependsOn.length === 0) return [];

        return dependsOn.map((depCode: string) => {
            const depDef = workflowConfig.find((d: any) => (d.Code || d.code) === depCode);
            return depDef ? (depDef.Name || depDef.name) : depCode;
        });
    };

    const getSuccessors = () => {
        const nextTasks = workflowConfig.filter((d: any) => {
            const dependsOn = d.DependsOn || d.dependsOn;
            return dependsOn && dependsOn.includes(editedTask.code || '');
        });
        return nextTasks.map((t: any) => t.Name || t.name);
    };

    const formatDateValue = (dateStr?: string | Date) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toISOString().split('T')[0];
        } catch (e) { return ''; }
    };

    const handleDateChange = (dateStr: string) => {
        return dateStr ? new Date(dateStr).toISOString() : undefined;
    };

    const handleSave = async () => {
        if (!editedTask) return;
        setIsSaving(true);
        try {
            await onSave(editedTask);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAction = async (action: 'start' | 'complete' | 'pause') => {
        if (!editedTask) return;
        setIsSaving(true);
        try {
            if (action === 'start') {
                await onUpdateStatus(editedTask.id, 'В работе');
            } else if (action === 'complete') {
                await onComplete(editedTask);
            } else if (action === 'pause') {
                await onUpdateStatus(editedTask.id, 'Назначена');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const taskDocs = projectDocs.filter(d =>
        editedTask.code && d.taskId === editedTask.id
    );

    const daysLeft = getDaysUntilDeadline();
    const priority = getPriority();
    const progress = getTaskProgress();

    return (
        <div className="modal-overlay-improved" onClick={onClose}>
            <div className="modal-container-improved" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header-improved">
                    <div className="header-top">
                        <div className="header-left">
                            <h2 className="task-title">{editedTask.name}</h2>
                            <span className="task-code-badge">{getTaskCode()}</span>
                        </div>
                        <div className="header-right">
                            <div className="status-badge-header" data-status={editedTask.status}>
                                {editedTask.status}
                            </div>
                            <button className="btn-close-improved" onClick={onClose}>×</button>
                        </div>
                    </div>

                    <div className="header-meta">
                        <div className="meta-item">
                            <span className="meta-label">Прогресс:</span>
                            <div className="progress-bar-mini">
                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="meta-value">{progress}%</span>
                        </div>

                        {daysLeft !== null && (
                            <div className={`meta-item ${daysLeft < 0 ? 'overdue' : daysLeft <= 2 ? 'urgent' : ''}`}>
                                <span className="meta-icon">{daysLeft < 0 ? '⚠️' : '⏱️'}</span>
                                <span className="meta-value">
                                    {daysLeft < 0 ? `Просрочено на ${Math.abs(daysLeft)} дн.` : `До срока ${daysLeft} дн.`}
                                </span>
                            </div>
                        )}

                        <div className="meta-item">
                            <span className="meta-label">Приоритет:</span>
                            <span className={`priority-badge priority-${priority.toLowerCase()}`}>
                                {priority}
                            </span>
                        </div>
                    </div>

                    {/* Workflow Timeline */}
                    <div className="workflow-timeline">
                        <div className="timeline-node predecessor">
                            <div className="node-label">Предшественник</div>
                            <div className="node-value">
                                {getPredecessors().length > 0 ? getPredecessors().join(', ') : '—'}
                            </div>
                        </div>

                        <div className="timeline-connector">→</div>

                        <div className="timeline-node current">
                            <div className="node-label">Текущая задача</div>
                            <div className="node-value">{editedTask.name}</div>
                        </div>

                        <div className="timeline-connector">→</div>

                        <div className="timeline-node successor">
                            <div className="node-label">Последователь</div>
                            <div className="node-value">
                                {getSuccessors().length > 0 ? getSuccessors().join(', ') : '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
                        onClick={() => setActiveTab('basic')}
                    >
                        📋 Основное
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                        onClick={() => setActiveTab('documents')}
                    >
                        📎 Документы <span className="tab-badge">{taskDocs.length}</span>
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        📜 История <span className="tab-badge">{history.length}</span>
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('comments')}
                    >
                        💬 Комментарии <span className="tab-badge">{comments.length}</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="modal-body-improved">
                    {activeTab === 'basic' && (
                        <div className="tab-content">
                            <div className="form-grid-two-cols">
                                {/* Left Column */}
                                <div className="form-column">
                                    <div className="field-group">
                                        <label>👤 Ответственный</label>
                                        <input
                                            type="text"
                                            className="modern-input"
                                            value={`${editedTask.responsible || ''} ${editedTask.responsible && ['МП', 'МРиЗ', 'БА'].includes(editedTask.responsible) ? '' : ''}`}
                                            readOnly
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>🎯 Статус</label>
                                        <select
                                            className="modern-input"
                                            value={editedTask.status}
                                            onChange={e => setEditedTask({ ...editedTask, status: e.target.value })}
                                            disabled={!hasEditPermission}
                                        >
                                            <option value="Ожидание">Ожидание</option>
                                            <option value="Назначена">Назначена</option>
                                            <option value="В работе">В работе</option>
                                            <option value="Завершена">Завершена</option>
                                        </select>
                                    </div>

                                    <div className="field-group">
                                        <label>⚡ Приоритет</label>
                                        <input
                                            type="text"
                                            className="modern-input"
                                            value={priority}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="form-column">
                                    <div className="field-group">
                                        <label>📅 Плановая дата начала</label>
                                        <input
                                            type="date"
                                            className="modern-input"
                                            value={formatDateValue(editedTask.plannedStartDate)}
                                            readOnly
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>⏰ Нормативный срок</label>
                                        <input
                                            type="date"
                                            className="modern-input"
                                            value={formatDateValue(editedTask.normativeDeadline)}
                                            readOnly={!isAdmin}
                                            onChange={e => {
                                                const val = handleDateChange(e.target.value);
                                                if (val && isAdmin) setEditedTask({ ...editedTask, normativeDeadline: val });
                                            }}
                                        />
                                        {isAdmin ? (
                                            <div style={{ marginTop: '8px' }}>
                                                <label style={{ fontSize: '12px', color: '#64748b' }}>Длительность (дней):</label>
                                                <input
                                                    type="number"
                                                    className="modern-input"
                                                    style={{ marginTop: '4px' }}
                                                    value={editedTask.days || 0}
                                                    onChange={e => setEditedTask({ ...editedTask, days: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        ) : (
                                            <small className="field-hint">
                                                {editedTask.days ? `${editedTask.days} дн.` : ''}
                                            </small>
                                        )}
                                    </div>

                                    <div className="field-group">
                                        <label>✓ Фактическая дата</label>
                                        <input
                                            type="date"
                                            className="modern-input"
                                            value={formatDateValue(editedTask.actualDate)}
                                            readOnly
                                        />
                                        <small className="field-hint">Автоматически при завершении</small>
                                    </div>
                                </div>
                            </div>

                            {/* Task-specific fields would go here */}
                            {/* Task-specific fields */}
                            <div className="task-specific-fields">
                                {(() => {
                                    const code = editedTask.code || (editedTask as any).Code;
                                    if (!code) return null;

                                    switch (code) {
                                        case 'TASK-PREP-AUDIT':
                                            return (
                                                <>
                                                    <div className="field-group">
                                                        <label>📅 Плановая дата аудита</label>
                                                        <input
                                                            type="date"
                                                            className="modern-input"
                                                            value={formatDateValue(editedTask.plannedAuditDate)}
                                                            onChange={e => setEditedTask({ ...editedTask, plannedAuditDate: handleDateChange(e.target.value) })}
                                                            disabled={!hasEditPermission}
                                                        />
                                                    </div>
                                                    <div className="field-group">
                                                        <label>📂 Ссылка на папку проекта</label>
                                                        <input
                                                            type="text"
                                                            className="modern-input"
                                                            placeholder="https://..."
                                                            value={editedTask.projectFolderLink || ''}
                                                            onChange={e => setEditedTask({ ...editedTask, projectFolderLink: e.target.value })}
                                                            disabled={!hasEditPermission}
                                                        />
                                                    </div>
                                                </>
                                            );
                                        case 'TASK-AUDIT':
                                            return (
                                                <div className="field-group">
                                                    <label>📅 Фактическая дата аудита</label>
                                                    <input
                                                        type="date"
                                                        className="modern-input"
                                                        value={formatDateValue(editedTask.actualAuditDate)}
                                                        onChange={e => setEditedTask({ ...editedTask, actualAuditDate: handleDateChange(e.target.value) })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-WASTE':
                                            return (
                                                <>
                                                    <div className="field-group">
                                                        <label>📄 Ссылка на документы ТБО</label>
                                                        <input
                                                            type="text"
                                                            className="modern-input"
                                                            value={editedTask.tboDocsLink || ''}
                                                            onChange={e => setEditedTask({ ...editedTask, tboDocsLink: e.target.value })}
                                                            disabled={!hasEditPermission}
                                                        />
                                                    </div>
                                                    <div className="field-group">
                                                        <label>📅 Дата согласования ТБО</label>
                                                        <input
                                                            type="date"
                                                            className="modern-input"
                                                            value={editedTask.tboAgreementDate ? new Date(editedTask.tboAgreementDate).toISOString().split('T')[0] : ''}
                                                            onChange={e => setEditedTask({ ...editedTask, tboAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                            disabled={!hasEditPermission}
                                                        />
                                                    </div>
                                                    <div className="field-group">
                                                        <label>📅 Дата внесения в реестр</label>
                                                        <input
                                                            type="date"
                                                            className="modern-input"
                                                            value={editedTask.tboRegistryDate ? new Date(editedTask.tboRegistryDate).toISOString().split('T')[0] : ''}
                                                            onChange={e => setEditedTask({ ...editedTask, tboRegistryDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                            disabled={!hasEditPermission}
                                                        />
                                                    </div>
                                                </>
                                            );
                                        case 'TASK-CONTOUR':
                                            return (
                                                <div className="field-group">
                                                    <label>📅 Дата согласования контура</label>
                                                    <input
                                                        type="date"
                                                        className="modern-input"
                                                        value={editedTask.planningContourAgreementDate ? new Date(editedTask.planningContourAgreementDate).toISOString().split('T')[0] : ''}
                                                        onChange={e => setEditedTask({ ...editedTask, planningContourAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-VISUALIZATION':
                                            return (
                                                <div className="field-group">
                                                    <label>📅 Дата согласования визуализации</label>
                                                    <input
                                                        type="date"
                                                        className="modern-input"
                                                        value={editedTask.visualizationAgreementDate ? new Date(editedTask.visualizationAgreementDate).toISOString().split('T')[0] : ''}
                                                        onChange={e => setEditedTask({ ...editedTask, visualizationAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-LOGISTICS':
                                            return (
                                                <div className="field-group">
                                                    <label>🚛 Возможность НБКП</label>
                                                    <select
                                                        className="modern-input"
                                                        value={editedTask.logisticsNbkpEligibility || ''}
                                                        onChange={e => setEditedTask({ ...editedTask, logisticsNbkpEligibility: e.target.value })}
                                                        disabled={!hasEditPermission}
                                                    >
                                                        <option value="">Не выбрано</option>
                                                        <option value="Да">Да</option>
                                                        <option value="Нет">Нет</option>
                                                        <option value="Требуется согласование">Требуется согласование</option>
                                                    </select>
                                                </div>
                                            );
                                        case 'TASK-LAYOUT':
                                            return (
                                                <div className="field-group">
                                                    <label>📅 Дата согласования планировки</label>
                                                    <input
                                                        type="date"
                                                        className="modern-input"
                                                        value={editedTask.layoutAgreementDate ? new Date(editedTask.layoutAgreementDate).toISOString().split('T')[0] : ''}
                                                        onChange={e => setEditedTask({ ...editedTask, layoutAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-BUDGET-EQUIP':
                                            return (
                                                <div className="field-group">
                                                    <label>💰 Бюджет оборудования (без НДС)</label>
                                                    <input
                                                        type="number"
                                                        className="modern-input"
                                                        value={editedTask.equipmentCostNoVat || ''}
                                                        onChange={e => setEditedTask({ ...editedTask, equipmentCostNoVat: Number(e.target.value) })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-BUDGET-SECURITY':
                                            return (
                                                <div className="field-group">
                                                    <label>💰 Бюджет СБ (без НДС)</label>
                                                    <input
                                                        type="number"
                                                        className="modern-input"
                                                        value={editedTask.securityBudgetNoVat || ''}
                                                        onChange={e => setEditedTask({ ...editedTask, securityBudgetNoVat: Number(e.target.value) })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-BUDGET-RSR':
                                            return (
                                                <div className="field-group">
                                                    <label>💰 Бюджет РСР (без НДС)</label>
                                                    <input
                                                        type="number"
                                                        className="modern-input"
                                                        value={editedTask.rsrBudgetNoVat || ''}
                                                        onChange={e => setEditedTask({ ...editedTask, rsrBudgetNoVat: Number(e.target.value) })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-BUDGET-PIS':
                                            return (
                                                <div className="field-group">
                                                    <label>💰 Бюджет ПиС (без НДС)</label>
                                                    <input
                                                        type="number"
                                                        className="modern-input"
                                                        value={editedTask.pisBudgetNoVat || ''}
                                                        onChange={e => setEditedTask({ ...editedTask, pisBudgetNoVat: Number(e.target.value) })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        case 'TASK-TOTAL-BUDGET':
                                            return (
                                                <div className="field-group">
                                                    <label>💰 Общий бюджет (без НДС)</label>
                                                    <input
                                                        type="number"
                                                        className="modern-input"
                                                        value={editedTask.totalBudgetNoVat || ''}
                                                        onChange={e => setEditedTask({ ...editedTask, totalBudgetNoVat: Number(e.target.value) })}
                                                        disabled={!hasEditPermission}
                                                    />
                                                </div>
                                            );
                                        default:
                                            return null;
                                    }
                                })()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="tab-content">
                            <div className="documents-section">
                                <h3>📂 Обязательные документы</h3>
                                {(() => {
                                    const code = editedTask.code || (editedTask as any).Code;
                                    const requirements = REQUIRED_DOCS_MAP[code] || [];

                                    if (requirements.length === 0) {
                                        return <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Для этой задачи нет списков обязательных документов.</p>;
                                    }

                                    return (
                                        <div className="required-docs-list">
                                            {requirements.map((req, idx) => {
                                                const uploaded = projectDocs.find(d => {
                                                    if (d.type !== req.type) return false;
                                                    if (!req.exts || req.exts.length === 0) return true;
                                                    const ext = '.' + d.name.split('.').pop()?.toLowerCase();
                                                    return req.exts.includes(ext);
                                                });

                                                const uniqueId = `file-upload-${idx}-${req.type.replace(/\s+/g, '-')}`;

                                                return (
                                                    <div key={idx} className={`doc-item ${uploaded ? 'uploaded' : 'missing'}`}>
                                                        <div className="doc-info-group">
                                                            <span className="doc-status-icon">{uploaded ? '✅' : '⚠️'}</span>
                                                            <div className="doc-details">
                                                                <div className="doc-type-name">{req.type}</div>
                                                                {req.exts && <div className="doc-exts">Форматы: {req.exts.join(', ')}</div>}
                                                                {uploaded && <div className="doc-uploaded-name">Загружен: {uploaded.name}</div>}
                                                            </div>
                                                        </div>

                                                        <div className="doc-actions">
                                                            {uploaded ? (
                                                                hasEditPermission && (
                                                                    <button
                                                                        onClick={() => onDocumentDelete(uploaded)}
                                                                        className="btn-icon-delete"
                                                                        title="Удалить"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                )
                                                            ) : (
                                                                hasEditPermission && (
                                                                    <>
                                                                        <input
                                                                            id={uniqueId}
                                                                            type="file"
                                                                            style={{ display: 'none' }}
                                                                            accept={req.exts?.join(',')}
                                                                            onChange={(e) => {
                                                                                if (e.target.files?.[0]) {
                                                                                    onDocumentUpload(e.target.files[0], req.type);
                                                                                }
                                                                                e.target.value = '';
                                                                            }}
                                                                        />
                                                                        <label htmlFor={uniqueId} className="btn-upload-small">
                                                                            Загрузить
                                                                        </label>
                                                                    </>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {taskDocs.length > 0 && (
                                    <>
                                        <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#334155' }}>Все файлы задачи</h4>
                                        <ul className="doc-list" style={{ listStyle: 'none', padding: 0 }}>
                                            {taskDocs.map(doc => (
                                                <li key={doc.id} className="doc-item" style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '8px 12px', borderBottom: '1px solid #f1f5f9'
                                                }}>
                                                    <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer" className="doc-download-link">
                                                        {doc.name} <span className="doc-type-hint">({doc.type})</span>
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="tab-content">
                            <div className="history-section">
                                <h3>📜 История изменений</h3>
                                <div className="history-list">
                                    {isLoadingHistory ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Загрузка истории...</div>
                                    ) : history.length === 0 ? (
                                        <div className="empty-state">
                                            <p>История изменений пуста</p>
                                        </div>
                                    ) : (
                                        history.map(activity => (
                                            <div key={activity.id} className="history-item">
                                                <div className="history-meta">
                                                    <span>{new Date(activity.createdAt).toLocaleString()}</span>
                                                    <span>{activity.user?.name || `User #${activity.userId}`}</span>
                                                </div>
                                                <div className="history-action">
                                                    {activity.action}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="tab-content">
                            <div className="comments-section">
                                <h3>💬 Комментарии</h3>
                                <div className="comments-list-container">
                                    {isLoadingComments ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Загрузка комментариев...</div>
                                    ) : comments.length === 0 ? (
                                        <div className="empty-state"><p>Пока нет комментариев</p></div>
                                    ) : (
                                        <div className="comments-list">
                                            {comments.map(c => (
                                                <div key={c.id} className="comment-item">
                                                    <div className="comment-header">
                                                        <span className="comment-author">{c.user?.name || `User #${c.userId}`}</span>
                                                        <span className="comment-date">{new Date(c.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div className="comment-body">{c.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="comment-input-area">
                                    <textarea
                                        className="comment-input"
                                        placeholder="Добавить комментарий..."
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        disabled={isSendingComment}
                                    ></textarea>
                                    <button
                                        className="btn-send-comment"
                                        onClick={handleSendComment}
                                        disabled={!newComment.trim() || isSendingComment}
                                    >
                                        {isSendingComment ? 'Отправка...' : 'Отправить'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer-improved">
                    <div className="footer-left">
                        <button className="btn-cancel" onClick={onClose}>
                            Отмена
                        </button>
                    </div>

                    <div className="footer-center">
                        {editedTask.status === 'Назначена' && canTakeTask && (
                            <button
                                className="btn-action btn-start"
                                onClick={() => handleAction('start')}
                                disabled={isSaving}
                            >
                                ▶ В работу
                            </button>
                        )}

                        {editedTask.status === 'В работе' && (
                            <>
                                <button
                                    className="btn-action btn-pause"
                                    onClick={() => handleAction('pause')}
                                    disabled={isSaving}
                                >
                                    ⏸ Приостановить
                                </button>
                                <button
                                    className="btn-action btn-complete"
                                    onClick={() => handleAction('complete')}
                                    disabled={isSaving}
                                >
                                    ✓ Завершить
                                </button>
                            </>
                        )}

                        {editedTask.status === 'Завершена' && (
                            <button
                                className="btn-action btn-reopen"
                                onClick={() => handleAction('start')}
                                disabled={isSaving}
                            >
                                ↩ Вернуть в работу
                            </button>
                        )}
                    </div>

                    <div className="footer-right">
                        <button
                            className="btn-save"
                            onClick={handleSave}
                            disabled={isSaving || !hasEditPermission}
                        >
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
