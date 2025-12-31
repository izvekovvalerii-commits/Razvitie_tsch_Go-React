import { useState } from 'react';
import { Notification } from '../types';

export const useNotifications = (userId?: number) => {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 1,
            message: 'Новая задача назначена на вас',
            date: new Date(),
            isRead: false,
            relatedTaskId: 101
        },
        {
            id: 2,
            message: 'Проект "Открытие магазина" обновлен',
            date: new Date(Date.now() - 3600000), // 1 hour ago
            isRead: true,
            relatedProjectId: 5
        }
    ]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const deleteNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
    };
};
