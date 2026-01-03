/**
 * Barrel file for utility modules
 * Provides convenient imports for all utility functions
 */

// Task utilities
export {
    isUserTask,
    isOverdueTask,
    isExpiringSoonTask,
    filterUserTasks,
    filterOverdueTasks,
    filterExpiringSoonTasks,
    getDaysUntilDeadline,
    getTaskDeviation,
    getDeadlineClass,
    getDaysWord,
    getTimeAgo
} from './taskUtils';

// UI helpers
export {
    getAvatarColor,
    getInitials,
    getTaskStatusClass,
    getProjectStatusClass,
    getDetailedStatusColor,
    getRoleColor,
    pluralize,
    formatDate,
    formatTime,
    formatDateTime
} from './uiHelpers';

// API helpers
export {
    handleApiError,
    checkApiResponse,
    serializeArrayField,
    deserializeArrayField
} from './apiHelpers';
