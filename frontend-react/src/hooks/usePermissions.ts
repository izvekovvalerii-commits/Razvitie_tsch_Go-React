import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
    const { currentUser } = useAuth();

    const hasPermission = (permissionCode: string): boolean => {
        if (!currentUser || !currentUser.permissions) {
            return false;
        }

        return currentUser.permissions.includes(permissionCode);
    };

    const hasAnyPermission = (permissionCodes: string[]): boolean => {
        if (!currentUser || !currentUser.permissions || permissionCodes.length === 0) {
            return false;
        }

        return permissionCodes.some(code => hasPermission(code));
    };

    const hasAllPermissions = (permissionCodes: string[]): boolean => {
        if (!currentUser || !currentUser.permissions || permissionCodes.length === 0) {
            return false;
        }

        return permissionCodes.every(code => hasPermission(code));
    };

    return {
        permissions: currentUser?.permissions || [],
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
    };
};
