import { User } from '../context/AuthContext';

export const authService = {
    login: async (login: string): Promise<User> => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login })
        });

        if (!response.ok) {
            throw new Error(`Login failed with status: ${response.status}`);
        }
        return response.json();
    },

    getUsers: async (): Promise<User[]> => {
        const response = await fetch('/api/auth/users');
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status}`);
        }
        return response.json();
    }
};
