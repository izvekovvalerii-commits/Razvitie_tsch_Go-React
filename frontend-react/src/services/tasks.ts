import { ProjectTask, UserActivity } from '../types';
import { apiFetch } from '../utils/api';
import { checkApiResponse, serializeArrayField, deserializeArrayField } from '../utils/apiHelpers';

// Helper to parse dependsOn from JSON string to array
const parseTask = (task: any): ProjectTask => {
    return {
        ...task,
        dependsOn: deserializeArrayField(task.dependsOn)
    };
};

// Helper to prepare task for sending to backend
const preparTaskForApi = (task: any) => {
    const { project, createdAt, updatedAt, ...cleanTask } = task;

    return {
        ...cleanTask,
        dependsOn: serializeArrayField(cleanTask.dependsOn)
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
        const taskToSend = preparTaskForApi(task);

        const response = await apiFetch(`/tasks/${task.id}`, {
            method: 'PUT',
            body: JSON.stringify(taskToSend)
        });

        await checkApiResponse(response, `Failed to update task ${task.id}`);

        if (response.status === 204) return task;
        const updatedTask = await response.json();
        return parseTask(updatedTask);
    },

    createTask: async (task: ProjectTask): Promise<ProjectTask> => {
        const taskToSend = preparTaskForApi(task);

        const response = await apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskToSend)
        });

        await checkApiResponse(response, 'Failed to create task');

        const createdTask = await response.json();
        return parseTask(createdTask);
    },

    updateTaskStatus: async (id: number, status: string): Promise<void> => {
        const response = await apiFetch(`/tasks/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });

        await checkApiResponse(response, `Failed to update task status ${id}`);
    },

    getTaskHistory: async (taskId: number): Promise<UserActivity[]> => {
        try {
            const response = await apiFetch(`/tasks/${taskId}/history`);
            if (!response.ok) throw new Error('Failed to fetch task history');
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    }
};
