import { useState } from 'react';
import { ProjectTask } from '../../../types';
import { tasksService } from '../../../services/tasks';
import { useApi } from '../../../hooks/useApi';

export const useTaskActions = (reloadData: () => Promise<void>) => {
    const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
    const [ganttSelectedTask, setGanttSelectedTask] = useState<ProjectTask | null>(null);
    const [newTask, setNewTask] = useState<Partial<ProjectTask>>({
        name: '',
        responsible: 'МП',
        status: 'Назначена',
        taskType: 'UserTask'
    });

    const { loading: creating, execute: executeCreate } = useApi(
        (task: ProjectTask) => tasksService.createTask(task),
        { 
            showSuccessToast: true,
            onSuccess: () => {
                setNewTask({ name: '', responsible: 'МП', status: 'Назначена', taskType: 'UserTask' });
                reloadData();
            }
        }
    );

    const { loading: updating, execute: executeUpdate } = useApi(
        (task: ProjectTask) => tasksService.updateTask(task),
        { 
            showSuccessToast: true,
            onSuccess: () => reloadData()
        }
    );

    const handleCreateTask = async (projectId: number) => {
        if (!newTask.name) {
            alert('Укажите название задачи');
            return;
        }

        const task: ProjectTask = {
            id: 0,
            projectId: projectId,
            name: newTask.name || '',
            status: 'Назначена',
            taskType: newTask.taskType || 'UserTask',
            responsible: newTask.responsible || 'МП',
            normativeDeadline: newTask.normativeDeadline || new Date(Date.now() + 86400000 * 2).toISOString(),
            createdAt: new Date().toISOString()
        };

        await executeCreate(task);
    };

    const handleUpdateTask = async () => {
        if (!selectedTask) return;
        await executeUpdate(selectedTask);
    };

    const handleCompleteTask = async () => {
        if (!selectedTask) return;

        // Валидация обязательных полей перед завершением
        const error = validateTaskCompletion(selectedTask);
        if (error) {
            alert(error);
            return;
        }

        // Сохраняем поля
        await tasksService.updateTask(selectedTask);

        // Меняем статус (триггерит workflow на backend)
        await tasksService.updateTaskStatus(selectedTask.id, 'Завершена');

        reloadData();
    };

    const validateTaskCompletion = (task: ProjectTask): string | null => {
        if (!task.code) return null;

        switch (task.code) {
            case 'TASK-PREP-AUDIT':
                if (!task.plannedAuditDate) return 'Укажите плановую дату аудита';
                if (!task.projectFolderLink) return 'Укажите ссылку на папку проекта';
                break;
            case 'TASK-AUDIT':
                if (!task.actualAuditDate) return 'Укажите фактическую дату аудита';
                break;
            case 'TASK-WASTE':
                if (!task.tboDocsLink) return 'Укажите ссылку на документы ТБО';
                if (!task.tboAgreementDate) return 'Укажите дату согласования';
                if (!task.tboRegistryDate) return 'Укажите дату внесения в реестр';
                break;
            // ... другие проверки
        }

        return null;
    };

    return {
        selectedTask,
        setSelectedTask,
        ganttSelectedTask,
        setGanttSelectedTask,
        newTask,
        setNewTask,
        handleCreateTask,
        handleUpdateTask,
        handleCompleteTask,
        creating,
        updating
    };
};
