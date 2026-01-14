import { useAuth } from '../context/AuthContext'; import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ProjectTask, ProjectDocument } from '../types';
import { tasksService } from '../services/tasks';

import { documentsService } from '../services/documents';
import { GanttChart } from '../components/GanttChart/GanttChart';
import { ImprovedTaskModal } from '../components/ImprovedTaskModal';

import { useProjectData } from '../hooks/useProjectData';
import { useDeleteProject } from '../hooks/useQueries';


import './ProjectDetails.css';
import { CreateTaskFromTemplateModal } from '../components/CreateTaskFromTemplateModal';
import { TaskTemplate } from '../types/taskTemplate';








const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser, hasPermission } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // State management via Custom Hook
    const {
        project, tasks, loading,
        projectDocs, setProjectDocs, projectTeam,
        refresh: loadProjectTasks,
        isUserResponsible
    } = useProjectData(id, currentUser);

    // Gantt State

    // Gantt State
    const [isGanttExpanded, setIsGanttExpanded] = useState(true);
    const [ganttViewMode, setGanttViewMode] = useState<'day' | 'week' | 'month' | 'quarter'>('day');
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    const handleCreateFromTemplate = (template: TaskTemplate) => {
        const newTask: ProjectTask = {
            id: 0,
            projectId: project!.id,
            name: template.name,
            taskType: 'UserTask',
            status: 'Назначена',
            normativeDeadline: new Date(Date.now() + 86400000 * 2).toISOString(), // +2 days
            code: template.code + '-' + Date.now().toString().slice(-4),
            taskTemplateId: template.id,
            taskTemplate: template,
            responsible: 'МР',
            customFieldsValues: '{}'
        };
        setSelectedTask(newTask);
        setShowTemplateModal(false);
        setShowEditTaskModal(true);
    };

    const ganttTasks = useMemo(() => {
        // Sort tasks by Order if available, otherwise by ID
        const sortedTasks = [...tasks].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
            const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
            return orderA - orderB || a.id - b.id;
        });

        return sortedTasks.map(t => {
            let deps: string[] = [];

            // 1. Try to get from task itself (backend source)
            if (t.dependsOn) {
                if (Array.isArray(t.dependsOn)) {
                    deps = t.dependsOn;
                } else if (typeof t.dependsOn === 'string') {
                    try {
                        deps = JSON.parse(t.dependsOn);
                    } catch (e) {
                        console.error("Failed to parse dependsOn JSON", e);
                    }
                }
            }

            // 2. Fallback to config (for old tasks)

            return {
                ...t,
                dependsOn: deps
            };
        });
    }, [tasks]);


    // Modals
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);



    // Handle editTask query parameter (from notifications)
    useEffect(() => {
        const editTaskId = searchParams.get('editTask');
        if (editTaskId && tasks.length > 0 && !showEditTaskModal) {
            const taskId = parseInt(editTaskId);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                console.log('📬 Opening task from notification:', task);
                setSelectedTask(task);
                setShowEditTaskModal(true);
                // Remove the parameter from URL
                searchParams.delete('editTask');
                setSearchParams(searchParams, { replace: true });
            }
        }
    }, [searchParams, tasks, showEditTaskModal, setSearchParams]);


    // --- Actions ---
    const deleteProjectMutation = useDeleteProject();

    const handleDeleteProject = async () => {
        if (!project || !confirm('Вы уверены, что хотите удалить этот проект?')) return;
        try {
            await deleteProjectMutation.mutateAsync(project.id);
            navigate('/projects');
        } catch (e) {
            console.error('Failed to delete project:', e);
            alert('Не удалось удалить проект. Попробуйте еще раз.');
        }
    };


    // Validates task completion rules
    const validateTaskCompletion = (task: ProjectTask): string | null => {
        if (!task.code) return null;

        switch (task.code) {
            case 'TASK-PREP-AUDIT':
                if (!task.plannedAuditDate) return 'Укажите плановую дату аудита';
                if (!task.projectFolderLink) return 'Укажите ссылку на папку проекта';
                break;
            case 'TASK-AUDIT':
                if (!task.actualAuditDate) return 'Укажите фактическую дату аудита';
                break;
            case 'TASK-WASTE':
                if (!task.tboDocsLink) return 'Укажите ссылку на документы ТБО';
                if (!task.tboAgreementDate) return 'Укажите дату согласования ТБО';
                if (!task.tboRegistryDate) return 'Укажите дату внесения в реестр';
                break;
            case 'TASK-CONTOUR':
                if (!task.planningContourAgreementDate) return 'Укажите дату согласования контура';
                break;
            case 'TASK-VISUALIZATION':
                if (!task.visualizationAgreementDate) return 'Укажите дату согласования визуализации';
                break;
            case 'TASK-LOGISTICS':
                if (!task.logisticsNbkpEligibility) return 'Выберите возможность НБКП';
                break;
            case 'TASK-LAYOUT':
                if (!task.layoutAgreementDate) return 'Укажите дату согласования планировки';
                break;
            case 'TASK-BUDGET-EQUIP':
                if (!task.equipmentCostNoVat) return 'Укажите бюджет оборудования';
                break;
            case 'TASK-BUDGET-SECURITY':
                if (!task.securityBudgetNoVat) return 'Укажите бюджет СБ';
                break;
            case 'TASK-BUDGET-RSR':
                if (!task.rsrBudgetNoVat) return 'Укажите бюджет РСР';
                break;
            case 'TASK-BUDGET-PIS':
                if (!task.pisBudgetNoVat) return 'Укажите бюджет ПиС';
                break;
            case 'TASK-TOTAL-BUDGET':
                if (!task.totalBudgetNoVat) return 'Укажите общий бюджет';
                break;
        }
        return null;
    };

    const handleUpdateTask = async (task: ProjectTask) => {
        try {
            await tasksService.updateTask(task);
            setShowEditTaskModal(false);
            loadProjectTasks();
        } catch (e: any) {
            console.error(e);
            alert(`Ошибка: ${e.message}`);
        }
    };

    const handleCompleteTaskFromModal = async (taskInput?: ProjectTask) => {
        const taskToCheck = taskInput || selectedTask;
        if (!taskToCheck) return;

        const error = validateTaskCompletion(taskToCheck);
        if (error) {
            alert(error);
            return;
        }

        const taskToComplete = { ...taskToCheck, status: 'Завершена', completedAt: new Date().toISOString() };
        try {
            // 1. Save fields
            await tasksService.updateTask(taskToComplete);

            // 2. Set status to Complete
            await tasksService.updateTaskStatus(taskToComplete.id, 'Завершена');

            setShowEditTaskModal(false);
            loadProjectTasks();
        } catch (e) {
            console.error(e);
            alert('Ошибка завершения задачи');
        }
    };

    // --- UI Helpers ---

    const downloadDoc = (doc: ProjectDocument) => {
        window.open(`/api/documents/download/${doc.id}`, '_blank');
    };

    const deleteDoc = async (doc: ProjectDocument) => {
        if (!confirm(`Удалить документ "${doc.name}"?`)) return;
        try {
            await documentsService.delete(doc.id);
            setProjectDocs(prev => prev.filter(d => d.id !== doc.id));
        } catch (e) {
            console.error('Failed to delete document:', e);
            alert('Не удалось удалить документ');
        }
    };






    const getTaskDeviation = (task: ProjectTask) => {
        if (!task.actualDate || !task.normativeDeadline) return undefined;
        const actual = new Date(task.actualDate).setHours(0, 0, 0, 0);
        const plan = new Date(task.normativeDeadline).setHours(0, 0, 0, 0);
        if (actual === plan) return undefined;
        const diff = (actual - plan) / (1000 * 60 * 60 * 24);
        if (diff === 0) return undefined;
        return { days: Math.abs(diff), type: diff > 0 ? 'late' : 'early' };
    };





    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Создан': return '#42A5F5';
            case 'Аудит': return '#FFB700';
            case 'Бюджет сформирован': return '#66BB6A';
            case 'Утвержден ИК': return '#7E57C2';
            case 'Подписан договор': return '#26A69A';
            case 'РСР': return '#FFA726';
            case 'Открыт': return '#4CAF50';
            case 'Слетел': return '#EF5350';
            default: return '#ccc';
        }
    };

    if (loading) return <div className="page-container" style={{ padding: 40, textAlign: 'center' }}>Загрузка...</div>;
    if (!project) return <div className="page-container">Проект не найден</div>;

    return (
        <div className="page-container project-details-page">
            {/* Header matching Angular */}
            <header className="page-header">
                <div className="header-main-row">
                    <button className="btn-back" onClick={() => navigate(-1)}>← Назад</button>
                    <h1>{project.store?.name || `Проект ${project.projectType}`}</h1>

                    <div className="header-info-inline">
                        <div className="info-item-inline">
                            <label>КОД ГИС</label>
                            <span className="value highlight">{project.gisCode}</span>
                        </div>
                        <div className="info-item-inline">
                            <label>РЕГИОН</label>
                            <span className="value">{project.region || project.store?.region || '-'}</span>
                        </div>
                        <div className="info-item-inline">
                            <label>ОТВЕТСТВЕННЫЙ</label>
                            <span className="value">{project.mp || '-'}</span>
                        </div>
                        <div className="info-item-inline">
                            <label>АДРЕС</label>
                            <span className="value">{project.address || project.store?.address || '-'}</span>
                        </div>
                        <div className="info-item-inline">
                            <label>ПЛОЩАДЬ</label>
                            <span className="value highlight">{project.totalArea || project.store?.totalArea || '-'} м²</span>
                        </div>
                    </div>

                    <div className="status-wrapper">
                        <div className={`status-current ${project.status === 'Аудит' ? 'yellow-status' : ''}`}
                            style={{ background: getStatusColor(project.status) }}>
                            {project.status}
                        </div>
                    </div>

                    {hasPermission('project:delete') && (
                        <button className="btn-delete-project" title="Удалить проект" onClick={handleDeleteProject}>🗑️</button>
                    )}
                </div>
            </header>

            <div className="project-content-grid">
                {/* Left Sidebar */}
                <div className="sidebar-column">
                    <div className="info-card">
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#475569' }}>
                            <span style={{ fontSize: 20 }}>👥</span> Команда проекта
                        </h3>
                        <div className="responsible-list-unified">
                            {projectTeam.map((member, idx) => (
                                <div key={idx} className="team-card-row">
                                    <div className="avatar-small" style={{ backgroundColor: member.color }}>{member.initials}</div>
                                    <div className="team-info-col">
                                        <div className="team-name">{member.name}</div>
                                        <div className="team-meta-row">
                                            <span className="team-role-badge">{member.role}</span>
                                            <span className="team-phone">{member.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {projectTeam.length === 0 && <div className="empty-state">Нет участников</div>}
                        </div>
                    </div>

                    <div className="info-card">
                        <div className="card-header-flex" style={{ marginBottom: 16, alignItems: 'center' }}>
                            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#475569' }}>
                                <span style={{ fontSize: 20 }}>📂</span> Документы
                            </h3>
                            {hasPermission('project:edit') && (
                                <label className="add-doc-label" title="Добавить документ">
                                    + <input type="file" multiple style={{ display: 'none' }} onChange={(e) => {
                                        if (e.target.files) {
                                            Array.from(e.target.files).forEach(f => {
                                                setProjectDocs(p => [...p, {
                                                    id: Date.now() + Math.random(),
                                                    name: f.name,
                                                    type: 'Файл',
                                                    size: f.size,
                                                    url: '#',
                                                    uploadDate: new Date().toISOString()
                                                }]);
                                            });
                                        }
                                    }} />
                                </label>
                            )}
                        </div>
                        <div className="docs-list-unified">
                            {projectDocs.map((doc) => (
                                <div key={doc.id} className="doc-card-row">
                                    <div className={`doc-icon-wrapper ${doc.name.endsWith('.xls') || doc.name.endsWith('.xlsx') ? 'xls' : 'pdf'}`}>
                                        {doc.name.endsWith('.pdf') ? '📄' : doc.name.endsWith('.xls') || doc.name.endsWith('.xlsx') ? '📊' : '📁'}
                                    </div>
                                    <div className="doc-info-col">
                                        <div className="doc-name-text" onClick={() => downloadDoc(doc)} title={doc.name}>{doc.name}</div>
                                        <div className="doc-meta-text">{new Date(doc.uploadDate).toLocaleDateString()} • {(doc.size / 1024).toFixed(0)} KB</div>
                                    </div>
                                    {hasPermission('project:edit') && (
                                        <button className="btn-delete-doc-mini" onClick={() => deleteDoc(doc)} title="Удалить">×</button>
                                    )}
                                </div>
                            ))}
                            {projectDocs.length === 0 && <div className="empty-state">Нет документов</div>}
                        </div>
                    </div>
                </div>

                {/* Main Content Area (Gantt + Tasks) */}

                <div className="main-content-area">
                    {/* Gantt Chart Section - Full Width */}
                    <div className="info-card gantt-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="card-header-flex" style={{ padding: '8px 16px', borderBottom: isGanttExpanded ? '1px solid #e2e8f0' : 'none', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <h3 className="section-title" style={{ margin: 0, whiteSpace: 'nowrap' }}>📊 График выполнения проекта</h3>
                                <div className="ganttViewSwitcher" style={{ background: '#f1f5f9', padding: '3px', borderRadius: 8, display: 'flex' }}>
                                    {(['day', 'week', 'month', 'quarter'] as const).map(m => (
                                        <button
                                            key={m}
                                            className={`viewButton ${ganttViewMode === m ? 'active' : ''}`}
                                            onClick={() => setGanttViewMode(m)}
                                            style={{ padding: '4px 10px', fontSize: 13, border: 'none', background: ganttViewMode === m ? '#fff' : 'transparent', borderRadius: 6, cursor: 'pointer', color: ganttViewMode === m ? '#0f172a' : '#64748b', boxShadow: ganttViewMode === m ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', fontWeight: 500 }}
                                        >
                                            {m === 'day' ? 'День' : m === 'week' ? 'Неделя' : m === 'month' ? 'Месяц' : 'Квартал'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button className="btn-toggle-gantt" onClick={() => setIsGanttExpanded(!isGanttExpanded)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>
                                {isGanttExpanded ? '▲' : '▼'}
                            </button>
                        </div>

                        {isGanttExpanded && (
                            <GanttChart
                                tasks={ganttTasks}
                                projectCreatedAt={project?.createdAt}
                                viewMode={ganttViewMode}
                                onTaskClick={(t) => {
                                    const original = tasks.find(pt => pt.id === t.id);
                                    if (original) {
                                        setSelectedTask(original);
                                        setShowEditTaskModal(true);
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Tasks List Section */}
                    <div className="info-card tasks-card">
                        <div className="card-header-flex">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <h3 className="section-title" style={{ margin: 0 }}>✅ ЗАДАЧИ ПРОЕКТА</h3>
                            </div>
                            <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {hasPermission('task:edit') && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => setShowTemplateModal(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: '6px 12px' }}
                                    >
                                        <span>+</span> Из шаблона
                                    </button>
                                )}
                                <div className="tasks-count-badge">{ganttTasks.length}</div>
                            </div>
                        </div>

                        <div className="tasks-table-wrapper">
                            <div className="tasks-table-header">
                                <div className="col-task-name">Задача</div>
                                <div className="col-responsible">Ответственный</div>
                                <div className="col-deadline">Плановый срок</div>
                                <div className="col-deadline">Фактический срок</div>
                                <div className="col-deviation">Отклонение</div>
                                <div className="col-status">Статус</div>
                            </div>
                            <div className="tasks-table-body">
                                {ganttTasks.map(task => (
                                    <div key={task.id} className={`task-row ${task.status === 'Завершена' ? 'row-completed' : ''} ${task.status === 'Ожидание' ? 'row-pending' : ''} row-clickable`}
                                        style={{ opacity: task.status === 'Ожидание' ? 0.6 : 1 }}
                                        onClick={() => { setSelectedTask({ ...task }); setShowEditTaskModal(true); }}>
                                        <div className="col-task-name">
                                            <div className="task-name-wrapper">
                                                <span className="task-name-text">{task.name}</span>
                                                {(hasPermission('task:edit') || (hasPermission('task:edit_own') && isUserResponsible(task))) && (
                                                    <button className="btn-edit-icon" title="Редактировать">✎</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-responsible">
                                            <div className="resp-avatar-mini" style={{ background: task.responsible ? '#e2e8f0' : '#f1f5f9' }}>
                                                {task.responsible ? task.responsible.charAt(0) : '?'}
                                            </div>
                                            <span>{task.responsible}</span>
                                        </div>
                                        <div className="col-deadline">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 16 }}>📅</span>
                                                <span>{new Date(task.normativeDeadline).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="col-deadline">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {task.actualDate ? <span style={{ fontSize: 16 }}>✅</span> : null}
                                                <span className={!task.actualDate ? 'text-muted' : ''}>
                                                    {task.actualDate ? new Date(task.actualDate).toLocaleDateString() : '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-deviation">
                                            {getTaskDeviation(task) ? (
                                                <span className={`deviation-badge ${getTaskDeviation(task)?.type === 'early' ? 'early' : 'late'}`}
                                                    style={{
                                                        display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                                        background: getTaskDeviation(task)?.type === 'early' ? '#d1fae5' : '#fee2e2',
                                                        color: getTaskDeviation(task)?.type === 'early' ? '#065f46' : '#991b1b'
                                                    }}>
                                                    {getTaskDeviation(task)?.type === 'early' ? '✓' : '⚠'} {getTaskDeviation(task)?.days} дн.
                                                </span>
                                            ) : <span className="text-muted">—</span>}
                                        </div>
                                        <div className="col-status">
                                            <span className="status-badge" style={{
                                                background: task.status === 'В работе' ? '#E3F2FD' : task.status === 'Завершена' ? '#E8F5E9' : '#eef1f6',
                                                color: task.status === 'В работе' ? '#1976D2' : task.status === 'Завершена' ? '#388E3C' : '#555'
                                            }}>
                                                {task.status}
                                            </span>
                                        </div>


                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- Modals --- */}



            {/* Edit Task Modal - IMPROVED VERSION */}
            <ImprovedTaskModal
                task={selectedTask}
                isOpen={showEditTaskModal}
                onClose={() => setShowEditTaskModal(false)}
                onSave={handleUpdateTask}
                onUpdateStatus={async (taskId: number, status: string) => {
                    await tasksService.updateTaskStatus(taskId, status);
                    loadProjectTasks();
                    setShowEditTaskModal(false);
                }}
                onComplete={handleCompleteTaskFromModal}
                allTasks={tasks}
                projectDocs={projectDocs}
                project={project}
                onDocumentUpload={async (file: File, docType: string) => {
                    if (!project) return;
                    const uploaded = await documentsService.upload(file, project.id, docType, selectedTask?.id);
                    setProjectDocs(prev => [...prev, uploaded]);
                }}
                onDocumentDelete={deleteDoc}
                canTakeTask={selectedTask ? isUserResponsible(selectedTask) : false}
                hasEditPermission={hasPermission('task:edit') || (selectedTask ? isUserResponsible(selectedTask) && hasPermission('task:edit_own') : false)}
                isAdmin={currentUser?.role === 'admin'}
            />




            {/* Template Selection Modal */}
            <CreateTaskFromTemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onSelectTemplate={handleCreateFromTemplate}
            />
        </div>
    );
};

export default ProjectDetails;
