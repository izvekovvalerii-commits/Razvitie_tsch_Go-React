import { apiFetch } from '../utils/api';

export interface TemplateTask {
    id: number;
    projectTemplateId: number;
    code: string;
    name: string;
    duration: number;
    stage: string;
    dependsOn: string[];
    responsibleRole: string;
    taskType: string;
    order: number;
    taskTemplateId?: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectTemplate {
    id: number;
    name: string;
    description: string;
    category: string;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
    tasks: TemplateTask[];
}

class ProjectTemplateService {
    // Получить все шаблоны
    async getAll(): Promise<ProjectTemplate[]> {
        try {
            const response = await apiFetch('/project-templates');
            if (!response.ok) {
                console.error('Failed to fetch templates:', response.statusText);
                return [];
            }
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Error fetching templates:', error);
            return [];
        }
    }

    // Получить только активные шаблоны
    async getActive(): Promise<ProjectTemplate[]> {
        try {
            const response = await apiFetch('/project-templates/active');
            if (!response.ok) {
                console.error('Failed to fetch active templates:', response.statusText);
                return [];
            }
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Error fetching active templates:', error);
            return [];
        }
    }

    // Получить шаблон по умолчанию
    async getDefault(): Promise<ProjectTemplate> {
        const response = await apiFetch('/project-templates/default');
        return response.json();
    }

    // Получить шаблон по ID
    async getById(id: number): Promise<ProjectTemplate> {
        const response = await apiFetch(`/project-templates/${id}`);
        return response.json();
    }

    // Создать новый шаблон
    async create(template: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
        const response = await apiFetch('/project-templates', {
            method: 'POST',
            body: JSON.stringify(template),
        });
        return response.json();
    }

    // Обновить шаблон
    async update(id: number, template: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
        const response = await apiFetch(`/project-templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(template),
        });
        return response.json();
    }

    // Удалить шаблон
    async delete(id: number): Promise<void> {
        await apiFetch(`/project-templates/${id}`, {
            method: 'DELETE',
        });
    }

    // Установить шаблон по умолчанию
    async setDefault(id: number): Promise<void> {
        await apiFetch(`/project-templates/${id}/set-default`, {
            method: 'POST',
        });
    }

    // Клонировать шаблон
    async clone(id: number, name: string): Promise<ProjectTemplate> {
        const response = await apiFetch(`/project-templates/${id}/clone`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        return response.json();
    }

    // Обновить задачу в шаблоне
    async updateTask(templateId: number, taskId: number, task: Partial<TemplateTask>): Promise<void> {
        await apiFetch(`/project-templates/${templateId}/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(task),
        });
    }

    // Добавить задачу в шаблон из TaskDefinition
    async addTask(templateId: number, taskDefinitionId: number): Promise<TemplateTask> {
        const response = await apiFetch(`/project-templates/${templateId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({ taskDefinitionId }),
        });
        return response.json();
    }

    // Добавить кастомную задачу в шаблон
    async addCustomTask(templateId: number, task: Partial<TemplateTask>): Promise<TemplateTask> {
        const response = await apiFetch(`/project-templates/${templateId}/tasks/custom`, {
            method: 'POST',
            body: JSON.stringify(task),
        });
        return response.json();
    }

    // Удалить задачу из шаблона
    async deleteTask(templateId: number, taskId: number): Promise<void> {
        await apiFetch(`/project-templates/${templateId}/tasks/${taskId}`, {
            method: 'DELETE',
        });
    }

    // Получить список уникальных задач из всех шаблонов (включая стандартные)
    async getKnownTasks(): Promise<any[]> {
        const response = await apiFetch('/project-templates/known-tasks');
        return response.json();
    }
}

export const projectTemplateService = new ProjectTemplateService();
