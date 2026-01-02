import { ProjectTask } from '../types';
import { apiFetch } from '../utils/api';

// Helper to parse dependsOn from JSON string to array
const parseTask = (task: any): ProjectTask => {
    return {
        ...task,
        dependsOn: task.dependsOn && typeof task.dependsOn === 'string'
            ? JSON.parse(task.dependsOn)
            : task.dependsOn
    };
};

export const tasksService = {
    getAllTasks: async (): Promise<ProjectTask[]> => {
        try {
            const response = await apiFetch('/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');
            const tasks = await response.json();
            return tasks.map(parseTask);
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    getTasksByProjectId: async (projectId: number): Promise<ProjectTask[]> => {
        try {
            const response = await apiFetch(`/tasks/project/${projectId}`);
            if (!response.ok) throw new Error(`Failed to fetch tasks for project ${projectId}`);
            const tasks = await response.json();
            return tasks.map(parseTask);
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    updateTask: async (task: ProjectTask): Promise<ProjectTask> => {
        const { project, createdAt, updatedAt, ...cleanTask } = task as any;

        // Convert dependsOn array to JSON string for backend
        const taskToSend = {
            ...cleanTask,
            dependsOn: Array.isArray(cleanTask.dependsOn)
                ? JSON.stringify(cleanTask.dependsOn)
                : cleanTask.dependsOn
        };

        const response = await apiFetch(`/tasks/${task.id}`, {
            method: 'PUT',
            body: JSON.stringify(taskToSend)
        });

        if (!response.ok) {
            let errorMsg = `Failed to update task ${task.id}`;
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        if (response.status === 204) return task;
        const updatedTask = await response.json();
        return parseTask(updatedTask);
    },

    createTask: async (task: ProjectTask): Promise<ProjectTask> => {
        const { project, createdAt, updatedAt, ...cleanTask } = task as any;

        // Convert dependsOn array to JSON string for backend
        const taskToSend = {
            ...cleanTask,
            dependsOn: Array.isArray(cleanTask.dependsOn)
                ? JSON.stringify(cleanTask.dependsOn)
                : cleanTask.dependsOn
        };

        const response = await apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskToSend)
        });

        if (!response.ok) {
            let errorMsg = 'Failed to create task';
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const createdTask = await response.json();
        return parseTask(createdTask);
    },

    updateTaskStatus: async (id: number, status: string): Promise<void> => {
        const response = await apiFetch(`/tasks/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            let errorMsg = `Failed to update task status ${id}`;
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
            } catch (e) { }
            throw new Error(errorMsg);
        }
    }
};
