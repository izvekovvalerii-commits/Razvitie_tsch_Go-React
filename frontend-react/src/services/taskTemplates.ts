import { apiFetch } from '../utils/api';
import { TaskTemplate, CreateTaskTemplateRequest } from '../types/taskTemplate';

export const taskTemplateService = {
    getAll: async (): Promise<TaskTemplate[]> => {
        const res = await apiFetch('/task-templates');
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
    },

    getActive: async (): Promise<TaskTemplate[]> => {
        const res = await apiFetch('/task-templates/active');
        if (!res.ok) throw new Error('Failed to fetch active templates');
        return res.json();
    },

    getByCategory: async (category: string): Promise<TaskTemplate[]> => {
        const res = await apiFetch(`/task-templates/category?category=${encodeURIComponent(category)}`);
        if (!res.ok) throw new Error('Failed to fetch templates by category');
        return res.json();
    },

    getById: async (id: number): Promise<TaskTemplate> => {
        const res = await apiFetch(`/task-templates/${id}`);
        if (!res.ok) throw new Error('Failed to fetch template');
        return res.json();
    },

    create: async (data: CreateTaskTemplateRequest): Promise<TaskTemplate> => {
        const res = await apiFetch('/task-templates', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create template');
        }
        return res.json();
    },

    update: async (id: number, data: CreateTaskTemplateRequest): Promise<TaskTemplate> => {
        const res = await apiFetch(`/task-templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update template');
        }
        return res.json();
    },

    delete: async (id: number): Promise<void> => {
        const res = await apiFetch(`/task-templates/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete template');
    },

    clone: async (id: number, newCode: string, newName: string): Promise<TaskTemplate> => {
        const res = await apiFetch(`/task-templates/${id}/clone`, {
            method: 'POST',
            body: JSON.stringify({ newCode, newName })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to clone template');
        }
        return res.json();
    },

    toggleStatus: async (id: number): Promise<void> => {
        const res = await apiFetch(`/task-templates/${id}/toggle`, {
            method: 'PATCH'
        });
        if (!res.ok) throw new Error('Failed to toggle template status');
    }
};
