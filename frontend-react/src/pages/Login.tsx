import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

// Role color configuration
const ROLE_COLORS: Record<string, { gradient: string; glow: string; accent: string }> = {
    'МП': {
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        glow: 'rgba(59, 130, 246, 0.5)',
        accent: '#3B82F6'
    },
    'МРиЗ': {
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        glow: 'rgba(16, 185, 129, 0.5)',
        accent: '#10B981'
    },
    'БА': {
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        glow: 'rgba(139, 92, 246, 0.5)',
        accent: '#8B5CF6'
    },
    'ADMIN': {
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        glow: 'rgba(245, 158, 11, 0.5)',
        accent: '#F59E0B'
    }
};

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setCurrentUser, currentUser, availableUsers } = useAuth();
    const [isLoaded, setIsLoaded] = useState(false);

    // Trigger entrance animation
    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // If already logged in, redirect
    useEffect(() => {
        if (currentUser) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const handleLogin = (user: any) => {
        setCurrentUser(user);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
    };

    const getRoleIcon = (role: string) => {
        const icons: Record<string, string> = {
            'МП': '🔍',
            'МРиЗ': '📊',
            'БА': '⚙️',
            'ADMIN': '👑'
        };
        return icons[role] || '👤';
    };

    const getRoleColors = (role: string) => {
        return ROLE_COLORS[role] || ROLE_COLORS['МП'];
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            'МП': 'Менеджер проекта',
            'МРиЗ': 'Менеджер развития и закупок',
            'БА': 'Бизнес-аналитик',
            'ADMIN': 'Администратор'
        };
        return labels[role] || role;
    };

    return (
        <div className="login-overlay">
            {/* Animated background particles */}
            <div className="login-particles">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`particle particle-${i + 1}`} />
                ))}
            </div>

            <div className={`login-modal ${isLoaded ? 'loaded' : ''}`}>
                {/* Glassmorphism decorative elements */}
                <div className="glass-orb glass-orb-1" />
                <div className="glass-orb glass-orb-2" />

                {/* Header */}
                <div className="login-header">
                    <div className="logo">
                        <div className="logo-glow" />
                        <img
                            src="/images/chizhik_transparent.png"
                            alt="Чижик"
                            className="chizhik-logo"
                        />
                    </div>
                    <h2 className="portal-title">Портал Развития</h2>

                    <p className="subtitle">Выберите пользователя для входа</p>
                </div>

                {/* Users Grid */}
                <div className="users-grid">
                    {availableUsers.map((user, index) => {
                        const colors = getRoleColors(user.role);


                        return (
                            <div
                                key={user.id}
                                className="user-card"
                                onClick={() => handleLogin(user)}
                                style={{
                                    '--card-index': index,
                                    '--role-accent': colors.accent,
                                    '--role-glow': colors.glow
                                } as React.CSSProperties}
                            >
                                {/* Role accent line */}
                                <div
                                    className="role-accent-line"
                                    style={{ background: colors.gradient }}
                                />

                                {/* User icon with role gradient */}
                                <div
                                    className="user-icon"
                                    style={{
                                        background: colors.gradient,
                                        boxShadow: `0 4px 16px ${colors.glow}`
                                    }}
                                >
                                    <span className="icon-emoji">{getRoleIcon(user.role)}</span>
                                    <div className="icon-ring" style={{ borderColor: colors.accent }} />
                                </div>

                                {/* User info */}
                                <div className="user-info">
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-role">
                                        <span
                                            className="role-badge"
                                            style={{
                                                background: `${colors.accent}15`,
                                                color: colors.accent
                                            }}
                                        >
                                            {user.role}
                                        </span>
                                        <span className="role-description">{getRoleLabel(user.role)}</span>
                                    </div>
                                </div>

                                {/* Arrow with animation */}
                                <div className="login-arrow">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M5 12H19M19 12L12 5M19 12L12 19"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>

                                {/* Hover glow effect */}
                                <div className="card-glow" style={{ background: colors.glow }} />


                            </div>
                        );
                    })}

                    {availableUsers.length === 0 && (
                        <div className="loading-users">
                            <div className="loading-spinner" />
                            <p>Загрузка пользователей...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <div className="footer-divider">
                        <span className="divider-line" />
                        <span className="divider-icon">🐦</span>
                        <span className="divider-line" />
                    </div>
                    <p className="footer-text">Портал Развития • ТС Чижик</p>
                    <p className="footer-version">v2.0</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
