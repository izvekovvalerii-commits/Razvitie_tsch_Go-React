import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { tasksService } from '../services/tasks';
import { projectsService } from '../services/projects';
import { dashboardService } from '../services/dashboard';
import { ProjectTask, Project, UserActivity } from '../types';
import {
    filterOverdueTasks,
    filterExpiringSoonTasks,
    getDaysUntilDeadline
} from '../utils/taskUtils';
import {
    getDetailedStatusColor,
    getRoleColor,
    getTaskStatusClass
} from '../utils/uiHelpers';
import './Hero.css';

interface Stat {
    name: string;
    count: number;
    percent: number;
    color: string;
}


const Hero: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [myTasks, setMyTasks] = useState<ProjectTask[]>([]);
    const [newTasks, setNewTasks] = useState<ProjectTask[]>([]);
    const [activeTasks, setActiveTasks] = useState<ProjectTask[]>([]);
    const [projectStats, setProjectStats] = useState({ active: 0, planning: 0, renovation: 0, total: 0 });
    const [detailedStats, setDetailedStats] = useState<Stat[]>([]);
    const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);
    const [overdueCount, setOverdueCount] = useState(0);
    const [expiringSoonCount, setExpiringSoonCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // UI States
    const [taskTab, setTaskTab] = useState<'all' | 'active' | 'urgent'>('all');

    const [projectMap, setProjectMap] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadDashboardData();
        }
    }, [currentUser]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [allTasks, allProjects, activities] = await Promise.all([
                tasksService.getAllTasks(),
                projectsService.getProjects(),
                dashboardService.getRecentActivity()
            ]);

            // Build Project Map
            const pMap: { [key: number]: string } = {};
            allProjects.forEach(p => {
                if (p.store) {
                    pMap[p.id] = `${p.store.name}`;
                } else {
                    pMap[p.id] = `Проект #${p.id}`;
                }
            });
            setProjectMap(pMap);

            processTasks(allTasks);
            processProjects(allProjects, allTasks);
            // Ensure dates are parsed
            const parsedActivities = activities.map(a => ({
                ...a,
                // Handle various date formats if needed, or assume backend sends ISO
                timestamp: a.timestamp
            }));
            setRecentActivities(parsedActivities);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processTasks = (allTasks: ProjectTask[]) => {
        if (!currentUser) return;

        // Backend already returns tasks filtered by user role - no need to filter again
        const userTasks = allTasks;
        userTasks.sort((a, b) => new Date(a.normativeDeadline).getTime() - new Date(b.normativeDeadline).getTime());

        setMyTasks(userTasks);
        setNewTasks(userTasks.filter(t => t.status === 'Назначена'));
        setActiveTasks(userTasks.filter(t => t.status === 'В работе'));

        const overdue = filterOverdueTasks(userTasks);
        setOverdueCount(overdue.length);

        const expiring = filterExpiringSoonTasks(userTasks);
        setExpiringSoonCount(expiring.length);
    };


    const processProjects = (allProjects: Project[], userTasks: ProjectTask[]) => {
        if (!currentUser) return [];

        let myProjects = [];
        const myProjectIds = new Set(userTasks.map(t => t.projectId));

        if (currentUser.role === 'БА') {
            myProjects = allProjects;
        } else {
            myProjects = allProjects.filter(p => myProjectIds.has(p.id));
        }

        const active = myProjects.filter(p => ['Active', 'Открыт'].includes(p.status)).length;
        const planning = myProjects.filter(p => ['Planning', 'Создан', 'Аудит', 'Бюджет сформирован', 'Утвержден ИК', 'Подписан договор'].includes(p.status)).length;
        const renovation = myProjects.filter(p => ['Renovation', 'СМР', 'Ремонт', 'Рср'].includes(p.status)).length;

        setProjectStats({
            total: myProjects.length,
            active,
            planning,
            renovation
        });

        const statusCounts: { [key: string]: number } = {};
        myProjects.forEach(p => {
            const s = p.status || 'Без статуса';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        const stats = Object.keys(statusCounts).map(status => ({
            name: status,
            count: statusCounts[status],
            percent: Math.round((statusCounts[status] / myProjects.length) * 100),
            color: getDetailedStatusColor(status)
        })).sort((a, b) => b.count - a.count).slice(0, 5);

        setDetailedStats(stats);
        return myProjects;
    };

    // --- Navigation Helpers ---
    const navigateToTasksWithFilter = (status: string) => {
        navigate(`/tasks?status=${status}`);
    };

    const navigateToOverdueTasks = () => navigate('/tasks?overdue=true');
    const navigateToExpiringSoonTasks = () => navigate('/tasks?expiringSoon=true');


    // --- Render Helpers ---

    const getFilteredTasks = () => {
        switch (taskTab) {
            case 'active': return activeTasks;
            case 'urgent': return myTasks.filter(t => getDaysUntilDeadline(t).isUrgent || getDaysUntilDeadline(t).isOverdue);
            default: return myTasks;
        }
    };

    const renderActivityFeed = () => {
        if (loading) {
            return Array(6).fill(0).map((_, i) => (
                <div key={i} className="skeleton-row">
                    <div className="skeleton skeleton-circle"></div>
                    <div className="skeleton skeleton-text long"></div>
                </div>
            ));
        }

        if (recentActivities.length === 0) {
            return <div className="empty-text">Нет активности</div>;
        }

        const groups: { [key: string]: UserActivity[] } = { 'Сегодня': [], 'Вчера': [], 'Ранее': [] };

        recentActivities.slice(0, 15).forEach(act => {
            const date = new Date(act.timestamp);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
                groups['Сегодня'].push(act);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups['Вчера'].push(act);
            } else {
                groups['Ранее'].push(act);
            }
        });

        return Object.entries(groups).map(([label, activities]) => {
            if (activities.length === 0) return null;
            return (
                <div key={label} className="activity-group">
                    <div className="feed-date-header">{label}</div>
                    {activities.map(activity => (
                        <div key={activity.id} className="feed-item">
                            <div className="feed-line"></div>
                            <div className="feed-avatar" style={{ background: getRoleColor(activity.userRole) }}>
                                {activity.userName.charAt(0)}
                            </div>
                            <div className="feed-content">
                                <div className="feed-header-row">
                                    <div className="feed-user-info">
                                        <span className="feed-user">{activity.userName}</span>
                                        <span className="feed-role">{activity.userRole}</span>
                                    </div>
                                    <span className="feed-time-compact">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="feed-text-action">
                                    {activity.action}
                                    {activity.projectName && <span className="feed-project-tag">{activity.projectName}</span>}
                                </div>
                                <Link to={`/projects/${activity.projectId}`} className="feed-link">
                                    {activity.entityName || activity.taskName || `Элемент #${activity.entityId}`}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            );
        });
    };

    const filteredTasksInView = getFilteredTasks().slice(0, 6);

    return (
        <div className="dashboard-page">
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <div className="welcome-content">
                    <h1>Добрый день, {(currentUser?.name || '').split(' ')[0]}!</h1>
                    <div className="welcome-meta-row">
                        <div className="live-clock">
                            {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="live-date">
                            {currentTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="live-divider">•</div>
                        <div className="tasks-count">
                            {activeTasks.length > 0 ? `Активных задач: ${activeTasks.length}` : 'Все задачи выполнены'}
                        </div>
                    </div>
                </div>
                <div className="quick-actions">
                    <button className="action-btn secondary" onClick={() => navigate('/tasks')}>
                        <span className="icon">📋</span> Мои задачи
                    </button>
                    <Link to="/projects/new" className="action-btn primary">
                        {/* Assuming /projects/new exists or opens modal, otherwise /projects */}
                        <span className="icon">🏗️</span> Новый проект
                    </Link>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="kpi-grid">
                {loading ? Array(5).fill(0).map((_, i) => (
                    <div key={i} className="kpi-card skeleton" style={{ height: '100px', cursor: 'default', background: '#f1f5f9' }}></div>
                )) : (
                    <>
                        {/* Projects */}
                        <div className="kpi-card purple" onClick={() => navigate('/projects')}>
                            <div className="kpi-icon-bg">🏢</div>
                            <div className="kpi-content">
                                <div className="kpi-value">{projectStats.total}</div>
                                <div className="kpi-label">Всего проектов</div>
                            </div>
                        </div>
                        {/* New Tasks */}
                        <div className="kpi-card blue" onClick={() => navigateToTasksWithFilter('Назначена')}>
                            <div className="kpi-icon-bg">🔔</div>
                            <div className="kpi-content">
                                <div className="kpi-value">{newTasks.length}</div>
                                <div className="kpi-label">Новые задачи</div>
                            </div>
                        </div>
                        {/* Active Tasks */}
                        <div className="kpi-card green" onClick={() => navigateToTasksWithFilter('В работе')}>
                            <div className="kpi-icon-bg">⚡</div>
                            <div className="kpi-content">
                                <div className="kpi-value">{activeTasks.length}</div>
                                <div className="kpi-label">В работе</div>
                            </div>
                        </div>
                        {/* Overdue */}
                        <div className="kpi-card orange" onClick={navigateToOverdueTasks}>
                            <div className="kpi-icon-bg">🔥</div>
                            <div className="kpi-content">
                                <div className="kpi-value">{overdueCount}</div>
                                <div className="kpi-label">Просрочено</div>
                            </div>
                        </div>
                        {/* Expiring Soon */}
                        <div className="kpi-card yellow" onClick={navigateToExpiringSoonTasks}>
                            <div className="kpi-icon-bg">⏰</div>
                            <div className="kpi-content">
                                <div className="kpi-value">{expiringSoonCount}</div>
                                <div className="kpi-label">Истекают</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="dashboard-split">
                {/* Left Main Column */}
                <div className="main-column">
                    {/* Projects Charts / Status */}
                    <div className="content-block stats-block" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                        <div className="block-header-modern">
                            <h3>Статус проектов</h3>
                            <Link to="/projects" className="link-simple">Все проекты →</Link>
                        </div>
                        <div className="stats-content">
                            <div className="chart-container">
                                {projectStats.total > 0 ? (
                                    <div className="pie-chart"
                                        style={{
                                            background: `conic-gradient(
                                                #4caf50 0% ${(projectStats.active / projectStats.total) * 100}%, 
                                                #ff9800 ${(projectStats.active / projectStats.total) * 100}% ${((projectStats.active + projectStats.planning) / projectStats.total) * 100}%, 
                                                #f44336 ${((projectStats.active + projectStats.planning) / projectStats.total) * 100}% 100%
                                            )`
                                        }}>
                                        <div className="pie-hole">
                                            <div className="pie-total">{projectStats.total}</div>
                                            <div className="pie-label">Проектов</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="chart-empty">Нет данных</div>
                                )}
                            </div>

                            <div className="detailed-stats-list">
                                {detailedStats.map(stat => (
                                    <div className="stat-row" key={stat.name}>
                                        <div className="stat-row-header">
                                            <div className="stat-name-group">
                                                <span className="dot" style={{ background: stat.color }}></span>
                                                <span className="stat-name">{stat.name}</span>
                                            </div>
                                            <div className="stat-val-group">
                                                <span className="stat-val">{stat.count}</span>
                                                <span className="stat-percent">{stat.percent}%</span>
                                            </div>
                                        </div>
                                        <div className="stat-progress-bg">
                                            <div className="stat-progress-bar"
                                                style={{ width: `${stat.percent}%`, background: stat.color }}>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tasks List */}
                    <div className="content-block tasks-list-block">
                        <div className="block-header-modern">
                            <h3>Мои задачи</h3>
                            <div className="task-tabs-container">
                                <button
                                    className={`tab-btn ${taskTab === 'all' ? 'active' : ''}`}
                                    onClick={() => setTaskTab('all')}
                                >
                                    Все
                                </button>
                                <button
                                    className={`tab-btn ${taskTab === 'active' ? 'active' : ''}`}
                                    onClick={() => setTaskTab('active')}
                                >
                                    В работе
                                </button>
                                <button
                                    className={`tab-btn ${taskTab === 'urgent' ? 'active' : ''}`}
                                    onClick={() => setTaskTab('urgent')}
                                >
                                    Срочные
                                </button>
                            </div>
                        </div>
                        <div className="task-list-modern">
                            {loading ? Array(5).fill(0).map((_, i) => (
                                <div key={i} className="skeleton skeleton-list-item"></div>
                            )) : (
                                <>
                                    {filteredTasksInView.length > 0 ? filteredTasksInView.map(task => {
                                        const deadlineInfo = getDaysUntilDeadline(task);
                                        const projectName = projectMap[task.projectId] || `Проект #${task.projectId}`;
                                        const statusClass = getTaskStatusClass(task.status);

                                        return (
                                            <Link key={task.id} to={`/projects/${task.projectId}`} className={`task-card ${statusClass}-border`}>
                                                <div className="task-card-content">
                                                    <div className="task-card-header">
                                                        <span className="task-project-name">{projectName}</span>
                                                        <span className="task-id-badge">#{task.id}</span>
                                                    </div>
                                                    <div className="task-title-large">{task.name}</div>
                                                    <div className="task-footer">
                                                        <div className="task-badges">
                                                            <span className="task-type-pill">{task.taskType}</span>
                                                            {/* <span className={`status-pill ${statusClass}`}>{task.status}</span> */}
                                                        </div>
                                                        <div className={`task-deadline-badge ${deadlineInfo.isUrgent ? 'urgent' : ''} ${deadlineInfo.isOverdue ? 'overdue' : ''}`}>
                                                            {deadlineInfo.text}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    }) : (
                                        <div className="empty-state-tasks">
                                            {taskTab === 'urgent' ? 'Нет срочных задач 🎉' : 'Задач не найдено'}
                                        </div>
                                    )}
                                    <div className="view-all-link-row">
                                        <Link to="/tasks" className="link-simple">Перейти ко всем задачам →</Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Column */}
                <div className="side-column">
                    {/* Activity Feed */}
                    <div className="content-block activity-feed-block">
                        <div className="block-header-modern">
                            <h3>Лента событий</h3>
                        </div>
                        <div className="activity-feed">
                            {renderActivityFeed()}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Hero;
