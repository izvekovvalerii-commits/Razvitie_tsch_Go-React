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
            let errorMessage = `Failed to delete project ${id}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // If response body is not JSON, use status text
                errorMessage = `${errorMessage}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
    },

    updateProjectStatus: async (id: number, status: string): Promise<void> => {
        const response = await apiFetch(`/projects/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        if (!response.ok) {
            throw new Error(`Failed to update project status: ${response.statusText}`);
        }
    }
};
