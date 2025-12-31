import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setCurrentUser, currentUser, availableUsers } = useAuth();

    // If already logged in, redirect
    useEffect(() => {
        if (currentUser) {
            navigate('/');
        }
        // Redirect if auth via query param or initial load happens
    }, [currentUser, navigate]);

    const handleLogin = (user: any) => {
        setCurrentUser(user);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
    };

    const getRoleIcon = (role: string) => {
        const icons: { [key: string]: string } = {
            'МП': '🔍',
            'МРиЗ': '📊',
            'БА': '⚙️'
        };
        return icons[role] || '👤';
    };

    return (
        <div className="login-overlay">
            <div className="login-modal">
                <div className="login-header">
                    <div className="logo">
                        <img src="/images/chizhik-bird.png" alt="Чижик" className="chizhik-logo" />
                    </div>
                    <h1>Добро пожаловать</h1>
                    <p className="subtitle">Выберите пользователя для входа</p>
                </div>

                {/* Quick Login Section */}
                <div className="users-grid">
                    {availableUsers.map(user => (
                        <div key={user.id} className="user-card" onClick={() => handleLogin(user)}>
                            <div className="user-icon" style={{ background: '#42A5F5' }}> {/* Default color or add color to backend model */}
                                {getRoleIcon(user.role)}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{user.name}</div>
                                <div className="user-role">
                                    {user.role}
                                </div>
                            </div>
                            <div className="login-arrow">→</div>
                        </div>
                    ))}
                    {availableUsers.length === 0 && <p style={{ textAlign: 'center' }}>Загрузка пользователей...</p>}
                </div>

                {/* Footer Info */}
                <div className="login-footer">
                    <p>Портал Развитие • ТС Чижик</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
