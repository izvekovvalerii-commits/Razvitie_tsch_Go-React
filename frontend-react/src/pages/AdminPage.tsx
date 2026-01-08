import React, { useState } from 'react';
import AdminRoles from './AdminRoles';
import WorkflowSettings from './WorkflowSettings';
import './Projects.css'; // Common styles

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'roles' | 'workflow'>('roles');

    return (
        <div className="admin-page-container">
            <div className="admin-tile-nav">
                <button
                    className={`admin-tile ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    <div className="tile-icon" style={{ background: '#bfdbfe', color: '#1d4ed8' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <div className="tile-content">
                        <span className="tile-title">Роли и доступы</span>
                        <span className="tile-desc">Управление пользователями и правами</span>
                    </div>
                </button>

                <button
                    className={`admin-tile ${activeTab === 'workflow' ? 'active' : ''}`}
                    onClick={() => setActiveTab('workflow')}
                >
                    <div className="tile-icon" style={{ background: '#fde68a', color: '#b45309' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                    </div>
                    <div className="tile-content">
                        <span className="tile-title">Регламент процессов</span>
                        <span className="tile-desc">Настройка этапов и сроков задач</span>
                    </div>
                </button>
            </div>

            <div className="admin-tab-content">
                {activeTab === 'roles' ? (
                    <div style={{ padding: '0', height: '100%' }}>
                        <AdminRoles isEmbedded={true} />
                    </div>
                ) : (
                    <WorkflowSettings isEmbedded={true} />
                )}
            </div>

            <style>{`
                .admin-page-container {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 60px);
                    background: #f8fafc;
                }
                .admin-tile-nav {
                    display: flex;
                    flex-wrap: wrap; /* Ensure tiles wrap on small screens */
                    gap: 16px;
                    padding: 24px 32px;
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                }
                .admin-tile {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    min-width: 280px;
                    text-align: left;
                }
                .admin-tile:hover {
                    border-color: #cbd5e1;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
                .admin-tile.active {
                    border-color: #3b82f6;
                    background: #eff6ff;
                    box-shadow: 0 0 0 1px #3b82f6;
                }
                .tile-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    flex-shrink: 0;
                }
                .tile-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .tile-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1e293b;
                    line-height: 1.2;
                }
                .tile-desc {
                    font-size: 12px;
                    color: #64748b;
                    line-height: 1.4;
                }

                .admin-tab-content {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }
            `}</style>
        </div>
    );
};

export default AdminPage;
