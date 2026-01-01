import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading-spinner">Загрузка...</div>;
    }

    // In a real app, we might also check for token validity here
    if (!isAuthenticated) {
        return <Navigate to="/" replace />; // Redirect to Welcome (root) instead of login
    }

    return <Outlet />;
};

export default ProtectedRoute;
