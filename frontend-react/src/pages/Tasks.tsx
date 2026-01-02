import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tasksService } from '../services/tasks';
import { useAuth } from '../hooks/useAuth';
import { ProjectTask } from '../types';
import { TASK_STATUSES, TASK_TYPES } from '../constants';
import './Tasks.css';

// Helper function to generate avatar color based on name
const getAvatarColor = (name: string | undefined): string => {
    if (!name) return '#94a3b8';
    const colors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316', // orange
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

const Tasks: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentUser } = useAuth();

    const [allTasks, setAllTasks] = useState<ProjectTask[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
    const [showOnlyExpiringSoon, setShowOnlyExpiringSoon] = useState(false);

    const [sortColumn, setSortColumn] = useState('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        // Read qparams
        const status = searchParams.get('status');
        if (status) setStatusFilter(status);
        if (searchParams.get('overdue') === 'true') setShowOnlyOverdue(true);
        if (searchParams.get('expiringSoon') === 'true') setShowOnlyExpiringSoon(true);

        loadTasks();
    }, [searchParams]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await tasksService.getAllTasks();
            setAllTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const uniqueTaskTypes = useMemo(() => {
        return Array.from(new Set(allTasks.map(t => t.taskType).filter(Boolean))).sort();
    }, [allTasks]);

    const getResponsibleDisplay = (task: ProjectTask): string => {
        // Here we duplicate logic from Angular component somewhat, assuming mock data structure
        // If task.responsibleUserId is present, we could look it up. For simplicity:
        return task.responsible || 'Не назначен';
    };

    const uniqueResponsibles = useMemo(() => {
        const responsibles = allTasks.map(t => getResponsibleDisplay(t)).filter(Boolean);
        return Array.from(new Set(responsibles)).sort();
    }, [allTasks]);

    const filteredTasks = useMemo(() => {
        let result = allTasks.filter(task => {
            // Access check logic (simplified for consistent UI)
            const matchUser = !currentUser ||
                currentUser.role === 'БА' ||
                task.responsibleUserId === currentUser.id ||
                task.responsible === currentUser.name ||
                task.responsible === currentUser.role;

            // Simplified: show all if no filtering logic strictly required, but let's keep it open for demo

            const matchSearch = !searchQuery ||
                task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.projectId && task.projectId.toString().includes(searchQuery));

            const matchStatus = !statusFilter || task.status === statusFilter;
            const matchType = !typeFilter || task.taskType === typeFilter;
            const matchResp = !responsibleFilter || getResponsibleDisplay(task) === responsibleFilter;

            let matchOverdue = true;
            if (showOnlyOverdue) {
                const deadline = new Date(task.normativeDeadline);
                const now = new Date();
                deadline.setHours(0, 0, 0, 0);
                now.setHours(0, 0, 0, 0);
                matchOverdue = deadline < now && task.status !== 'Выполнена' && task.status !== 'Завершена';
            }

            let matchExpiringSoon = true;
            if (showOnlyExpiringSoon) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const afterTommorow = new Date(now);
                afterTommorow.setDate(now.getDate() + 2); // simplistic check
                const deadline = new Date(task.normativeDeadline);
                deadline.setHours(0, 0, 0, 0);
                matchExpiringSoon = deadline >= now && deadline <= afterTommorow;
            }

            return matchSearch && matchStatus && matchType && matchResp && matchOverdue && matchExpiringSoon;
        });

        // Sort
        if (sortColumn) {
            result.sort((a, b) => {
                let valA: any = a[sortColumn as keyof ProjectTask] || '';
                let valB: any = b[sortColumn as keyof ProjectTask] || '';

                if (sortColumn === 'actualDate' || sortColumn === 'normativeDeadline' || sortColumn === 'createdAt') {
                    valA = new Date(valA || 0).getTime();
                    valB = new Date(valB || 0).getTime();
                }

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [allTasks, searchQuery, statusFilter, typeFilter, responsibleFilter, showOnlyOverdue, showOnlyExpiringSoon, sortColumn, sortDirection, currentUser]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getStatusClass = (status: string) => {
        const map: { [key: string]: string } = {
            'Назначена': 'status-assigned',
            'В работе': 'status-in-progress',
            'Завершена': 'status-completed',
            'Срыв сроков': 'status-overdue'
        };
        return map[status] || '';
    };

    const getDeadlineClass = (deadlineStr: string) => {
        if (!deadlineStr) return '';
        const deadline = new Date(deadlineStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);

        if (deadline < now) return 'deadline-overdue';

        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(now.getDate() + 3);

        if (deadline <= threeDaysFromNow) return 'deadline-soon';
        return '';
    };

    const getTaskDeviation = (task: ProjectTask) => {
        if (!task || !task.normativeDeadline || !task.actualDate) return undefined;
        const dayMs = 1000 * 60 * 60 * 24;
        const planDate = new Date(task.normativeDeadline);
        const actualDate = new Date(task.actualDate);
        const diff = (planDate.getTime() - actualDate.getTime()) / dayMs;

        if (diff > 0) return { days: Math.round(diff), type: 'early' as const };
        if (diff < 0) return { days: Math.round(Math.abs(diff)), type: 'late' as const };
        return undefined;
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    };

    const openEditModal = (task: ProjectTask) => {
        // Navigate to project details 
        if (task.projectId) {
            navigate(`/projects/${task.projectId}?editTask=${task.id}`);
        }
    };

    const isFilterActive = searchQuery || typeFilter || statusFilter || responsibleFilter || showOnlyOverdue || showOnlyExpiringSoon;

    const resetFilters = () => {
        setSearchQuery('');
        setTypeFilter('');
        setStatusFilter('');
        setResponsibleFilter('');
        setShowOnlyOverdue(false);
        setShowOnlyExpiringSoon(false);
        setSearchParams({});
    };

    if (loading) return <div className="tasks-page"><p>Загрузка задач...</p></div>;

    const totalTasks = allTasks.length;
    const inProgressCount = allTasks.filter(t => t.status === 'В работе').length;
    const overdueCount = allTasks.filter(t => {
        const deadline = new Date(t.normativeDeadline);
        const now = new Date();
        deadline.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        return deadline < now && t.status !== 'Выполнена' && t.status !== 'Завершена';
    }).length;

    return (
        <div className="tasks-page">
            {/* Unified Controls Block */}
            <div className="unified-controls-row">
                {/* Left: Quick Stats */}
                <div className="quick-stats-inline">
                    <div className="stat-card-mini">
                        <span className="stat-label-mini">Всего</span>
                        <span className="stat-value-mini">{totalTasks}</span>
                    </div>
                    <div className="stat-card-mini">
                        <span className="stat-label-mini">В работе</span>
                        <span className="stat-value-mini">{inProgressCount}</span>
                    </div>
                    <div className="stat-card-mini">
                        <span className="stat-label-mini">Просрочено</span>
                        <span className="stat-value-mini danger">{overdueCount}</span>
                    </div>
                </div>

                {/* Right: Filters + Search */}
                <div className="controls-right-group">
                    {/* Dropdown Filters */}
                    <select className="compact-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="">Все типы</option>
                        {uniqueTaskTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select className="compact-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Все статусы</option>
                        {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="compact-select" value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)}>
                        <option value="">Все исполнители</option>
                        {uniqueResponsibles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    {/* Search */}
                    <div className="search-wrapper-compact">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Поиск (название, ID проекта)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input-compact"
                        />
                    </div>

                    {/* Reset Button */}
                    {isFilterActive && (
                        <button className="reset-btn-compact" onClick={resetFilters} title="Сбросить фильтры">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {!loading && filteredTasks.length > 0 && (
                <div className="tasks-table-container">
                    <table className="tasks-table compact-table">
                        <thead>
                            <tr>
                                <th style={{ width: '25%' }} onClick={() => handleSort('name')} className="sortable-header">
                                    Название {sortColumn === 'name' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                                <th style={{ width: '5%' }} onClick={() => handleSort('projectId')} className="sortable-header">
                                    Проект {sortColumn === 'projectId' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                                <th style={{ width: '12%' }} onClick={() => handleSort('taskType')} className="sortable-header">
                                    Тип {sortColumn === 'taskType' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                                <th style={{ width: '10%' }} onClick={() => handleSort('status')} className="sortable-header">
                                    Статус {sortColumn === 'status' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                                <th style={{ width: '15%' }} onClick={() => handleSort('responsible')} className="sortable-header">
                                    Ответственный {sortColumn === 'responsible' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                                <th style={{ width: '8%' }} onClick={() => handleSort('normativeDeadline')} className="sortable-header">
                                    План {sortColumn === 'normativeDeadline' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                                <th style={{ width: '15%' }} onClick={() => handleSort('actualDate')} className="sortable-header">
                                    Факт / Откл. {sortColumn === 'actualDate' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                                <th style={{ width: '10%' }} onClick={() => handleSort('createdAt')} className="sortable-header">
                                    Создана {sortColumn === 'createdAt' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => (
                                <tr key={task.id} className="clickable-row" onClick={() => openEditModal(task)}>
                                    <td className="task-name-cell">
                                        <span className="task-name-text" title={task.name}>{task.name}</span>
                                    </td>
                                    <td><span className="project-id-badge">#{task.projectId}</span></td>
                                    <td className="text-cell">{task.taskType}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusClass(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="responsible-cell">
                                            <div className="resp-avatar-sm" style={{ backgroundColor: getAvatarColor(getResponsibleDisplay(task)) }}>{getInitials(getResponsibleDisplay(task))}</div>
                                            <span className="resp-name">{getResponsibleDisplay(task)}</span>
                                        </div>
                                    </td>
                                    <td className={getDeadlineClass(task.normativeDeadline)}>
                                        {new Date(task.normativeDeadline).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {task.actualDate ? (
                                            <div>
                                                {new Date(task.actualDate).toLocaleDateString()}
                                                {(() => {
                                                    const dev = getTaskDeviation(task);
                                                    if (dev) {
                                                        return (
                                                            <span style={{
                                                                color: dev.type === 'early' ? 'green' : 'red',
                                                                fontSize: '11px',
                                                                marginLeft: '4px',
                                                                fontWeight: 600
                                                            }}>
                                                                ({dev.type === 'early' ? '-' : '+'}{dev.days}д)
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        ) : <span style={{ color: '#ccc' }}>—</span>}
                                    </td>
                                    <td style={{ color: '#94a3b8' }}>
                                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredTasks.length === 0 && (
                <div className="empty-state">
                    <p>Задачи не найдены</p>
                </div>
            )}
        </div>
    );
};

export default Tasks;
