import React, { useEffect, useState } from 'react';
import { rbacService, RBACRole, RBACPermission } from '../services/rbac';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/common/Modal';

import './Projects.css'; // Reuse table styles

const AdminRoles: React.FC = () => {
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
                alert('Ваши права были обновлены');
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

    if (loading) return <div style={{ padding: 20 }}>Загрузка...</div>;

    return (
        <div className="projects-page admin-roles">
            <div className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Управление ролями</h1>
                </div>
                <div>
                    <button className="create-btn" onClick={() => setShowCreate(true)}>+ Роль</button>
                </div>
            </div>

            <div className="projects-table-container">
                <table className="compact-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Код</th>
                            <th>Название</th>
                            <th>Прав</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(r => (
                            <tr key={r.id}>
                                <td>{r.id}</td>
                                <td><span className="code-badge">{r.code}</span></td>
                                <td>{r.name}</td>
                                <td>{r.permissions.length}</td>
                                <td>
                                    <button className="btn-edit" style={{ padding: '4px 8px', cursor: 'pointer' }} onClick={() => handleEditRole(r)}>
                                        Изменить права
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Permissions Modal */}
            {selectedRole && (
                <Modal
                    isOpen={true}
                    onClose={() => setSelectedRole(null)}
                    title={`Права роли: ${selectedRole.name} (${selectedRole.code})`}
                    size="lg"
                    footer={(
                        <>
                            <button className="btn-cancel" onClick={() => setSelectedRole(null)}>Отмена</button>
                            <button className="btn-create" onClick={savePermissions}>Сохранить права</button>
                        </>
                    )}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '24px',
                        maxHeight: '65vh',
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
                            <div key={group}>
                                <h3 style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '12px',
                                    borderBottom: '1px solid #e2e8f0',
                                    paddingBottom: '4px'
                                }}>
                                    {group}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {perms.map(p => (
                                        <label key={p.code} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                            padding: '12px',
                                            cursor: 'pointer',
                                            background: rolePerms.has(p.code) ? '#fffbeb' : '#fff',
                                            border: rolePerms.has(p.code) ? '1px solid #fcd34d' : '1px solid #f1f5f9',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: rolePerms.has(p.code) ? '0 4px 6px -1px rgba(251, 191, 36, 0.1)' : 'none'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={rolePerms.has(p.code)}
                                                onChange={() => togglePerm(p.code)}
                                                style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px', accentColor: '#fbbf24' }}
                                            />
                                            <div style={{ lineHeight: 1.4, flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                                                    {p.description || p.code}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                                                    {p.code}
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
            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Создать новую роль"
                footer={(
                    <>
                        <button className="btn-cancel" onClick={() => setShowCreate(false)}>Отмена</button>
                        <button className="btn-create" onClick={handleCreateRole}>Создать</button>
                    </>
                )}
            >
                <div className="form-group">
                    <label>Код (например, MANAGER)</label>
                    <input value={newRoleCode} onChange={e => setNewRoleCode(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Название (например, Менеджер)</label>
                    <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                </div>
            </Modal>
        </div>
    );
};

export default AdminRoles;
