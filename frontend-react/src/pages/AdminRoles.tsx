import React, { useEffect, useState } from 'react';
import { rbacService, RBACRole, RBACPermission } from '../services/rbac';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/common/Modal';
import { getRoleColor, getInitials } from '../utils/uiHelpers';

// Reuse table styles
import './Projects.css';

interface AdminRolesProps {
    isEmbedded?: boolean;
}

const AdminRoles: React.FC<AdminRolesProps> = ({ isEmbedded }) => {
    const { currentUser, refreshCurrentUser } = useAuth();
    const [roles, setRoles] = useState<RBACRole[]>([]);
    const [allPermissions, setAllPermissions] = useState<RBACPermission[]>([]);
    const [selectedRole, setSelectedRole] = useState<RBACRole | null>(null);
    const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // New role state
    const [showCreate, setShowCreate] = useState(false);
    const [newRoleCode, setNewRoleCode] = useState('');
    const [newRoleName, setNewRoleName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [r, p] = await Promise.all([rbacService.getRoles(), rbacService.getPermissions()]);
            setRoles(r);
            setAllPermissions(p);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEditRole = (role: RBACRole) => {
        setSelectedRole(role);
        setRolePerms(new Set(role.permissions.map(p => p.code)));
    };

    const togglePerm = (code: string) => {
        const next = new Set(rolePerms);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        setRolePerms(next);
    };

    const savePermissions = async () => {
        if (!selectedRole) return;
        try {
            await rbacService.updateRolePermissions(selectedRole.id, Array.from(rolePerms));

            // Refresh current user's permissions if they belong to the updated role
            if (currentUser && currentUser.role === selectedRole.code) {
                await refreshCurrentUser();
            }

            setSelectedRole(null);
            loadData();
        } catch (e) {
            alert('Error updating permissions');
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleCode || !newRoleName) return;
        try {
            await rbacService.createRole(newRoleCode, newRoleName);
            setShowCreate(false);
            setNewRoleCode('');
            setNewRoleName('');
            loadData();
        } catch (e) {
            alert('Error creating role');
        }
    };

    if (loading) return (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner"></div>
        </div>
    );

    return (
        <div className="projects-page admin-roles" style={isEmbedded ? { padding: '24px 32px', maxWidth: 'none', margin: 0, height: '100%' } : {}}>
            {!isEmbedded && (
                <div className="page-header" style={{ marginBottom: '24px' }}>
                    <div className="header-left">
                        <h1 className="page-title">Управление ролями</h1>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Create New Role Card */}
                <div
                    onClick={() => setShowCreate(true)}
                    style={{
                        border: '2px dashed #e2e8f0',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '160px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        transition: 'all 0.2s ease',
                        color: '#64748b'
                    }}
                    className="create-role-card"
                >
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%', background: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Добавить роль</span>
                </div>

                {roles.map(r => (
                    <div key={r.id} style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s',
                        position: 'relative',
                        overflow: 'hidden'
                    }} className="role-card">
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: getRoleColor(r.code) }}></div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '10px',
                                    background: getRoleColor(r.code),
                                    color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: '18px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                }}>
                                    {getInitials(r.name || r.code)}
                                </div>
                                <span style={{
                                    fontSize: '11px', fontFamily: 'monospace', background: '#f1f5f9',
                                    padding: '4px 8px', borderRadius: '6px', color: '#64748b', fontWeight: 600
                                }}>
                                    {r.code}
                                </span>
                            </div>

                            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                {r.name || r.code}
                            </h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                                <span>{r.permissions.length} прав доступа</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => handleEditRole(r)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s'
                                }}
                                className="role-action-btn"
                            >
                                Настроить права
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Permissions Modal */}
            {selectedRole && (
                <Modal
                    isOpen={true}
                    onClose={() => setSelectedRole(null)}
                    title={`Права доступа: ${selectedRole.name}`}
                    size="lg"
                    footer={(
                        <>
                            <button className="btn-cancel" onClick={() => setSelectedRole(null)}>Отмена</button>
                            <button className="btn-create" onClick={savePermissions}>Сохранить изменения</button>
                        </>
                    )}
                >
                    <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid #dbeafe' }}>
                        <div style={{ background: 'white', padding: '8px', borderRadius: '50%', color: '#2563eb' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a8a' }}>Управление доступом</div>
                            <div style={{ fontSize: '12px', color: '#60a5fa' }}>Выберите функции, доступные для роли <b>{selectedRole.code}</b></div>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '24px',
                        maxHeight: '60vh',
                        padding: '4px'
                    }}>
                        {/* Group permissions by prefix */}
                        {Object.entries(allPermissions.reduce((acc, p) => {
                            const prefix = p.code.split(':')[0];
                            const group = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                            if (!acc[group]) acc[group] = [];
                            acc[group].push(p);
                            return acc;
                        }, {} as Record<string, RBACPermission[]>)).sort((a, b) => a[0].localeCompare(b[0])).map(([group, perms]) => (
                            <div key={group} className="permission-group">
                                <h3 style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>{group}</span>
                                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {perms.map(p => (
                                        <label key={p.code} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            background: rolePerms.has(p.code) ? '#f0fdf4' : 'white',
                                            border: rolePerms.has(p.code) ? '1px solid #86efac' : '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            transition: 'all 0.15s ease'
                                        }} className="perm-item">
                                            <div style={{
                                                width: '18px', height: '18px', borderRadius: '4px',
                                                border: rolePerms.has(p.code) ? 'none' : '2px solid #cbd5e1',
                                                background: rolePerms.has(p.code) ? '#16a34a' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', flexShrink: 0
                                            }}>
                                                {rolePerms.has(p.code) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={rolePerms.has(p.code)}
                                                onChange={() => togglePerm(p.code)}
                                                style={{ display: 'none' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '13px', color: '#334155' }}>
                                                    {p.description || p.code}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {/* Create Role Modal */}
            {showCreate && <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Новая роль"
                size="sm"
                footer={(
                    <>
                        <button className="btn-cancel" onClick={() => setShowCreate(false)}>Отмена</button>
                        <button className="btn-create" onClick={handleCreateRole}>Создать роль</button>
                    </>
                )}
            >
                <div>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                            Создание новой роли позволит назначать её пользователям и настраивать специфические наборы прав.
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Код роли (лат.)</label>
                        <input
                            value={newRoleCode}
                            onChange={e => setNewRoleCode(e.target.value.toUpperCase())}
                            placeholder="Например: SUPERVISOR"
                            className="modern-input"
                        />
                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>Используется в коде для проверок. Только латинские буквы.</small>
                    </div>
                    <div className="form-group">
                        <label>Название</label>
                        <input
                            value={newRoleName}
                            onChange={e => setNewRoleName(e.target.value)}
                            placeholder="Например: Супервайзер"
                            className="modern-input"
                        />
                    </div>
                </div>
            </Modal>}

            <style>{`
                .create-role-card:hover {
                    border-color: #94a3b8 !important;
                    background: #f1f5f9 !important;
                    color: #475569 !important;
                }
                .role-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                }
                .role-action-btn:hover {
                    background: #f1f5f9 !important;
                    border-color: #cbd5e1 !important;
                    color: #0f172a !important;
                }
            `}</style>
        </div>
    );
};

export default AdminRoles;
