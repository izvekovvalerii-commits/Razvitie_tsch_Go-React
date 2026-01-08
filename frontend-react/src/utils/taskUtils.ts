import { ProjectTask, User } from '../types';

/**
 * Проверяет, является ли задача задачей текущего пользователя
 */
export const isUserTask = (task: ProjectTask, currentUser: User | null): boolean => {
    if (!currentUser) return false;
    // Админы и БА видят все задачи
    if (currentUser.role === 'admin' || currentUser.role === 'БА') return true;

    return task.responsibleUserId === currentUser.id ||
        task.responsible === currentUser.name ||
        task.responsible === currentUser.role;
};

/**
 * Проверяет, является ли задача просроченной
 */
export const isOverdueTask = (task: ProjectTask): boolean => {
    if (task.status === 'Выполнена' || task.status === 'Завершена') {
        return false;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const deadline = new Date(task.normativeDeadline);
    deadline.setHours(0, 0, 0, 0);

    return deadline < now;
};

/**
 * Проверяет, истекает ли задача в ближайшее время (завтра)
 */
export const isExpiringSoonTask = (task: ProjectTask): boolean => {
    if (task.status === 'Выполнена' || task.status === 'Завершена') {
        return false;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const deadline = new Date(task.normativeDeadline);
    deadline.setHours(0, 0, 0, 0);

    return deadline >= tomorrow && deadline < dayAfterTomorrow;
};

/**
 * Фильтрует задачи пользователя
 */
export const filterUserTasks = (tasks: ProjectTask[], currentUser: User | null): ProjectTask[] => {
    if (!currentUser) return [];

    // Админы и БА видят все задачи
    if (currentUser.role === 'admin' || currentUser.role === 'БА') {
        return tasks;
    }

    return tasks.filter(task => isUserTask(task, currentUser));
};

/**
 * Фильтрует просроченные задачи
 */
export const filterOverdueTasks = (tasks: ProjectTask[]): ProjectTask[] => {
    return tasks.filter(isOverdueTask);
};

/**
 * Фильтрует задачи, истекающие скоро
 */
export const filterExpiringSoonTasks = (tasks: ProjectTask[]): ProjectTask[] => {
    return tasks.filter(isExpiringSoonTask);
};

/**
 * Получает информацию о днях до дедлайна
 */
export const getDaysUntilDeadline = (task: ProjectTask): {
    text: string;
    isOverdue: boolean;
    isUrgent: boolean;
    days: number;
} => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const deadline = new Date(task.normativeDeadline);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let text = '';
    let isOverdue = false;
    let isUrgent = false;

    if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        text = `${absDays} ${getDaysWord(absDays)} назад`;
        isOverdue = true;
    } else if (diffDays === 0) {
        text = 'Сегодня';
        isUrgent = true;
    } else if (diffDays === 1) {
        text = 'Завтра';
        isUrgent = true;
    } else if (diffDays <= 3) {
        text = `${diffDays} ${getDaysWord(diffDays)}`;
        isUrgent = true;
    } else {
        text = `${diffDays} ${getDaysWord(diffDays)}`;
    }

    return { text, isOverdue, isUrgent, days: diffDays };
};

/**
 * Вычисляет отклонение задачи от плана
 */
export const getTaskDeviation = (task: ProjectTask): {
    days: number;
    type: 'early' | 'late';
} | undefined => {
    if (!task || !task.normativeDeadline || !task.actualDate) {
        return undefined;
    }

    const dayMs = 1000 * 60 * 60 * 24;
    const planDate = new Date(task.normativeDeadline);
    const actualDate = new Date(task.actualDate);
    const diff = (planDate.getTime() - actualDate.getTime()) / dayMs;

    if (diff > 0) return { days: Math.round(diff), type: 'early' };
    if (diff < 0) return { days: Math.round(Math.abs(diff)), type: 'late' };

    return undefined;
};

/**
 * Определяет CSS класс для дедлайна
 */
export const getDeadlineClass = (deadlineStr: string): string => {
    if (!deadlineStr) return '';

    const deadline = new Date(deadlineStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    if (deadline < now) return 'deadline-overdue';

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);

    if (deadline <= threeDaysFromNow) return 'deadline-soon';

    return '';
};

/**
 * Склонение слова "день"
 */
export const getDaysWord = (days: number): string => {
    const absDays = Math.abs(days);
    if (absDays % 10 === 1 && absDays % 100 !== 11) {
        return 'день';
    } else if ([2, 3, 4].includes(absDays % 10) && ![12, 13, 14].includes(absDays % 100)) {
        return 'дня';
    } else {
        return 'дней';
    }
};

/**
 * Форматирует время "N минут/часов/дней назад"
 */
export const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    return `${diffDays} дн назад`;
};
