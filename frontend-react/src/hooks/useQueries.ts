import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../services/projects';
import { storesService } from '../services/stores';
import { Project, Store } from '../types';

// Ключи запросов (Query Keys)
export const projectKeys = {
    all: ['projects'] as const,
    lists: () => [...projectKeys.all, 'list'] as const,
    list: (filters: string) => [...projectKeys.lists(), { filters }] as const,
    details: () => [...projectKeys.all, 'detail'] as const,
    detail: (id: number) => [...projectKeys.details(), id] as const,
};

export const storeKeys = {
    all: ['stores'] as const,
    lists: () => [...storeKeys.all, 'list'] as const,
};

// --- Projects Queries ---

export const useProjects = () => {
    return useQuery<Project[]>({
        queryKey: projectKeys.lists(),
        queryFn: projectsService.getProjects,
        staleTime: 1000 * 60 * 5, // 5 минут данные считаются свежими
    });
};

export const useProject = (id: number) => {
    return useQuery<Project | undefined>({
        queryKey: projectKeys.detail(id),
        queryFn: () => projectsService.getProjectById(id),
        enabled: !!id,
    });
};

export const useCreateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: projectsService.createProject,
        onSuccess: () => {
            // Инвалидируем (обновляем) список проектов после создания
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });
};

export const useUpdateProjectStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            projectsService.updateProjectStatus(id, status),
        onMutate: async ({ id, status }) => {
            // Optimistic Update: Мгновенно обновляем UI до ответа сервера

            // Отменяем активные запросы, чтобы они не перезаписали наше обновление
            await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

            // Сохраняем предыдущее состояние
            const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.lists());

            // Обновляем кэш
            queryClient.setQueryData<Project[]>(projectKeys.lists(), (old) => {
                if (!old) return [];
                return old.map((project) =>
                    project.id === id ? { ...project, status } : project
                );
            });

            // Возвращаем контекст для отката в случае ошибки
            return { previousProjects };
        },
        onError: (_err, _newProject, context) => {
            // Откатываем changes если произошла ошибка
            if (context?.previousProjects) {
                queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
            }
        },
        onSettled: () => {
            // В любом случае обновляем данные с сервера
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });
};

export const useDeleteProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: projectsService.deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });
};

// --- Stores Queries ---

export const useStores = () => {
    return useQuery<Store[]>({
        queryKey: storeKeys.lists(),
        queryFn: storesService.getStores,
        staleTime: 1000 * 60 * 60, // 1 час (магазины меняются редко)
    });
};
