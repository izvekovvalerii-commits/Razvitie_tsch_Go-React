/**
 * Генерирует цвет аватара на основе имени
 */
export const getAvatarColor = (name: string | undefined): string => {
    if (!name) return '#94a3b8';

    const colors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316', // orange
        '#6366f1', // indigo
        '#84cc16', // lime
        '#06b6d4', // cyan
        '#d946ef', // fuchsia
    ];

    // Простой хеш-функция для лучшего распределения цветов
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

/**
 * Получает инициалы из имени
 */
export const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(p => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
};

/**
 * Получает CSS класс для статуса задачи
 */
export const getTaskStatusClass = (status: string): string => {
    const map: { [key: string]: string } = {
        'Назначена': 'status-assigned',
        'В работе': 'status-in-progress',
        'Завершена': 'status-completed',
        'Выполнена': 'status-completed',
        'Срыв сроков': 'status-overdue',
        'Ожидание': 'status-ожидание',
        'На согласовании': 'status-на-согласовании'
    };

    return map[status] || `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
};

/**
 * Получает CSS класс для статуса проекта
 */
export const getProjectStatusClass = (status: string): string => {
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
};

/**
 * Получает цвет для детального статуса проекта
 */
export const getDetailedStatusColor = (status: string): string => {
    const s = status.toLowerCase();

    if (s.includes('открыт') || s.includes('active')) return '#4CAF50';
    if (s.includes('смр') || s.includes('ремонт') || s.includes('renovation')) return '#F44336';
    if (s.includes('аудит')) return '#FF9800';
    if (s.includes('бюджет')) return '#FFC107';
    if (s.includes('утвержден')) return '#FFB74D';
    if (s.includes('договор')) return '#FB8C00';
    if (s.includes('слетел')) return '#9E9E9E';

    return '#E0E0E0';
};

/**
 * Получает цвет для роли пользователя
 */
export const getRoleColor = (role: string): string => {
    const colors: { [key: string]: string } = {
        'admin': '#64748b', // Slate
        'МП': '#3b82f6',    // Blue
        'МРиЗ': '#10b981',  // Emerald
        'БА': '#f59e0b',    // Amber
        'НОР': '#a855f7',   // Purple
        'РНР': '#ef4444'    // Red
    };

    return colors[role] || '#94a3b8';
};

/**
 * Универсальная функция склонения слов
 * @param count - число
 * @param forms - массив форм [1, 2-4, 5+] например: ['день', 'дня', 'дней']
 */
export const pluralize = (count: number, forms: [string, string, string]): string => {
    const absCount = Math.abs(count);

    if (absCount % 10 === 1 && absCount % 100 !== 11) {
        return forms[0];
    } else if ([2, 3, 4].includes(absCount % 10) && ![12, 13, 14].includes(absCount % 100)) {
        return forms[1];
    } else {
        return forms[2];
    }
};

/**
 * Форматирует дату в локальный формат
 */
export const formatDate = (date: string | Date): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ru-RU');
};

/**
 * Форматирует время в локальный формат
 */
export const formatTime = (date: string | Date): string => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Форматирует дату и время
 */
export const formatDateTime = (date: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    return `${formatDate(d)} ${formatTime(d)}`;
};
