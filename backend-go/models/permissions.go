package models

// Permissions constants
const (
	PermProjectCreate = "project:create"
	PermProjectView   = "project:view"
	PermProjectEdit   = "project:edit"
	PermProjectDelete = "project:delete"

	PermTaskView    = "task:view"
	PermTaskCreate  = "task:create"
	PermTaskEdit    = "task:edit"     // Edit any task
	PermTaskEditOwn = "task:edit_own" // Edit only assigned tasks

	PermUserView   = "user:view"
	PermUserManage = "user:manage"

	PermStoreView   = "store:view"
	PermStoreManage = "store:manage" // Create/Edit stores
	PermRoleManage  = "role:manage"  // Manage Roles & Permissions
)

// RolePermissions maps roles to their allowed permissions
var RolePermissions = map[string][]string{
	RoleAdmin: {
		PermProjectCreate, PermProjectView, PermProjectEdit, PermProjectDelete,
		PermTaskView, PermTaskCreate, PermTaskEdit, PermTaskEditOwn,
		PermUserView, PermUserManage,
		PermStoreView, PermStoreManage,
		PermRoleManage,
	},
	RoleMP: {
		PermProjectCreate, PermProjectView, PermProjectEdit,
		PermTaskView, PermTaskCreate, PermTaskEditOwn,
		PermStoreView,
		PermUserView,
	},
	RoleMRiZ: {
		PermProjectCreate, PermProjectView,
		PermTaskView, PermTaskEditOwn,
		PermStoreView, PermStoreManage,
		PermUserView,
	},
	RoleBA: {
		PermProjectCreate, PermProjectView,
		PermTaskView,
		PermStoreView,
		PermUserView,
	},
}

// Helper to check permission
func HasPermission(role string, permission string) bool {
	perms, ok := RolePermissions[role]
	if !ok {
		return false
	}
	for _, p := range perms {
		if p == permission {
			return true
		}
	}
	return false
}
