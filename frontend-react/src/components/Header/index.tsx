import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import './Header.css';

export const Header: React.FC = () => {
    const { currentUser, logout, hasPermission } = useAuth();
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification
    } = useNotifications(currentUser?.id);

    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const menuItems = [
        { label: 'Магазины', link: '/stores' },
        { label: 'Проекты', link: '/projects' },
        { label: 'Задачи', link: '/tasks' }
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };

        if (showNotifications) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showNotifications]);

    const handleToggleNotifications = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowNotifications(!showNotifications);
    };

    const handleMarkAsRead = (notification: any) => {
        console.log('🔔 Notification clicked:', notification);
        console.log('📋 relatedTaskId:', notification.relatedTaskId);
        console.log('📁 relatedProjectId:', notification.relatedProjectId);

        markAsRead(notification.id);

        // If notification is related to a specific task
        if (notification.relatedTaskId && notification.relatedProjectId) {
            console.log('✅ Navigating to task:', `/projects/${notification.relatedProjectId}?editTask=${notification.relatedTaskId}`);
            navigate(`/projects/${notification.relatedProjectId}?editTask=${notification.relatedTaskId}`);
            setShowNotifications(false);
        }
        // If notification is related only to a project
        else if (notification.relatedProjectId) {
            console.log('✅ Navigating to project:', `/projects/${notification.relatedProjectId}`);
            navigate(`/projects/${notification.relatedProjectId}`);
            setShowNotifications(false);
        } else {
            console.log('⚠️ No navigation - notification has no related entities');
        }
    };

    const handleDeleteNotification = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteNotification(id);
    };

    const getTimeAgo = (date: string | Date): string => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;
        if (hours < 24) return `${hours} ч назад`;
        return `${days} дн назад`;
    };

    const getRoleColor = (role: string): string => {
        const colors: { [key: string]: string } = {
            'МП': '#42A5F5',
            'МРиЗ': '#66BB6A',
            'БА': '#FFA726'
        };
        return colors[role] || '#999';
    };

    return (
        <header className="header">
            <div className="header-container">
                {/* Logo Section */}
                <Link to="/home" className="logo">
                    <div className="logo-icon">
                        <img src="/images/chizhik_transparent.png" alt="Чижик" />
                    </div>
                    <span className="logo-text">Портал Развития</span>
                </Link>

                {/* Navigation */}
                <nav className="nav-menu">
                    {menuItems.map(item => (
                        <NavLink
                            key={item.link}
                            to={item.link}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            {item.label}
                        </NavLink>
                    ))}

                    {hasPermission('role:manage') && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => `nav-item ${isActive || location.pathname.startsWith('/admin') ? 'active' : ''}`}
                        >
                            Администрирование
                        </NavLink>
                    )}
                </nav>

                {/* Right Actions Panel */}
                <div className="header-actions">
                    {/* Icon Actions */}
                    <div className="action-icons">
                        <div className="notification-wrapper" ref={notificationRef}>
                            <button className="icon-btn notification-btn" onClick={handleToggleNotifications} title="Уведомления">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="notifications-dropdown">
                                    <div className="notifications-header">
                                        <h3>Уведомления</h3>
                                        <div className="notifications-actions">
                                            {unreadCount > 0 && (
                                                <button className="text-btn" onClick={() => markAllAsRead()}>
                                                    Прочитать все
                                                </button>
                                            )}
                                            {notifications.length > 0 && (
                                                <button className="text-btn" onClick={() => clearAll()}>
                                                    Очистить
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {notifications.length > 0 ? (
                                        <div className="notifications-list">
                                            {notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                                                    onClick={() => handleMarkAsRead(notification)}
                                                >
                                                    <div className="notification-icon">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                                                        </svg>
                                                    </div>
                                                    <div className="notification-content">
                                                        <div className="notification-message">{notification.message}</div>
                                                        <div className="notification-time">{getTimeAgo(notification.date)}</div>
                                                    </div>
                                                    <button
                                                        className="notification-delete"
                                                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="notifications-empty">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                            </svg>
                                            <p>Нет уведомлений</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Profile */}
                    {currentUser && (
                        <div className="user-profile">
                            <div className="user-info-header">
                                <span className="user-name">{currentUser.name}</span>
                                <span className="user-role" style={{ color: getRoleColor(currentUser.role) }}>
                                    {currentUser.role}
                                </span>
                            </div>
                            <div className="user-avatar" style={{ background: getRoleColor(currentUser.role) }}>
                                {currentUser.name.charAt(0)}
                            </div>
                            <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }} title="Выйти">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
