import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { useWebSocket } from './useWebSocket';
import { apiFetch } from '../utils/api';

export const useNotifications = (userId?: number) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            return;
        }

        apiFetch(`/notifications?userId=${userId}`)
            .then(res => res.json())
            .then(data => {
                if (data.notifications) {
                    const mapped = data.notifications.map((n: any) => ({
                        id: n.id,
                        message: n.message,
                        date: new Date(n.createdAt),
                        isRead: n.isRead,
                        type: n.type,
                        relatedProjectId: n.relatedProjectId,
                        relatedTaskId: n.relatedTaskId
                    }));
                    setNotifications(mapped);
                }
            })
            .catch(err => console.error("Failed to fetch notifications", err));
    }, [userId]);

    const handleCallback = useCallback((msg: any) => {
        if (msg.type === 'NOTIFICATION_NEW') {
            const n = msg.payload;
            const newNotif: Notification = {
                id: n.id,
                message: n.message,
                date: new Date(n.createdAt),
                isRead: n.isRead,
                type: n.type,
                relatedProjectId: n.relatedProjectId,
                relatedTaskId: n.relatedTaskId
            };
            setNotifications(prev => [newNotif, ...prev]);
        }
    }, []);

    useWebSocket(handleCallback, userId);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: number) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        apiFetch(`/notifications/${id}/read`, { method: 'POST' }).catch(console.error);
    };

    const markAllAsRead = () => {
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        if (userId) {
            apiFetch(`/notifications/read-all?userId=${userId}`, { method: 'POST' }).catch(console.error);
        }
    };

    const clearAll = () => {
        // Optimistic: clear immediately
        setNotifications([]);
        // Actually delete from DB
        if (userId) {
            apiFetch(`/notifications/delete-all?userId=${userId}`, {
                method: 'DELETE'
            }).catch(err => {
                console.error('Failed to delete all notifications', err);
                // Could reload notifications here on error
            });
        }
    };

    const deleteNotification = (id: number) => {
        // Optimistic: remove from UI immediately
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Actually delete from DB with ownership verification
        apiFetch(`/notifications/${id}?userId=${userId}`, {
            method: 'DELETE'
        }).catch(err => {
            console.error('Failed to delete notification', err);
            // Could reload notifications here on error
        });
    };

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification
    };
};
