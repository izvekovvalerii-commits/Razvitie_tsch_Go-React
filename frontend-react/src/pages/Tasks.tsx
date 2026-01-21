import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { tasksService } from '../services/tasks';
import { useAuth } from '../hooks/useAuth';
import { ProjectTask } from '../types';
import { TASK_STATUSES } from '../constants';
import {
    isOverdueTask,
    isExpiringSoonTask,
    getDeadlineClass,
    getTaskDeviation
} from '../utils/taskUtils';
import {
    getAvatarColor,
    getInitials,
    getTaskStatusClass
} from '../utils/uiHelpers';
import './Tasks.css';

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

    // UI Dropdown States
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [responsibleDropdownOpen, setResponsibleDropdownOpen] = useState(false);

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
        return task.responsible || 'Не назначен';
    };

    const uniqueResponsibles = useMemo(() => {
        const responsibles = allTasks.map(t => getResponsibleDisplay(t)).filter(Boolean);
        return Array.from(new Set(responsibles)).sort();
    }, [allTasks]);

    const filteredTasks = useMemo(() => {
        let result = allTasks.filter(task => {
            const matchSearch = !searchQuery ||
                task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.projectId && task.projectId.toString().includes(searchQuery));

            const matchStatus = !statusFilter || task.status === statusFilter;
            const matchType = !typeFilter || task.taskType === typeFilter;
            const matchResp = !responsibleFilter || getResponsibleDisplay(task) === responsibleFilter;

            const matchOverdue = !showOnlyOverdue || isOverdueTask(task);
            const matchExpiringSoon = !showOnlyExpiringSoon || isExpiringSoonTask(task);

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

    const openEditModal = (task: ProjectTask) => {
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

    const closeAllDropdowns = () => {
        setTypeDropdownOpen(false);
        setStatusDropdownOpen(false);
        setResponsibleDropdownOpen(false);
    };

    if (loading) return <div className="tasks-page"><p>Загрузка задач...</p></div>;

    const totalTasks = allTasks.length;
    const inProgressCount = allTasks.filter(t => t.status === 'В работе').length;
    const overdueCount = allTasks.filter(isOverdueTask).length;

    return (
        <div className="tasks-page" onClick={closeAllDropdowns}>
            {/* Unified Controls Block */}
            <div className="main-toolbar" onClick={e => e.stopPropagation()}>
                {/* Left: Stat Badges */}
                <div className="toolbar-section stats-section">
                    <div
                        className={`stat-badge badge-total ${!isFilterActive ? 'active' : ''}`}
                        onClick={resetFilters}
                    >
                        <span className="stat-label">Всего</span>
                        <span className="stat-value">{totalTasks}</span>
                    </div>
                    <div
                        className={`stat-badge badge-active ${statusFilter === 'В работе' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('В работе')}
                    >
                        <span className="stat-label">В работе</span>
                        <span className="stat-value">{inProgressCount}</span>
                    </div>
                    <div
                        className={`stat-badge badge-renovation ${showOnlyOverdue ? 'active' : ''}`}
                        onClick={() => setShowOnlyOverdue(!showOnlyOverdue)}
                    >
                        <span className="stat-label">Просрочено</span>
                        <span className="stat-value">{overdueCount}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="toolbar-section filters-section">
                    {/* Type Filter */}
                    <div className="filter-dropdown-wrapper">
                        <button
                            className={`filter-select ${typeDropdownOpen ? 'open' : ''}`}
                            onClick={() => { closeAllDropdowns(); setTypeDropdownOpen(!typeDropdownOpen); }}
                        >
                            <span className="select-text">
                                {typeFilter || "Все типы"}
                            </span>
                            <Icons.ChevronDown size={16} className="chevron" />
                        </button>

                        {typeDropdownOpen && (
                            <div className="dropdown-menu">
                                <div
                                    className={`dropdown-item ${!typeFilter ? 'selected' : ''}`}
                                    onClick={() => { setTypeFilter(""); setTypeDropdownOpen(false); }}
                                >
                                    Все типы
                                </div>
                                {uniqueTaskTypes.map(t => (
                                    <div
                                        key={t}
                                        className={`dropdown-item ${typeFilter === t ? 'selected' : ''}`}
                                        onClick={() => { setTypeFilter(t); setTypeDropdownOpen(false); }}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="filter-dropdown-wrapper">
                        <button
                            className={`filter-select ${statusDropdownOpen ? 'open' : ''}`}
                            onClick={() => { closeAllDropdowns(); setStatusDropdownOpen(!statusDropdownOpen); }}
                        >
                            <span className="select-text">
                                {statusFilter || "Все статусы"}
                            </span>
                            <Icons.ChevronDown size={16} className="chevron" />
                        </button>

                        {statusDropdownOpen && (
                            <div className="dropdown-menu">
                                <div
                                    className={`dropdown-item ${!statusFilter ? 'selected' : ''}`}
                                    onClick={() => { setStatusFilter(""); setStatusDropdownOpen(false); }}
                                >
                                    Все статусы
                                </div>
                                {TASK_STATUSES.map(s => (
                                    <div
                                        key={s}
                                        className={`dropdown-item ${statusFilter === s ? 'selected' : ''}`}
                                        onClick={() => { setStatusFilter(s); setStatusDropdownOpen(false); }}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Responsible Filter */}
                    <div className="filter-dropdown-wrapper">
                        <button
                            className={`filter-select ${responsibleDropdownOpen ? 'open' : ''}`}
                            onClick={() => { closeAllDropdowns(); setResponsibleDropdownOpen(!responsibleDropdownOpen); }}
                        >
                            <span className="select-text">
                                {responsibleFilter || "Все исполнители"}
                            </span>
                            <Icons.ChevronDown size={16} className="chevron" />
                        </button>

                        {responsibleDropdownOpen && (
                            <div className="dropdown-menu">
                                <div
                                    className={`dropdown-item ${!responsibleFilter ? 'selected' : ''}`}
                                    onClick={() => { setResponsibleFilter(""); setResponsibleDropdownOpen(false); }}
                                >
                                    Все исполнители
                                </div>
                                {uniqueResponsibles.map(r => (
                                    <div
                                        key={r}
                                        className={`dropdown-item ${responsibleFilter === r ? 'selected' : ''}`}
                                        onClick={() => { setResponsibleFilter(r); setResponsibleDropdownOpen(false); }}
                                    >
                                        {r}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="toolbar-section actions-section">
                    {/* Search */}
                    <div className="search-compact">
                        <Icons.Search size={16} />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Reset Button (only if active) */}
                    {isFilterActive && (
                        <button
                            className="view-toggle active"
                            onClick={resetFilters}
                            title="Сбросить все фильтры"
                            style={{ width: '40px', color: '#ef4444' }}
                        >
                            <Icons.X size={18} />
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
                                    👤 Ответственный {sortColumn === 'responsible' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
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
                                        <span className={`status-badge ${getTaskStatusClass(task.status)}`}>
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
