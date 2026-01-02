import { apiFetch } from '../utils/api';

export interface RBACRole {
    id: number;
    code: string;
    name: string;
    permissions: RBACPermission[];
}

export interface RBACPermission {
    id: number;
    code: string;
    description: string;
}

export const rbacService = {
    getRoles: async (): Promise<RBACRole[]> => {
        const res = await apiFetch('/rbac/roles');
        if (!res.ok) throw new Error('Failed to fetch roles');
        return res.json();
    },

    getPermissions: async (): Promise<RBACPermission[]> => {
        const res = await apiFetch('/rbac/permissions');
        if (!res.ok) throw new Error('Failed to fetch permissions');
        return res.json();
    },

    createRole: async (code: string, name: string): Promise<RBACRole> => {
        const res = await apiFetch('/rbac/roles', {
            method: 'POST',
            body: JSON.stringify({ code, name })
        });
        if (!res.ok) throw new Error('Failed to create role');
        return res.json();
    },

    updateRolePermissions: async (roleId: number, permissionCodes: string[]): Promise<RBACRole> => {
        const res = await apiFetch(`/rbac/roles/${roleId}/permissions`, {
            method: 'POST',
            body: JSON.stringify({ permissionCodes })
        });
        if (!res.ok) throw new Error('Failed to update permissions');
        return res.json();
    }
};
