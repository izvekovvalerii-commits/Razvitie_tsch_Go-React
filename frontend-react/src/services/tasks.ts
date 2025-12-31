import { ProjectTask } from '../types';
import { MOCK_USERS } from '../constants/users';

export const tasksService = {
    getAllTasks: async (): Promise<ProjectTask[]> => {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    getTasksByProjectId: async (projectId: number): Promise<ProjectTask[]> => {
        try {
            const response = await fetch(`/api/tasks/project/${projectId}`);
            if (!response.ok) throw new Error(`Failed to fetch tasks for project ${projectId}`);
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    updateTask: async (task: ProjectTask): Promise<ProjectTask> => {
        // Prepare body cleanly
        const { project, createdAt, updatedAt, ...cleanTask } = task as any;

        const response = await fetch(`/api/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanTask)
        });
        
        if (!response.ok) {
            let errorMsg = `Failed to update task ${task.id}`;
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
            } catch (e) {
                // ignore json parse error
            }
            throw new Error(errorMsg);
        }
        
        // Handle 204 No Content
        if (response.status === 204) {
            return task;
        }
        
        return await response.json();
    },

    createTask: async (task: ProjectTask): Promise<ProjectTask> => {
        const { project, createdAt, updatedAt, ...cleanTask } = task as any;

        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanTask)
        });
        
        if (!response.ok) {
            let errorMsg = 'Failed to create task';
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
            } catch (e) {
                 // ignore
            }
            throw new Error(errorMsg);
        }
        
        return await response.json();
    },

    updateTaskStatus: async (id: number, status: string): Promise<void> => {
        const response = await fetch(`/api/tasks/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
             let errorMsg = `Failed to update task status ${id}`;
             try {
                 const errorData = await response.json();
                 if (errorData.error) errorMsg = errorData.error;
             } catch (e) {
                 // ignore
             }
             throw new Error(errorMsg);
        }
    }
};
