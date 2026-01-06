import { useState, useMemo } from 'react';
import { useProjects, useStores, useCreateProject, useUpdateProjectStatus, useDeleteProject } from './useQueries';
import { Project } from '../types';
import { useDebounce } from './useDebounce';

export const useProjectsData = () => {
    // React Query Hooks
    const { data: projects = [], isLoading: loadingProjects, refetch } = useProjects();
    const { data: stores = [], isLoading: loadingStores } = useStores();

    const createMutation = useCreateProject();
    const updateStatusMutation = useUpdateProjectStatus();
    const deleteMutation = useDeleteProject();

    const loading = loadingProjects || loadingStores;

    // Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [quickFilter, setQuickFilter] = useState<'all' | 'active' | 'audit'>('all');

    // Debounced Search (300ms delay)
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Actions
    const createProject = async (projectData: Project) => {
        return await createMutation.mutateAsync(projectData);
    };

    const updateStatus = async (projectId: number, newStatus: string) => {
        return await updateStatusMutation.mutateAsync({ id: projectId, status: newStatus });
    };

    const deleteProject = async (id: number) => {
        return await deleteMutation.mutateAsync(id);
    };

    // Filter Logic
    const filteredProjects = useMemo(() => {
        let result = projects;

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

        // 4. Search (Debounced)
        if (debouncedSearchQuery) {
            const q = debouncedSearchQuery.toLowerCase();
            result = result.filter(p =>
                (p.gisCode && p.gisCode.toLowerCase().includes(q)) ||
                (p.address && p.address.toLowerCase().includes(q)) ||
                (p.store?.name && p.store.name.toLowerCase().includes(q))
            );
        }

        return result;
    }, [projects, selectedType, selectedStatus, debouncedSearchQuery, quickFilter]);

    return {
        // Data
        projects,
        stores,
        loading,
        filteredProjects,

        // Actions
        refresh: refetch,
        createProject,
        updateStatus,
        deleteProject,

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
