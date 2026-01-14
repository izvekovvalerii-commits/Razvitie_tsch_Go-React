import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectTask, ProjectDocument, TeamMember, User } from '../types';
import { projectsService } from '../services/projects';
import { tasksService } from '../services/tasks';
import { documentsService } from '../services/documents';
import { useWebSocket } from './useWebSocket';

export const useProjectData = (projectId: string | undefined, currentUser: User | null) => {
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([]);
    const [projectTeam, setProjectTeam] = useState<TeamMember[]>([]);

    // WebSocket Updates
    useWebSocket((msg) => {
        if (msg.type === 'TASK_UPDATED' && projectId) {
            const updatedTask = msg.payload;
            if (updatedTask.projectId === Number(projectId)) {
                setTasks(prev => {
                    const exists = prev.find(t => t.id === updatedTask.id);
                    if (exists) {
                        return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
                    }
                    return prev;
                });
            }
        }
    });

    // Helper: Calculate Team
    const calculateProjectTeam = useCallback((currentTasks: ProjectTask[]) => {
        const teamMap = new Map<string, TeamMember>();
        const getPhone = (name: string) => {
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            const rand = Math.abs(hash);
            return `+7 (9${rand % 9 + 1}) ${(Math.abs(hash * 13) % 900) + 100}-${(Math.abs(hash * 7) % 90) + 10}-${(Math.abs(hash * 23) % 90) + 10}`;
        };
        const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];
        const getColor = (name: string) => {
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
        };

        const createMember = (name: string, role: string): TeamMember => ({
            name, role, phone: getPhone(name), initials: getInitials(name), color: getColor(name)
        });

        currentTasks.forEach(task => {
            if (task.responsible && task.responsible.includes(' ')) {
                let role = 'Исполнитель';
                if (task.responsible.includes('Петров')) role = 'МП';
                if (task.responsible.includes('Сидорова')) role = 'МРиЗ';
                if (task.responsible.includes('Смирнов')) role = 'БА';
                teamMap.set(task.responsible, createMember(task.responsible, role));
            } else if (['МП', 'МРиЗ', 'БА'].includes(task.responsible)) {
                const roleToUser: any = {
                    'МП': { name: 'Иван Петров', role: 'МП' },
                    'МРиЗ': { name: 'Мария Сидорова', role: 'МРиЗ' },
                    'БА': { name: 'Алексей Смирнов', role: 'БА' }
                };
                if (roleToUser[task.responsible]) {
                    const u = roleToUser[task.responsible];
                    teamMap.set(u.name, createMember(u.name, u.role));
                }
            }
        });
        setProjectTeam(Array.from(teamMap.values()));
    }, []);

    const refreshDocs = useCallback(async () => {
        if (!projectId) return;
        try {
            const docs = await documentsService.getByProject(Number(projectId));
            setProjectDocs(docs);
        } catch (e) {
            console.error('Failed to load documents:', e);
        }
    }, [projectId]);

    const refresh = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            // Load project and tasks in parallel
            const [proj, projTasks] = await Promise.all([
                projectsService.getProjectById(Number(projectId)),
                tasksService.getTasksByProjectId(Number(projectId))
            ]);

            // We no longer need dynamic workflow schema configuration
            // setWorkflowConfig(schema); 

            if (proj) setProject(proj);
            if (projTasks) {
                // Sort tasks by defined order field
                const sorted = projTasks.sort((a, b) => {
                    const orderA = a.order ?? 9999;
                    const orderB = b.order ?? 9999;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.id - b.id;
                });
                setTasks(sorted);
                calculateProjectTeam(projTasks);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [projectId, calculateProjectTeam]);

    useEffect(() => {
        refresh();
        refreshDocs();
    }, [refresh, refreshDocs]);

    const isUserResponsible = useCallback((task: ProjectTask) => {
        if (!currentUser) return false;
        if (task.responsible === currentUser.role) return true;
        if (task.responsible === currentUser.name) return true;
        if (currentUser.role === 'МП' && task.responsible.includes('Петров')) return true;
        if (currentUser.role === 'МРиЗ' && task.responsible.includes('Сидорова')) return true;
        if (currentUser.role === 'БА' && task.responsible.includes('Смирнов')) return true;
        return false;
    }, [currentUser]);

    return {
        project,
        tasks,
        setTasks, // Exposed for optimistic updates or manual changes
        loading,
        projectDocs,
        setProjectDocs,
        projectTeam,
        refresh,
        refreshDocs,
        isUserResponsible
    };
};
