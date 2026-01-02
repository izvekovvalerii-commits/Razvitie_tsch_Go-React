import { User } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export const authService = {
    login: async (login: string): Promise<User> => {
        const response = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ login })
        });

        if (!response.ok) {
            throw new Error(`Login failed with status: ${response.status}`);
        }
        return response.json();
    },

    getUsers: async (): Promise<User[]> => {
        const response = await apiFetch('/auth/users');
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status}`);
        }
        return response.json();
    }
};
