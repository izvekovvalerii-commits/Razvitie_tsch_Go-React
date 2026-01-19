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

        return data;
    }
};
