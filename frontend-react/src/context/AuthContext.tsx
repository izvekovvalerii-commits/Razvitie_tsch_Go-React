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
    isLoading: boolean;
}

import { authService } from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load initial users
        const loadUsers = async () => {
            try {
                const users = await authService.getUsers();
                setAvailableUsers(users);
                // Auto-login as first user if no current user (dev convenience)
                // In prod, check localStorage token here
                const savedUserId = localStorage.getItem('user_id');
                if (savedUserId) {
                    const found = users.find(u => u.id === Number(savedUserId));
                    if (found) setCurrentUser(found);
                    else if (users.length > 0) setCurrentUser(users[0]); // fallback
                } else if (!currentUser && users.length > 0) {
                    setCurrentUser(users[0]);
                }
            } catch (e) {
                console.error('Failed to load users:', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUsers();
    }, []);

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('user_id');
    };

    // Save user to local storage on change
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('user_id', String(currentUser.id));
        }
    }, [currentUser]);

    const isAuthenticated = !!currentUser;

    return (
        <AuthContext.Provider value={{ currentUser, isAuthenticated, setCurrentUser, availableUsers, logout, isLoading }}>
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
