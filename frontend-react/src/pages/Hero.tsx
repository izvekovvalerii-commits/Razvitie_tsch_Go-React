import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { tasksService } from '../services/tasks';
import { projectsService } from '../services/projects';
import { dashboardService } from '../services/dashboard';
import { ProjectTask, Project, UserActivity } from '../types';
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

            processTasks(allTasks);
            processProjects(allProjects, allTasks);
            setRecentActivities(activities);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processTasks = (allTasks: ProjectTask[]) => {
        if (!currentUser) return;

        let userTasks = [];
        if (currentUser.role === 'БА') {
            userTasks = allTasks;
        } else {
            userTasks = allTasks.filter(task =>
                task.responsibleUserId === currentUser.id ||
                task.responsible === currentUser.name ||
                task.responsible === currentUser.role
            );
        }

        userTasks.sort((a, b) => new Date(a.normativeDeadline).getTime() - new Date(b.normativeDeadline).getTime());

        setMyTasks(userTasks);
        setNewTasks(userTasks.filter(t => t.status === 'Назначена'));
        setActiveTasks(userTasks.filter(t => t.status === 'В работе'));

        // Calculate overdue
        const now = new Date();
        const overdue = userTasks.filter(task => {
            const deadline = new Date(task.normativeDeadline);
            return deadline < now && task.status !== 'Выполнена' && task.status !== 'Завершена';
        });
        setOverdueCount(overdue.length);

        // Calculate expiring soon
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        const expiring = userTasks.filter(task => {
            if (task.status === 'Выполнена' || task.status === 'Завершена') return false;
            const deadline = new Date(task.normativeDeadline);
            deadline.setHours(0, 0, 0, 0);
            return deadline >= tomorrow && deadline < dayAfterTomorrow;
        });
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

        // Calculate stats
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



    // Helpers
    const getDetailedStatusColor = (status: string): string => {
        const s = status.toLowerCase();
        if (s.includes('открыт') || s.includes('active')) return '#4CAF50';
        if (s.includes('смр') || s.includes('ремонт') || s.includes('renovation')) return '#F44336';
        if (s.includes('аудит')) return '#FF9800';
        if (s.includes('бюджет')) return '#FFC107';
        if (s.includes('утвержден')) return '#FFB74D';
        if (s.includes('договор')) return '#FB8C00';
        return '#E0E0E0';
    };

    const getRoleColor = (role: string): string => {
        const colors: { [key: string]: string } = {
            'МП': '#42A5F5',
            'МРиЗ': '#66BB6A',
            'БА': '#FFA726',
            'НОР': '#AB47BC',
            'РНР': '#EF5350'
        };
        return colors[role] || '#999';
    };

    const getStatusClass = (status: string): string => {
        return status.toLowerCase().replace(' ', '-');
    };

    const getDaysWord = (days: number): string => {
        const absDays = Math.abs(days);
        if (absDays % 10 === 1 && absDays % 100 !== 11) {
            return 'день';
        } else if ([2, 3, 4].includes(absDays % 10) && ![12, 13, 14].includes(absDays % 100)) {
            return 'дня';
        } else {
            return 'дней';
        }
    };

    const getDaysUntilDeadline = (task: ProjectTask) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const deadline = new Date(task.normativeDeadline);
        deadline.setHours(0, 0, 0, 0);

        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let text = '';
        let isOverdue = false;
        let isUrgent = false;

        if (diffDays < 0) {
            text = `${Math.abs(diffDays)} ${getDaysWord(Math.abs(diffDays))} назад`;
            isOverdue = true;
        } else if (diffDays === 0) {
            text = 'Сегодня';
            isUrgent = true;
        } else if (diffDays === 1) {
            text = 'Завтра';
            isUrgent = true;
        } else if (diffDays <= 3) {
            text = `${diffDays} ${getDaysWord(diffDays)}`;
            isUrgent = true;
        } else {
            text = `${diffDays} ${getDaysWord(diffDays)}`;
        }

        return { text, isOverdue, isUrgent };
    };

    const getTimeAgo = (timestamp: string): string => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        return `${diffDays} дн назад`;
    };

    // Navigation
    const navigateToTasksWithFilter = (status: string) => {
        navigate(`/tasks?status=${status}`);
    };

    const navigateToOverdueTasks = () => {
        navigate('/tasks?overdue=true');
    };

    const navigateToExpiringSoonTasks = () => {
        navigate('/tasks?expiringSoon=true');
    };

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
                        <div className="tasks-count">У вас {activeTasks.length} задач в работе</div>
                    </div>
                </div>
                <div className="quick-actions">
                    <Link to="/projects" className="action-btn primary">
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

                            {/* Detailed Stats List */}
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
                            <Link to="/tasks" className="link-simple">Все задачи →</Link>
                        </div>
                        <div className="task-list-modern">
                            {loading ? Array(5).fill(0).map((_, i) => (
                                <div key={i} className="skeleton skeleton-list-item"></div>
                            )) : (
                                <>
                                    {myTasks.slice(0, 6).map(task => {
                                        const deadlineInfo = getDaysUntilDeadline(task);
                                        return (
                                            <Link key={task.id} to={`/projects/${task.projectId}`} className="task-row">
                                                <div className={`task-status-line ${getStatusClass(task.status)}`}></div>
                                                <div className="task-main-info">
                                                    <div className="task-title">{task.name}</div>
                                                    <div className="task-meta">
                                                        <span>#{task.projectId}</span> • <span>{task.taskType}</span>
                                                    </div>
                                                </div>
                                                <div className="task-right">
                                                    <div className={`task-deadline-badge ${deadlineInfo.isUrgent ? 'urgent' : ''} ${deadlineInfo.isOverdue ? 'overdue' : ''}`}>
                                                        {deadlineInfo.text}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                    {myTasks.length === 0 && <div className="empty-text">Нет активных задач</div>}
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
                            <h3>Последняя активность</h3>
                        </div>
                        <div className="activity-feed">
                            {loading ? Array(6).fill(0).map((_, i) => (
                                <div key={i} className="skeleton-row">
                                    <div className="skeleton skeleton-circle"></div>
                                    <div className="skeleton skeleton-text long"></div>
                                </div>
                            )) : (
                                <>
                                    {recentActivities.slice(0, 10).map(activity => (
                                        <div key={activity.id} className="feed-item">
                                            <div className="feed-avatar" style={{ background: getRoleColor(activity.userRole) }}>
                                                {activity.userName.charAt(0)}
                                            </div>
                                            <div className="feed-content">
                                                <div className="feed-text">
                                                    <strong>{activity.userName}</strong> {activity.action}
                                                </div>
                                                {activity.projectName && (
                                                    <div className="feed-project-name">{activity.projectName}</div>
                                                )}
                                                <Link to={`/projects/${activity.projectId}`} className="feed-link">
                                                    {activity.taskName}
                                                </Link>
                                                <div className="feed-time">{getTimeAgo(activity.timestamp)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {recentActivities.length === 0 && <div className="empty-text">Нет активности</div>}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Hero;
