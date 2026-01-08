import React, { useEffect, useState } from 'react';
import { tasksService } from '../services/tasks';
import { Modal } from '../components/common/Modal';
import { getRoleColor } from '../utils/uiHelpers';
import './Projects.css'; // Reuse table styles

interface TaskDefinition {
    id: number;
    code: string;
    name: string;
    duration: number;
    stage: string;
    dependsOn: string[];
    responsibleRole: string;
}

interface WorkflowSettingsProps {
    isEmbedded?: boolean;
}

const WorkflowSettings: React.FC<WorkflowSettingsProps> = ({ isEmbedded }) => {
    const [tasks, setTasks] = useState<TaskDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);
    const [editDuration, setEditDuration] = useState<number>(0);

    // Filter/Sort State
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await tasksService.getWorkflowSchema();
            const parsed = data.map((d: any) => ({
                ...d,
                dependsOn: Array.isArray(d.dependsOn) ? d.dependsOn : []
            }));
            setTasks(parsed);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (task: TaskDefinition) => {
        setEditingTask(task);
        setEditDuration(task.duration);
    };

    const handleSave = async () => {
        if (!editingTask) return;
        try {
            await tasksService.updateWorkflowDefinition({
                ...editingTask,
                duration: editDuration
            });
            setEditingTask(null);
            loadData();
        } catch (e) {
            alert('Ошибка сохранения');
        }
    };

    // Group tasks by Stage
    const groupedTasks = tasks.reduce((acc, task) => {
        if (!acc[task.stage]) acc[task.stage] = [];
        acc[task.stage].push(task);
        return acc;
    }, {} as Record<string, TaskDefinition[]>);

    // Filter logic
    const filteredGroups = Object.keys(groupedTasks).reduce((acc, stage) => {
        const stageTasks = groupedTasks[stage].filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (stageTasks.length > 0) acc[stage] = stageTasks;
        return acc;
    }, {} as Record<string, TaskDefinition[]>);

    if (loading) return (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner"></div>
        </div>
    );

    return (
        <div className="projects-page workflow-page" style={isEmbedded ? { padding: '0 0 0 16px', height: '100%' } : {}}>
            {!isEmbedded && (
                <div className="page-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
                    <div className="header-left">
                        <h1 className="page-title" style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                            Регламент процессов
                        </h1>
                    </div>
                </div>
            )}

            <div className={`header-actions ${isEmbedded ? 'embedded-header' : ''}`} style={isEmbedded ? { padding: '16px 0' } : {}}>
                <div className="search-box" style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input"
                        style={{ paddingLeft: '32px', width: '200px', height: '32px', fontSize: '13px' }}
                    />
                    <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
            </div>

            <div className="workflow-board">
                {Object.entries(filteredGroups).map(([stage, stageTasks]) => (
                    <div key={stage} className="stage-column">
                        <div className="stage-header">
                            <h2 title={stage}>{stage}</h2>
                            <span className="count-badge">
                                {stageTasks.length}
                            </span>
                        </div>

                        <div className="stage-tasks-list">
                            {stageTasks.map(task => (
                                <div key={task.code} className="task-board-card" onClick={() => handleEdit(task)}>
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
                                        {task.dependsOn.length > 0 && (
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

            {editingTask && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditingTask(null)}
                    title={`Настройка: ${editingTask.name}`}
                    footer={(
                        <>
                            <button className="btn-cancel" onClick={() => setEditingTask(null)}>Отмена</button>
                            <button className="btn-create" onClick={handleSave}>Сохранить</button>
                        </>
                    )}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>КОД</label>
                                    <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{editingTask.code}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ЭТАП</label>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{editingTask.stage}</div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Длительность (раб. дней)</span>
                                <span style={{ color: editDuration > 5 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                                    {editDuration} дн.
                                </span>
                            </label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={editDuration}
                                    onChange={e => setEditDuration(parseInt(e.target.value) || 0)}
                                    style={{ flex: 1, height: '6px', accentColor: '#3b82f6' }}
                                />
                                <input
                                    type="number"
                                    className="modern-input"
                                    value={editDuration}
                                    onChange={e => setEditDuration(parseInt(e.target.value) || 0)}
                                    min="0"
                                    style={{ width: '60px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}
                                />
                            </div>
                        </div>

                        {editingTask.dependsOn.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                <div style={{ marginBottom: '4px', fontWeight: 600 }}>Зависит от задач:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {editingTask.dependsOn.map(dep => (
                                        <span key={dep} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                            {dep}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            <style>{`
                .workflow-page {
                    width: 100%;
                    height: calc(100vh - 60px); /* Adjust based on header height */
                    padding: 20px 32px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .workflow-board {
                    display: flex;
                    gap: 16px;
                    overflow-x: auto;
                    padding-bottom: 20px;
                    height: 100%;
                    align-items: flex-start;
                }

                .stage-column {
                    min-width: 300px;
                    width: 300px;
                    background: #f1f5f9;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    max-height: 100%;
                    flex-shrink: 0;
                    border: 1px solid #e2e8f0;
                }

                .stage-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #fff;
                    border-radius: 12px 12px 0 0;
                }

                .stage-header h2 {
                    font-size: 14px;
                    font-weight: 700;
                    color: #475569;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .count-badge {
                    background: #f1f5f9;
                    color: #94a3b8;
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-weight: 700;
                }

                .stage-tasks-list {
                    padding: 12px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .task-board-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                }

                .task-board-card:hover {
                    border-color: #94a3b8;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    transform: translateY(-1px);
                }

                .code-pill {
                    font-size: 10px;
                    font-family: monospace;
                    color: #94a3b8;
                    font-weight: 700;
                }

                .role-pill {
                    font-size: 10px;
                    font-weight: 600;
                    padding: 1px 6px;
                    border-radius: 4px;
                    line-height: 1.4;
                }

                .task-title {
                    font-size: 13px;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 8px;
                    line-height: 1.35;
                }

                .task-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .duration-pill {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .deps-indicator {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 11px;
                    color: #94a3b8;
                }

                /* Custom Scrollbar for columns */
                .stage-tasks-list::-webkit-scrollbar {
                    width: 4px;
                }
                .stage-tasks-list::-webkit-scrollbar-track {
                    background: transparent;
                }
                .stage-tasks-list::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .workflow-board::-webkit-scrollbar {
                    height: 8px;
                }
                .workflow-board::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default WorkflowSettings;
