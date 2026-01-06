import { useState, useEffect, useMemo } from 'react';
import { projectsService } from '../services/projects';
import { storesService } from '../services/stores';
import { Project, Store } from '../types';
import { useAuth } from './useAuth';
import { useDebounce } from './useDebounce';

export const useProjectsData = () => {
    const { currentUser } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [quickFilter, setQuickFilter] = useState<'all' | 'active' | 'audit'>('all');

    // Debounced Search (300ms delay)
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pData, sData] = await Promise.all([
                projectsService.getProjects(),
                storesService.getStores()
            ]);
            setProjects(pData);
            setStores(sData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const createProject = async (projectData: Project) => {
        try {
            const created = await projectsService.createProject(projectData);
            setProjects(prev => [...prev, created]);
            return created;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const updateStatus = async (projectId: number, newStatus: string) => {
        // Optimistic update
        const oldProjects = [...projects];
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));

        try {
            await projectsService.updateProjectStatus(projectId, newStatus);
        } catch (e) {
            console.error(e);
            setProjects(oldProjects);
            alert('Не удалось обновить статус');
        }
    };

    const filteredProjects = useMemo(() => {
        let result = projects;

        // 1. Quick Filter
        // 1. Quick Filter
        if (quickFilter === 'active') {
            // Включаем все статусы, кроме завершенных и отмененных
            result = result.filter(p => !['Открыт', 'Закрыт', 'Архив', 'Слетел'].includes(p.status));
        } else if (quickFilter === 'audit') {
            // Включаем статусы, связанные с аудитом
            result = result.filter(p => ['Подготовка к аудиту', 'Аудит объекта'].includes(p.status));
        }

        // 2. Type Filter
        if (selectedType) {
            result = result.filter(p => p.projectType === selectedType);
        }

        // 3. Status Filter
        if (selectedStatus) {
            result = result.filter(p => p.status === selectedStatus);
        }

        // 5. Search (Debounced)
        if (debouncedSearchQuery) {
            const q = debouncedSearchQuery.toLowerCase();
            result = result.filter(p =>
                (p.gisCode && p.gisCode.toLowerCase().includes(q)) ||
                (p.address && p.address.toLowerCase().includes(q)) ||
                (p.store?.name && p.store.name.toLowerCase().includes(q))
            );
        }

        return result;
    }, [projects, selectedType, selectedStatus, debouncedSearchQuery, quickFilter, currentUser]);

    return {
        // Data
        projects,
        stores,
        loading,
        filteredProjects,

        // Actions
        refresh: fetchData,
        createProject,
        updateStatus,

        // Filter State
        filters: {
            searchQuery,
            selectedType,
            selectedStatus,
            quickFilter
        },
        setFilters: {
            setSearchQuery,
            setSelectedType,
            setSelectedStatus,
            setQuickFilter
        }
    };
};
