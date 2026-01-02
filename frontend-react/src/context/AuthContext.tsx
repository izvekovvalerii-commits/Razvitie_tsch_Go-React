import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authService } from '../services/auth';

// Типы пользователей
export type UserRole = 'МП' | 'МРиЗ' | 'БА' | 'admin';

export interface User {
    id: number;
    name: string;
    role: UserRole;
    avatar: string;
    permissions?: string[];
}

interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    setCurrentUser: (user: User) => void;
    refreshCurrentUser: () => Promise<void>;
    availableUsers: User[];
    logout: () => void;
    isLoading: boolean;
    hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUserState] = useState<User | null>(null);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadUsers = async () => {
        try {
            const users = await authService.getUsers();
            setAvailableUsers(users);
            return users;
        } catch (e) {
            console.error('Failed to load users:', e);
            return [];
        }
    };

    useEffect(() => {
        // Load initial users
        const initUsers = async () => {
            const users = await loadUsers();
            // Auto-login as first user if no current user (dev convenience)
            const savedUserId = localStorage.getItem('user_id');
            if (savedUserId) {
                const found = users.find(u => u.id === Number(savedUserId));
                if (found) setCurrentUserState(found);
                else if (users.length > 0) setCurrentUserState(users[0]); // fallback
            } else if (!currentUser && users.length > 0) {
                setCurrentUserState(users[0]);
            }
            setIsLoading(false);
        };
        initUsers();
    }, []);

    const refreshCurrentUser = async () => {
        if (!currentUser) return;

        console.log('Refreshing current user permissions from backend...');
        const users = await loadUsers();
        const updatedUser = users.find(u => u.id === currentUser.id);
        if (updatedUser) {
            console.log('User permissions refreshed:', updatedUser.permissions);
            setCurrentUserState(updatedUser);
        }
    };

    const setCurrentUser = async (user: User) => {
        // Always fetch fresh permissions when setting user
        const users = await loadUsers();
        const freshUser = users.find(u => u.id === user.id);
        setCurrentUserState(freshUser || user);
    };

    const logout = () => {
        setCurrentUserState(null);
        localStorage.removeItem('user_id');
    };

    // Save user to local storage on change
    useEffect(() => {
        if (currentUser) {
            console.log('AuthContext: Current user updated', currentUser);
            if (currentUser.permissions) {
                console.log('AuthContext: Permissions:', currentUser.permissions);
            } else {
                console.warn('AuthContext: No permissions loaded for user');
            }
            localStorage.setItem('user_id', String(currentUser.id));
        }
    }, [currentUser]);

    const isAuthenticated = !!currentUser;

    const hasPermission = (perm: string) => {
        if (!currentUser || !currentUser.permissions) {
            return false;
        }
        return currentUser.permissions.includes(perm);
    };

    return (
        <AuthContext.Provider value={{ currentUser, isAuthenticated, setCurrentUser, refreshCurrentUser, availableUsers, logout, isLoading, hasPermission }}>
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
