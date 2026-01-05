import { TaskComment } from '../types';
import { apiFetch } from '../utils/api';
import { checkApiResponse } from '../utils/apiHelpers';

export const commentsService = {
    getTaskComments: async (taskId: number): Promise<TaskComment[]> => {
        try {
            const response = await apiFetch(`/comments/task/${taskId}`);
            if (!response.ok) throw new Error('Failed to fetch comments');
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    createComment: async (taskId: number, content: string): Promise<TaskComment> => {
        const response = await apiFetch('/comments', {
            method: 'POST',
            body: JSON.stringify({ taskId, content })
        });
        await checkApiResponse(response, 'Failed to create comment');
        return await response.json();
    }
};
