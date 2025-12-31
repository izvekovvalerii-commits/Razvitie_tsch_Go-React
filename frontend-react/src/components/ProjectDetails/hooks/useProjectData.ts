import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Project, ProjectTask, ProjectDocument } from '../../../types';
import { projectsService } from '../../../services/projects';
import { tasksService } from '../../../services/tasks';
import { STORE_OPENING_TASKS } from '../../../constants/store-opening-process.config';

export const useProjectData = () => {
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProjectData = async () => {
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const [proj, projTasks] = await Promise.all([
                projectsService.getProjectById(Number(id)),
                tasksService.getTasksByProjectId(Number(id))
            ]);

            if (proj) setProject(proj);

            if (projTasks) {
                // Сортировка задач по порядку в BPMN
                const sorted = projTasks.sort((a, b) => {
                    const indexA = STORE_OPENING_TASKS.findIndex(def => def.code === a.code);
                    const indexB = STORE_OPENING_TASKS.findIndex(def => def.code === b.code);

                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.id - b.id;
                });
                setTasks(sorted);
            }
        } catch (e) {
            console.error('Failed to load project data:', e);
            setError('Не удалось загрузить данные проекта');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjectData();
        // Документы будут загружаться из API, пока пусто при инициализации
        setProjectDocs([]);
    }, [id]);

    return {
        project,
        tasks,
        projectDocs,
        loading,
        error,
        setTasks,
        setProjectDocs,
        reloadData: loadProjectData
    };
};
