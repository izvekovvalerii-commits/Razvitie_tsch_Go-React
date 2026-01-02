import { Project } from '../types';
import { apiFetch } from '../utils/api';

export const projectsService = {
    getProjects: async (): Promise<Project[]> => {
        try {
            const response = await apiFetch('/projects');
            if (!response.ok) {
                console.error(`Error fetching projects: ${response.status}`);
                return [];
            }
            const data = await response.json();
            return data;
        } catch (e) {
            console.error('Network error fetching projects:', e);
            return [];
        }
    },

    createProject: async (project: Project): Promise<Project> => {
        const response = await apiFetch('/projects', {
            method: 'POST',
            body: JSON.stringify(project)
        });
        if (!response.ok) {
            throw new Error(`Failed to create project: ${response.statusText}`);
        }
        return await response.json();
    },

    getProjectById: async (id: number): Promise<Project | undefined> => {
        try {
            const response = await apiFetch(`/projects/${id}`);
            if (!response.ok) {
                if (response.status === 404) return undefined;
                throw new Error(`Failed to fetch project ${id}`);
            }
            return await response.json();
        } catch (e) {
            console.error(`Error fetching project ${id}:`, e);
            return undefined;
        }
    },

    deleteProject: async (id: number): Promise<void> => {
        const response = await apiFetch(`/projects/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to delete project ${id}: ${response.statusText}`);
        }
    }
};
