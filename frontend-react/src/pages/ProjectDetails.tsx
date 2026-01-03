import { useAuth } from '../context/AuthContext'; import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Project, ProjectTask, ProjectDocument } from '../types';
import { projectsService } from '../services/projects';
import { tasksService } from '../services/tasks';
import { workflowService } from '../services/workflow';
import { documentsService } from '../services/documents';
import { GanttChart } from '../components/GanttChart/GanttChart';
import { useWebSocket } from '../hooks/useWebSocket';


import './ProjectDetails.css';

interface TeamMember {
    name: string;
    role: string;
    phone: string;
    initials: string;
    color: string;
}




const DocIcon = () => (
    <svg className="svg-icon" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
);
const UserIcon = () => (
    <svg className="svg-icon" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

const CalendarIcon = () => (
    <svg className="svg-icon" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser, hasPermission } = useAuth();

    // State
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);

    useWebSocket((msg) => {
        if (msg.type === 'TASK_UPDATED' && id) {
            const updatedTask = msg.payload;
            if (updatedTask.projectId === Number(id)) {
                setTasks(prev => {
                    const exists = prev.find(t => t.id === updatedTask.id);
                    if (exists) {
                        return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
                    }
                    return prev;
                });
            }
        }
    });

    const [loading, setLoading] = useState(true);
    const [workflowConfig, setWorkflowConfig] = useState<any[]>([]);

    // Gantt State
    const [isGanttExpanded, setIsGanttExpanded] = useState(true);
    const [ganttViewMode, setGanttViewMode] = useState<'day' | 'week' | 'month' | 'quarter'>('day');
    const ganttTasks = useMemo(() => tasks.map(t => {
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
        if (deps.length === 0 && workflowConfig.length > 0) {
            const def = workflowConfig.find((d: any) => (d.Code || d.code) === t.code);
            if (def) {
                deps = def.DependsOn || def.dependsOn || [];
            }
        }

        return {
            ...t,
            dependsOn: deps
        };
    }), [tasks, workflowConfig]);


    // Modals
    const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [showGanttTaskInfoModal, setShowGanttTaskInfoModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
    const [ganttSelectedTask, setGanttSelectedTask] = useState<ProjectTask | null>(null);

    // Sidebar Data
    const [projectTeam, setProjectTeam] = useState<TeamMember[]>([]);
    const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([]);

    // New Task Form
    const [newTask, setNewTask] = useState<Partial<ProjectTask>>({
        name: '',
        responsible: 'МП',
        status: 'Назначена',
        taskType: 'UserTask'
    });


    const loadProjectTasks = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Load project, tasks AND workflow schema in parallel
            const [proj, projTasks, schema] = await Promise.all([
                projectsService.getProjectById(Number(id)),
                tasksService.getTasksByProjectId(Number(id)),
                workflowService.getWorkflowSchema()
            ]);

            setWorkflowConfig(schema);

            if (proj) setProject(proj);
            if (projTasks) {
                // Sort tasks by defined process order
                const sorted = projTasks.sort((a, b) => {
                    const indexA = schema.findIndex((def: any) => def.code === a.code);
                    const indexB = schema.findIndex((def: any) => def.code === b.code);

                    // If both are standard tasks, sort by index
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;

                    // Put standard tasks before custom ones
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;

                    // Sort remaining by ID
                    return a.id - b.id;
                });

                setTasks(sorted);
                calculateProjectTeam(projTasks);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to load project data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjectTasks();
        loadProjectDocs();
    }, [id]);

    const loadProjectDocs = async () => {
        if (!id) return;
        try {
            const docs = await documentsService.getByProject(Number(id));
            setProjectDocs(docs);
        } catch (e) {
            console.error('Failed to load documents:', e);
        }
    };




    // --- Team Logic ---
    const calculateProjectTeam = (currentTasks: ProjectTask[]) => {
        const teamMap = new Map<string, TeamMember>();
        // Quick helpers
        const getPhone = (name: string) => {
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            const rand = Math.abs(hash);
            return `+7 (9${rand % 9 + 1}) ${(Math.abs(hash * 13) % 900) + 100}-${(Math.abs(hash * 7) % 90) + 10}-${(Math.abs(hash * 23) % 90) + 10}`;
        };
        const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];
        const getColor = (name: string) => {
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
        };

        const createMember = (name: string, role: string): TeamMember => ({
            name, role, phone: getPhone(name), initials: getInitials(name), color: getColor(name)
        });

        currentTasks.forEach(task => {
            if (task.responsible && task.responsible.includes(' ')) {
                // Assuming "Name Role" or just Name
                let role = 'Исполнитель';
                // Simple mapping based on known names
                if (task.responsible.includes('Петров')) role = 'МП';
                if (task.responsible.includes('Сидорова')) role = 'МРиЗ';
                if (task.responsible.includes('Смирнов')) role = 'БА';
                teamMap.set(task.responsible, createMember(task.responsible, role));
            } else if (['МП', 'МРиЗ', 'БА'].includes(task.responsible)) {
                const roleToUser: any = {
                    'МП': { name: 'Иван Петров', role: 'МП' },
                    'МРиЗ': { name: 'Мария Сидорова', role: 'МРиЗ' },
                    'БА': { name: 'Алексей Смирнов', role: 'БА' }
                };
                if (roleToUser[task.responsible]) {
                    const u = roleToUser[task.responsible];
                    teamMap.set(u.name, createMember(u.name, u.role));
                }
            }
        });
        setProjectTeam(Array.from(teamMap.values()));
    };

    // --- Helpers ---
    const canUserTakeTask = (task: ProjectTask) => {
        if (!currentUser) return false;
        if (task.status !== 'Назначена') return false;

        // 1. Strict Role Match
        if (task.responsible === currentUser.role) return true;

        // 2. Name Match
        if (task.responsible === currentUser.name) return true;

        // 3. Mapping Match (Legacy/Manual Names)
        if (currentUser.role === 'МП' && task.responsible.includes('Петров')) return true;
        if (currentUser.role === 'МРиЗ' && task.responsible.includes('Сидорова')) return true;
        if (currentUser.role === 'БА' && task.responsible.includes('Смирнов')) return true;

        return false;
    };

    // --- Actions ---
    const handleDeleteProject = async () => {
        if (!project || !confirm('Вы уверены, что хотите удалить этот проект?')) return;
        try {
            await projectsService.deleteProject(project.id);
            navigate('/projects');
        } catch (e) {
            console.error('Failed to delete project:', e);
            alert('Не удалось удалить проект. Попробуйте еще раз.');
        }
    };

    const handleCreateTask = async () => {
        if (!newTask.name || !id) return;
        const t: ProjectTask = {
            id: 0, // generated by service
            projectId: Number(id),
            name: newTask.name || '',
            status: 'Назначена',
            taskType: newTask.taskType || 'UserTask',
            responsible: newTask.responsible || 'МП',
            normativeDeadline: newTask.normativeDeadline || new Date(Date.now() + 86400000 * 2).toISOString(),
            createdAt: new Date().toISOString()
        };
        const created = await tasksService.createTask(t);
        setTasks(prev => [created, ...prev]);
        setShowCreateTaskModal(false);
        setNewTask({ name: '', responsible: 'МП', status: 'Назначена', taskType: 'UserTask' });
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

    const handleUpdateTask = async () => {
        if (!selectedTask) return;
        try {
            await tasksService.updateTask(selectedTask);
            setShowEditTaskModal(false);
            loadProjectTasks();
        } catch (e: any) {
            console.error(e);
            alert(`Ошибка при обновлении задачи: ${e.message}`);
        }
    };

    const handleCompleteTaskFromModal = async () => {
        if (!selectedTask) return;

        const error = validateTaskCompletion(selectedTask);
        if (error) {
            alert(error);
            return;
        }

        const taskToComplete = { ...selectedTask, status: 'Завершена', completedAt: new Date().toISOString() };
        try {
            // 1. Save fields
            await tasksService.updateTask(taskToComplete);

            // 2. Set status to Complete
            await tasksService.updateTaskStatus(selectedTask.id, 'Завершена');

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

    // Helper component for rendering document upload block
    const DocumentUploadBlock: React.FC<{
        docType: string;
        allowedExtensions?: string[];
        label: string;
    }> = ({ docType, allowedExtensions, label }) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
        const existingDocs = projectDocs.filter(d => d.type === docType);

        const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || !project) return;

            for (const file of Array.from(e.target.files)) {
                // Check extension if required
                if (allowedExtensions && allowedExtensions.length > 0) {
                    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
                    if (!allowedExtensions.includes(fileExt)) {
                        alert(`Файл "${file.name}" имеет неверный формат. Разрешены: ${allowedExtensions.join(', ')}`);
                        continue;
                    }
                }

                try {
                    const uploadedDoc = await documentsService.upload(file, project.id, docType, selectedTask?.id);
                    setProjectDocs(prev => [...prev, uploadedDoc]);
                } catch (error: any) {
                    console.error('Upload failed:', error);
                    alert(`Не удалось загрузить ${file.name}: ${error.message}`);
                }
            }

            e.target.value = '';
        };

        return (
            <div className="field-group full-width" style={{ marginTop: '10px' }}>
                <label>{label} {allowedExtensions && allowedExtensions.length > 0 && <span style={{ color: '#94a3b8', fontSize: '12px' }}>({allowedExtensions.join(', ')})</span>}</label>
                <div className="attachments-list" style={{ marginBottom: '8px' }}>
                    {existingDocs.map(doc => (
                        <div key={doc.id} className="attachment-item">
                            <div className="attachment-info">
                                <span className="file-icon">📄</span>
                                <span className="file-name" onClick={() => downloadDoc(doc)}>{doc.name}</span>
                            </div>
                            <button className="btn-delete-doc" onClick={() => deleteDoc(doc)}>×</button>
                        </div>
                    ))}
                </div>
                <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}
                    style={{ borderStyle: 'dashed', padding: '12px', minHeight: 0, cursor: 'pointer' }}>
                    <span className="upload-text" style={{ color: '#64748b', fontSize: '12px' }}>+ Загрузить файл</span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={allowedExtensions?.join(',')}
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                </div>
            </div>
        );
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
                                        setGanttSelectedTask(original);
                                        setShowGanttTaskInfoModal(true);
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
                            <div className="header-actions">
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
                                                {(hasPermission('task:edit') || (hasPermission('task:edit_own') && canUserTakeTask(task))) && (
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

            {/* Create Task Modal */}
            {showCreateTaskModal && (
                <div className="modal-overlay" onClick={() => setShowCreateTaskModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Новая задача</h2></div>
                        <div className="modal-form-grid" style={{ maxHeight: '60vh' }}>
                            <div className="field-group full-width">
                                <label>Название задачи</label>
                                <input className="modern-input" value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <label>Ответственный</label>
                                <select className="modern-input modern-select" value={newTask.responsible} onChange={e => setNewTask({ ...newTask, responsible: e.target.value })}>
                                    <option value="МП">МП</option>
                                    <option value="МРиЗ">МРиЗ</option>
                                    <option value="БА">БА</option>
                                </select>
                            </div>
                            <div className="field-group">
                                <label>Срок</label>
                                <input type="date" className="modern-input"
                                    value={newTask.normativeDeadline ? new Date(newTask.normativeDeadline).toISOString().split('T')[0] : ''}
                                    onChange={e => setNewTask({ ...newTask, normativeDeadline: new Date(e.target.value).toISOString() })} />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowCreateTaskModal(false)}>Отмена</button>
                            {selectedTask && canUserTakeTask(selectedTask) && (hasPermission('task:edit') || hasPermission('task:edit_own')) && (
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        tasksService.updateTaskStatus(selectedTask.id, "В работе")
                                            .then(() => {
                                                loadProjectTasks();
                                                setShowEditTaskModal(false);
                                            })
                                            .catch((err: any) => alert(err));
                                    }}
                                    style={{ marginRight: 10, background: "#2563eb", display: "flex", alignItems: "center", gap: 6 }}
                                >
                                    <span>▶</span> В работу
                                </button>
                            )}
                            <button className="btn-primary" onClick={handleCreateTask}>Создать</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Task Modal */}
            {showEditTaskModal && selectedTask && (
                <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
                    <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>{selectedTask.name}</h2>
                            <button className="btn-close-modal" onClick={() => setShowEditTaskModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>×</button>
                        </div>

                        <div className="modal-form-grid">
                            {/* Dependency Box */}
                            {selectedTask.code && (
                                <div className="dependency-box">
                                    <div className="dep-item">
                                        <span className="dep-label">Предшественник</span>
                                        <span className="dep-value">
                                            {(() => {
                                                const def = workflowConfig.find((d: any) => d.code === selectedTask.code);
                                                if (!def || !def.dependsOn || def.dependsOn.length === 0) return '—';
                                                return def.dependsOn.map((depCode: string) => {
                                                    const depDef = workflowConfig.find((d: any) => d.code === depCode);
                                                    return depDef ? depDef.name : depCode;
                                                }).join(', ');
                                            })()}
                                        </span>
                                    </div>
                                    <div className="dep-item">
                                        <span className="dep-label">Последователь</span>
                                        <span className="dep-value">
                                            {(() => {
                                                const nextTasks = workflowConfig.filter((d: any) => d.dependsOn && d.dependsOn.includes(selectedTask.code || ''));
                                                if (nextTasks.length === 0) return '—';
                                                return nextTasks.map((t: any) => t.name).join(', ');
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Main Info */}
                            <div className="form-section-title">Основная информация</div>

                            <div className="field-group">
                                <label>Ответственный</label>
                                <input type="text" value={selectedTask.responsible} className="modern-input" readOnly />
                            </div>

                            <div className="field-group">
                                <label>Статус</label>
                                <select className="modern-input modern-select" value={selectedTask.status} onChange={e => setSelectedTask({ ...selectedTask, status: e.target.value })}>
                                    <option value="Назначена">Назначена</option>
                                    <option value="В работе">В работе</option>
                                    <option value="Завершена">Завершена</option>
                                    <option value="Просрочена">Просрочена</option>
                                </select>
                            </div>

                            {/* Custom Fields per Task Type */}
                            {(selectedTask.code === 'TASK-PREP-AUDIT' || selectedTask.name === 'Подготовка к аудиту') && (
                                <>
                                    <div className="field-group full-width">
                                        <label>Этап</label>
                                        <select className="modern-input modern-select" value={selectedTask.stage || ''} onChange={e => setSelectedTask({ ...selectedTask, stage: e.target.value })}>
                                            <option value="">Не выбрано</option>
                                            <option value="Первичный">Первичный</option>
                                            <option value="Повторный">Повторный</option>
                                        </select>
                                    </div>
                                    <div className="field-group">
                                        <label>Плановая дата аудита</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.plannedAuditDate ? new Date(selectedTask.plannedAuditDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, plannedAuditDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>
                                    <div className="field-group full-width">
                                        <label>Ссылка на папку проекта</label>
                                        <input type="text" className="modern-input" placeholder="https://..."
                                            value={selectedTask.projectFolderLink || ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, projectFolderLink: e.target.value })} />
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Технический план" label="Технический план" />
                                </>
                            )}

                            {selectedTask.name === 'Аудит объекта' && (
                                <>
                                    <div className="field-group">
                                        <label>Плановая дата аудита</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.plannedAuditDate ? new Date(selectedTask.plannedAuditDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, plannedAuditDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>
                                    <div className="field-group">
                                        <label>Фактическая дата аудита</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.actualAuditDate ? new Date(selectedTask.actualAuditDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, actualAuditDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>
                                    <div className="field-group full-width">
                                        <label>Ссылка на папку проекта</label>
                                        <input type="text" className="modern-input" placeholder="https://..."
                                            value={selectedTask.projectFolderLink || ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, projectFolderLink: e.target.value })} />
                                    </div>
                                </>
                            )}

                            {selectedTask.name === 'Алкогольная лицензия' && (
                                <div className="field-group full-width">
                                    <label>Возможность получения</label>
                                    <select className="modern-input modern-select" value={selectedTask.alcoholLicenseEligibility || ''}
                                        onChange={e => setSelectedTask({ ...selectedTask, alcoholLicenseEligibility: e.target.value })}>
                                        <option value="">Не выбрано</option>
                                        <option value="Да">Да</option>
                                        <option value="Нет">Нет</option>
                                        <option value="Требуется анализ">Требуется анализ</option>
                                    </select>
                                </div>
                            )}

                            {selectedTask.name === 'Площадка ТБО' && (
                                <>
                                    <div className="field-group full-width">
                                        <label>Ссылка на документы</label>
                                        <input type="text" className="modern-input"
                                            value={selectedTask.tboDocsLink || ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, tboDocsLink: e.target.value })} />
                                    </div>
                                    <div className="field-group">
                                        <label>Дата согласования</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.tboAgreementDate ? new Date(selectedTask.tboAgreementDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, tboAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>
                                    <div className="field-group">
                                        <label>Дата регистрации</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.tboRegistryDate ? new Date(selectedTask.tboRegistryDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, tboRegistryDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>
                                </>
                            )}

                            {selectedTask.name === 'Контур планировки' && (
                                <>
                                    <div className="field-group double-width">
                                        <label>Дата согласования</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.planningContourAgreementDate ? new Date(selectedTask.planningContourAgreementDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, planningContourAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Фотографии объекта" label="Фотографии объекта" />
                                    <DocumentUploadBlock docType="Обмерный план" label="Обмерный план" allowedExtensions={['.dwg']} />
                                    <DocumentUploadBlock docType="Предварительный контур" label="Предварительный контур" allowedExtensions={['.dwg']} />
                                </>
                            )}


                            {selectedTask.name === 'Визуализация' && (
                                <>
                                    <div className="field-group double-width">
                                        <label>Дата согласования</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.visualizationAgreementDate ? new Date(selectedTask.visualizationAgreementDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, visualizationAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Концепт визуализации" label="Концепт визуализации" />
                                    <DocumentUploadBlock docType="Выписка ЕГРН" label="Выписка ЕГРН" />
                                    <DocumentUploadBlock docType="Визуализация внешнего вида магазина" label="Визуализация внешнего вида магазина" />
                                </>
                            )}


                            {selectedTask.name === 'Оценка логистики' && (
                                <>
                                    <div className="field-group full-width">
                                        <label>Возможность доставки НБКП</label>
                                        <select className="modern-input modern-select" value={selectedTask.logisticsNbkpEligibility || ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, logisticsNbkpEligibility: e.target.value })}>
                                            <option value="">Не выбрано</option>
                                            <option value="Да">Да</option>
                                            <option value="Нет">Нет</option>
                                        </select>
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Схема подъездных путей" label="Схема подъездных путей" />
                                    <DocumentUploadBlock docType="Оценка логистики и подъездных путей" label="Оценка логистики и подъездных путей" allowedExtensions={['.pdf']} />
                                    <DocumentUploadBlock docType="Оценка возможности НБКП" label="Оценка возможности НБКП" allowedExtensions={['.pdf']} />
                                </>
                            )}


                            {selectedTask.name === 'Планировка с расстановкой' && (
                                <>
                                    <div className="field-group double-width">
                                        <label>Дата согласования</label>
                                        <input type="date" className="modern-input"
                                            value={selectedTask.layoutAgreementDate ? new Date(selectedTask.layoutAgreementDate).toISOString().split('T')[0] : ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, layoutAgreementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Технологическая планировка (DWG)" label="Технологическая планировка (DWG)" allowedExtensions={['.dwg']} />
                                    <DocumentUploadBlock docType="Технологическая планировка (PDF)" label="Технологическая планировка (PDF)" allowedExtensions={['.pdf']} />
                                </>
                            )}


                            {(selectedTask.code === 'TASK-BUDGET-EQUIP' || selectedTask.name === 'Расчет бюджета оборудования') && (
                                <>
                                    <div className="field-group">
                                        <label>Оборудование (без НДС)</label>
                                        <input type="number" className="modern-input" value={selectedTask.equipmentCostNoVat || ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, equipmentCostNoVat: parseFloat(e.target.value) })} />
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Расчет затрат на оборудование" label="Расчет затрат на оборудование" allowedExtensions={['.xls', '.xlsx']} />
                                </>
                            )}

                            {(selectedTask.code === 'TASK-BUDGET-SECURITY' || selectedTask.name === 'Расчет бюджета СБ') && (
                                <>
                                    <div className="field-group">
                                        <label>СБ (без НДС)</label>
                                        <input type="number" className="modern-input" value={selectedTask.securityBudgetNoVat || ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, securityBudgetNoVat: parseFloat(e.target.value) })} />
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Анкета СБ" label="Анкета СБ" />
                                    <DocumentUploadBlock docType="Расчет затрат на оборудование СБ" label="Расчет затрат на оборудование СБ" allowedExtensions={['.xls', '.xlsx']} />
                                </>
                            )}

                            {(selectedTask.code === 'TASK-BUDGET-RSR' || selectedTask.name === 'ТЗ и расчет бюджета РСР') && (
                                <>
                                    <div className="field-group">
                                        <label>РСР (без НДС)</label>
                                        <input type="number" className="modern-input" value={selectedTask.rsrBudgetNoVat || ''}
                                            onChange={e => setSelectedTask({ ...selectedTask, rsrBudgetNoVat: parseFloat(e.target.value) })} />
                                    </div>

                                    <div className="form-section-title" style={{ marginTop: '20px' }}>Обязательные документы</div>
                                    <DocumentUploadBlock docType="Распределительная ведомость" label="Распределительная ведомость" />
                                    <DocumentUploadBlock docType="Расчет бюджета РСР" label="Расчет бюджета РСР" allowedExtensions={['.xls', '.xlsx']} />
                                </>
                            )}

                            {(selectedTask.code === 'TASK-BUDGET-PIS' || selectedTask.name === 'Расчет бюджета ПиС') && (
                                <div className="field-group">
                                    <label>ПИР (без НДС)</label>
                                    <input type="number" className="modern-input" value={selectedTask.pisBudgetNoVat || ''}
                                        onChange={e => setSelectedTask({ ...selectedTask, pisBudgetNoVat: parseFloat(e.target.value) })} />
                                </div>
                            )}

                            {(selectedTask.code === 'TASK-TOTAL-BUDGET' || selectedTask.name === 'Общий бюджет проекта') && (
                                <div className="field-group">
                                    <label>Общий бюджет (без НДС)</label>
                                    <input type="number" className="modern-input" value={selectedTask.totalBudgetNoVat || ''}
                                        onChange={e => setSelectedTask({ ...selectedTask, totalBudgetNoVat: parseFloat(e.target.value) })} />
                                </div>
                            )}


                            {/* Timeline Group */}
                            <div className="form-section-title">Сроки выполнения</div>

                            <div className="field-group">
                                <label>Плановый срок</label>
                                <input type="date" className="modern-input" readOnly
                                    value={selectedTask.normativeDeadline ? new Date(selectedTask.normativeDeadline).toISOString().split('T')[0] : ''} />
                            </div>

                            <div className="field-group">
                                <label>Фактический срок</label>
                                <input type="date" className="modern-input" readOnly
                                    value={selectedTask.actualDate ? new Date(selectedTask.actualDate).toISOString().split('T')[0] : ''} />
                                <small className="field-hint">Заполняется автоматически при завершении задачи</small>
                            </div>

                            {/* Deviation */}
                            {getTaskDeviation(selectedTask) && (
                                <div className="field-group full-width">
                                    <label>Отклонение от плана</label>
                                    <div className={`deviation-display ${getTaskDeviation(selectedTask)?.type === 'early' ? 'early' : 'late'}`}>
                                        {getTaskDeviation(selectedTask)?.type === 'early' ? (
                                            <span>✓ Выполняется раньше на {getTaskDeviation(selectedTask)?.days} дн.</span>
                                        ) : (
                                            <span>⚠ Задержка на {getTaskDeviation(selectedTask)?.days} дн.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Chronology */}
                            <div className="form-section-title">Хронология</div>

                            {selectedTask.createdAt && (
                                <div className="field-group">
                                    <label>Назначено</label>
                                    <div className="modern-input" style={{ background: '#f8fafc', border: 'none', color: '#64748b' }}>
                                        {new Date(selectedTask.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            )}

                            {selectedTask.startedAt && (
                                <div className="field-group">
                                    <label>Взято в работу</label>
                                    <div className="modern-input" style={{ background: '#f8fafc', border: 'none', color: '#64748b' }}>
                                        {new Date(selectedTask.startedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            )}

                            {selectedTask.completedAt && (
                                <div className="field-group">
                                    <label>Завершено</label>
                                    <div className="modern-input" style={{ background: '#f8fafc', border: 'none', color: '#64748b' }}>
                                        {new Date(selectedTask.completedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowEditTaskModal(false)}>Отмена</button>
                            {selectedTask && canUserTakeTask(selectedTask) && (hasPermission('task:edit') || hasPermission('task:edit_own')) && (
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        tasksService.updateTaskStatus(selectedTask.id, "В работе")
                                            .then(() => {
                                                loadProjectTasks();
                                                setShowEditTaskModal(false);
                                            })
                                            .catch((err: any) => alert(err));
                                    }}
                                    style={{ marginRight: 10, background: "#2563eb", display: "flex", alignItems: "center", gap: 6 }}
                                >
                                    <span>▶</span> В работу
                                </button>
                            )}
                            {selectedTask.status !== 'Завершена' && (hasPermission('task:edit') || hasPermission('task:edit_own')) && (
                                <button className="btn-action-complete" onClick={handleCompleteTaskFromModal} style={{ marginRight: 'auto' }}>
                                    ✓ Завершить задачу
                                </button>
                            )}
                            <button className="btn-primary" onClick={handleUpdateTask}>Сохранить</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gantt Info Modal */}
            {showGanttTaskInfoModal && ganttSelectedTask && (
                <div className="modal-overlay" onClick={() => setShowGanttTaskInfoModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2>{ganttSelectedTask.name}</h2>
                            <button className="btn-close-modal" onClick={() => setShowGanttTaskInfoModal(false)}>×</button>
                        </div>
                        <div className="task-info-grid">
                            <div className="info-item">
                                <span className="info-icon"><UserIcon /></span>
                                <div className="info-content">
                                    <div className="info-label">Ответственный</div>
                                    <div className="info-value">{ganttSelectedTask.responsible}</div>
                                </div>
                            </div>
                            <div className="info-item">
                                <span className="info-icon"><CalendarIcon /></span>
                                <div className="info-content">
                                    <div className="info-label">Срок</div>
                                    <div className="info-value">{new Date(ganttSelectedTask.normativeDeadline).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="info-item">
                                <span className="info-icon"><DocIcon /></span>
                                <div className="info-content">
                                    <div className="info-label">Статус</div>
                                    <div className="info-value">{ganttSelectedTask.status}</div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-primary" onClick={() => {
                                setSelectedTask({ ...ganttSelectedTask });
                                setShowGanttTaskInfoModal(false);
                                setShowEditTaskModal(true);
                            }}>Редактировать</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetails;
