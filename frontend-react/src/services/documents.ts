import { ProjectDocument } from '../types';
import { apiFetch } from '../utils/api';

export const documentsService = {
    upload: async (file: File, projectId: number, type: string, taskId?: number): Promise<ProjectDocument> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId.toString());
        formData.append('type', type);
        if (taskId) {
            formData.append('taskId', taskId.toString());
        }

        // Note: For FormData, we need to use native fetch with manual header
        const userId = localStorage.getItem('user_id');
        const response = await fetch('/api/documents/upload', {
            method: 'POST',
            headers: {
                ...(userId ? { 'X-User-ID': userId } : {}),
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Upload failed: ${response.status}`);
        }

        return response.json();
    },

    delete: async (id: number): Promise<void> => {
        const response = await apiFetch(`/documents/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`);
        }
    },

    getByProject: async (projectId: number): Promise<ProjectDocument[]> => {
        const response = await apiFetch(`/documents/project/${projectId}`);
        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
        }
        return response.json();
    }
};
