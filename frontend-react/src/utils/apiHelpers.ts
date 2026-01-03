/**
 * Обрабатывает ошибку API ответа
 * @param response - Response объект
 * @param defaultMsg - сообщение по умолчанию
 * @returns Promise с сообщением об ошибке
 */
export const handleApiError = async (response: Response, defaultMsg: string): Promise<string> => {
    let errorMsg = defaultMsg;

    try {
        const errorData = await response.json();
        if (errorData.error) {
            errorMsg = errorData.error;
        } else if (errorData.message) {
            errorMsg = errorData.message;
        }
    } catch (e) {
        // Если не удалось распарсить JSON, используем сообщение по умолчанию
    }

    return errorMsg;
};

/**
 * Проверяет успешность ответа и бросает ошибку при необходимости
 */
export const checkApiResponse = async (response: Response, defaultErrorMsg: string): Promise<void> => {
    if (!response.ok) {
        const errorMsg = await handleApiError(response, defaultErrorMsg);
        throw new Error(errorMsg);
    }
};

/**
 * Преобразует массив в JSON строку для отправки на бэкенд
 */
export const serializeArrayField = <T>(value: T[] | string | undefined): string | undefined => {
    if (!value) return undefined;

    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    return value;
};

/**
 * Преобразует JSON строку в массив при получении с бэкенда
 */
export const deserializeArrayField = <T>(value: string | T[] | undefined | null): T[] => {
    if (!value) return [];

    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (e) {
            console.error('Failed to parse array field:', e);
            return [];
        }
    }

    if (Array.isArray(value)) {
        return value;
    }

    return [];
};
