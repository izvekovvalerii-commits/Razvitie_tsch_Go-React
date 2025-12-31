import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Типы пользователей
export type UserRole = 'МП' | 'МРиЗ' | 'БА' | 'admin';

export interface User {
    id: number;
    name: string;
    role: UserRole;
    avatar: string;
}

interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    setCurrentUser: (user: User) => void;
    availableUsers: User[];
    logout: () => void;
}

import { authService } from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);

    useEffect(() => {
        // Load initial users
        const loadUsers = async () => {
            try {
                const users = await authService.getUsers();
                setAvailableUsers(users);
                // Auto-login as first user if no current user (dev convenience)
                if (!currentUser && users.length > 0) {
                    setCurrentUser(users[0]);
                }
            } catch (e) {
                console.error('Failed to load users:', e);
            }
        };
        loadUsers();
    }, []);

    const logout = () => {
        setCurrentUser(null);
    };

    const isAuthenticated = !!currentUser;

    return (
        <AuthContext.Provider value={{ currentUser, isAuthenticated, setCurrentUser, availableUsers, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
