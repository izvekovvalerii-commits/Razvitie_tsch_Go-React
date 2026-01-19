import { apiFetch } from '../utils/api';
import type { Request, CreateRequestDto } from '../types';

const API_URL = '/requests';

export const requestsService = {
    // Получить все заявки или с фильтрацией
    getAll: async (filters?: {
        createdBy?: number;
        assignedTo?: number;
        status?: string;
    }): Promise<Request[]> => {
        try {
            const params = new URLSearchParams();
            if (filters?.createdBy) params.append('createdBy', filters.createdBy.toString());
            if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo.toString());
            if (filters?.status) params.append('status', filters.status);

            const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;
            const response = await apiFetch(url);

            if (!response.ok) {
                console.error('Failed to fetch requests:', response.status);
                return [];
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching requests:', error);
            return [];
        }
    },

    // Получить заявку по ID
    getById: async (id: number): Promise<Request | null> => {
        try {
            const response = await apiFetch(`${API_URL}/${id}`);

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Failed to fetch request ${id}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching request:', error);
            return null;
        }
    },

    // Создать новую заявку
    create: async (request: CreateRequestDto): Promise<Request | null> => {
        try {
            const response = await apiFetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create request');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating request:', error);
            throw error;
        }
    },

    // Обновить заявку
    update: async (id: number, request: Partial<Request>): Promise<Request | null> => {
        try {
            const response = await apiFetch(`${API_URL}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error('Failed to update request');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating request:', error);
            throw error;
        }
    },

    // Удалить заявку
    delete: async (id: number, userId: number): Promise<void> => {
        try {
            const response = await apiFetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete request');
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            throw error;
        }
    },

    // Взять заявку в работу
    takeInWork: async (id: number, userId: number): Promise<Request | null> => {
        try {
            const response = await apiFetch(`${API_URL}/${id}/take`, {
                method: 'PUT',
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to take request in work');
            }

            return await response.json();
        } catch (error) {
            console.error('Error taking request in work:', error);
            throw error;
        }
    },

    // Ответить на заявку
    answer: async (id: number, userId: number, response: string): Promise<Request | null> => {
        try {
            const res = await apiFetch(`${API_URL}/${id}/answer`, {
                method: 'PUT',
                body: JSON.stringify({ userId, response })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to answer request');
            }

            return await res.json();
        } catch (error) {
            console.error('Error answering request:', error);
            throw error;
        }
    },

    // Закрыть заявку
    close: async (id: number, userId: number): Promise<Request | null> => {
        try {
            const response = await apiFetch(`${API_URL}/${id}/close`, {
                method: 'PUT',
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to close request');
            }

            return await response.json();
        } catch (error) {
            console.error('Error closing request:', error);
            throw error;
        }
    },

    // Отклонить заявку
    reject: async (id: number, userId: number, reason: string): Promise<Request | null> => {
        try {
            const response = await apiFetch(`${API_URL}/${id}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ userId, reason })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to reject request');
            }

            return await response.json();
        } catch (error) {
            console.error('Error rejecting request:', error);
            throw error;
        }
    },

    // Получить статистику по заявкам пользователя
    getUserStats: async (userId: number): Promise<{ active: number; overdue: number } | null> => {
        try {
            const response = await apiFetch(`${API_URL}/stats/${userId}`);

            if (!response.ok) {
                console.error('Failed to fetch user stats:', response.status);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return null;
        }
    }
};
