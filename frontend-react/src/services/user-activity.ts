import { UserActivity } from '../types';

const MOCK_ACTIVITIES: UserActivity[] = [
    {
        id: 1,
        userId: 2,
        userName: 'Петров Петр (МП)',
        userRole: 'МП',
        action: 'изменил статус',
        taskId: 2,
        taskName: 'Планирование аудита',
        projectId: 102,
        timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
        id: 2,
        userId: 1,
        userName: 'Иванов Иван (БА)',
        userRole: 'БА',
        action: 'взял в работу',
        taskId: 3,
        taskName: 'Расчет бюджета',
        projectId: 103,
        timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    }
];

export const userActivityService = {
    getActivities: (): UserActivity[] => {
        return MOCK_ACTIVITIES;
    }
};
