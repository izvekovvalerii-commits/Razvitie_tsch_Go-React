import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { PROJECT_STATUSES } from '../constants';
import { getProjectStatusClass, getAvatarColor } from '../utils/uiHelpers';
import { useNavigate } from 'react-router-dom';

interface KanbanBoardProps {
    projects: Project[];
    onStatusChange: (id: number, status: string) => void;
    onDelete?: (id: number) => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    projects,
    onStatusChange,
    onDelete,
    searchQuery = '',
    onSearchChange
}) => {
    const navigate = useNavigate();
    const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
    const [filterMP, setFilterMP] = useState('');

    // Фильтрация проектов (поиск уже применен в projects, добавляем только фильтр по МП)
    const filteredByMP = useMemo(() => {
        if (!filterMP) return projects;
        return projects.filter(p => p.mp === filterMP);
    }, [projects, filterMP]);

    // Уникальные МП для фильтра
    const uniqueMPs = useMemo(() => {
        return Array.from(new Set(projects.map(p => p.mp).filter(Boolean)));
    }, [projects]);

    // Group projects by status
    const columns = PROJECT_STATUSES.map(status => ({
        status,
        items: filteredByMP.filter(p => p.status === status)
    }));

    const handleDragStart = (e: React.DragEvent, projectId: number) => {
        setDraggedProjectId(projectId);
        e.dataTransfer.setData('projectId', projectId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const pidStr = e.dataTransfer.getData('projectId');
        const pid = Number(pidStr);

        const project = projects.find(p => p.id === pid);
        if (project && project.status !== newStatus) {
            onStatusChange(pid, newStatus);
        }
        setDraggedProjectId(null);
    };

    const handleDelete = (e: React.MouseEvent, projectId: number) => {
        e.stopPropagation();
        if (onDelete && confirm('Удалить проект?')) {
            onDelete(projectId);
        }
    };

    const handleEdit = (e: React.MouseEvent, projectId: number) => {
        e.stopPropagation();
        navigate(`/projects/${projectId}`);
    };

    return (
        <>
            {/* Панель фильтров */}
            <div className="kanban-filters">
                <input
                    className="k-search-input"
                    placeholder="🔍 Поиск по названию или ГИС..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                />
                <select
                    className="k-filter-select"
                    value={filterMP}
                    onChange={(e) => setFilterMP(e.target.value)}
                >
                    <option value="">Все МП ({projects.length})</option>
                    {uniqueMPs.map(mp => (
                        <option key={mp} value={mp}>{mp}</option>
                    ))}
                </select>
                {(searchQuery || filterMP) && (
                    <button
                        className="k-clear-filters"
                        onClick={() => { onSearchChange?.(''); setFilterMP(''); }}
                    >
                        ✕ Очистить
                    </button>
                )}
            </div>

            <div className="kanban-board-scroll-area">
                <div className="kanban-board-container fade-in">
                    {columns.map(col => (
                        <div
                            key={col.status}
                            className="kanban-column"
                            onDragOver={(e) => handleDragOver(e)}
                            onDrop={(e) => handleDrop(e, col.status)}
                        >
                            <div className="kanban-column-header">
                                <div className="header-status-row">
                                    <span className={`status-indicator-dot ${getProjectStatusClass(col.status)}`}></span>
                                    <span className="column-title" title={col.status}>{col.status}</span>
                                </div>
                                <span className="column-count-badge">{col.items.length}</span>
                            </div>

                            <div className="kanban-column-body custom-scrollbar">
                                {col.items.map(project => {
                                    const progress = (project.totalTasks || 0) > 0
                                        ? Math.round(((project.completedTasks || 0) / (project.totalTasks || 0)) * 100)
                                        : 0;

                                    return (
                                        <div
                                            key={project.id}
                                            className={`kanban-card ${draggedProjectId === project.id ? 'dragging' : ''}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, project.id)}
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                        >
                                            {/* Быстрые действия */}
                                            <div className="k-card-actions">
                                                <button
                                                    className="k-action-btn"
                                                    onClick={(e) => handleEdit(e, project.id)}
                                                    title="Редактировать"
                                                >
                                                    ✏️
                                                </button>
                                                {onDelete && (
                                                    <button
                                                        className="k-action-btn k-action-delete"
                                                        onClick={(e) => handleDelete(e, project.id)}
                                                        title="Удалить"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>

                                            <div className="kanban-card-top">
                                                <div className="k-card-title">{project.store?.name || `Проект ${project.id}`}</div>
                                                <span className="k-card-type">{project.projectType}</span>
                                            </div>
                                            <div className="k-card-gis">ГИС: {project.gisCode}</div>

                                            {/* Прогресс задач */}
                                            {(project.totalTasks || 0) > 0 && (
                                                <div className="k-card-progress">
                                                    <div className="k-progress-bar">
                                                        <div
                                                            className="k-progress-fill"
                                                            style={{
                                                                width: `${progress}%`,
                                                                backgroundColor: progress === 100 ? '#10b981' : '#3b82f6'
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="k-progress-text">
                                                        {project.completedTasks || 0}/{project.totalTasks || 0}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="kanban-card-footer">
                                                <div className="k-resp-row">
                                                    <div className="avatar-xs" style={{ backgroundColor: getAvatarColor(project.mp), width: 20, height: 20, fontSize: 10 }}>
                                                        {project.mp ? project.mp[0] : '?'}
                                                    </div>
                                                    <span className="k-resp-name" title={project.mp}>{project.mp?.split(' ')[0]}</span>
                                                </div>
                                                {project.totalArea && <span className="k-area">{project.totalArea} м²</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};
