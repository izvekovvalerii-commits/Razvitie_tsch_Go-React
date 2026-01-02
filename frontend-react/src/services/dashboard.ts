import { apiFetch } from '../utils/api';
import { UserActivity } from '../types';

export const dashboardService = {
    getRecentActivity: async (): Promise<UserActivity[]> => {
        const response = await apiFetch('/dashboard/activity');
        if (!response.ok) {
            console.error('Failed to fetch activities');
            return [];
        }

        const data = await response.json();

        return data.map((item: any) => ({
            id: item.id,
            userId: item.userId,
            userName: item.user ? (item.user.name || `User #${item.user.id}`) : 'System',
            userRole: item.user ? item.user.role : '',
            action: item.action,
            taskId: item.entityType === 'task' ? item.entityId : 0,
            taskName: item.entityName,
            projectId: item.projectId || 0,
            // Handle potentially nested store name
            projectName: item.project?.store?.name || `Проект #${item.projectId || 0}`,
            timestamp: item.timestamp
        }));
    }
};
