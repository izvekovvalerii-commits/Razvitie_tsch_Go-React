import { useState, useCallback } from 'react';

interface UseApiOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
}

interface UseApiReturn<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
    execute: (...args: any[]) => Promise<T | null>;
    reset: () => void;
}

/**
 * Hook для выполнения API запросов с централизованной обработкой ошибок
 * 
 * @example
 * const { data, loading, error, execute } = useApi(
 *   (id: number) => projectsService.getProjectById(id),
 *   { showSuccessToast: true }
 * );
 * 
 * // В useEffect или обработчике
 * execute(projectId);
 */
export const useApi = <T = any>(
    apiCall: (...args: any[]) => Promise<T>,
    options: UseApiOptions = {}
): UseApiReturn<T> => {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(false);

    const execute = useCallback(
        async (...args: any[]): Promise<T | null> => {
            setLoading(true);
            setError(null);

            try {
                const result = await apiCall(...args);
                setData(result);

                if (options.onSuccess) {
                    options.onSuccess(result);
                }

                if (options.showSuccessToast) {
                    // TODO: Добавить toast notification
                    console.log('✅ Операция выполнена успешно');
                }

                return result;
            } catch (err) {
                const error = err as Error;
                setError(error);

                if (options.onError) {
                    options.onError(error);
                }

                if (options.showErrorToast !== false) {
                    // Показываем ошибку по умолчанию
                    alert(`Ошибка: ${error.message}`);
                    console.error('❌ API Error:', error);
                }

                return null;
            } finally {
                setLoading(false);
            }
        },
        [apiCall, options]
    );

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { data, error, loading, execute, reset };
};

/**
 * Hook для мутаций (создание, обновление, удаление)
 */
export const useMutation = <TData = any, TVariables = any>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options: UseApiOptions = {}
) => {
    return useApi<TData>(mutationFn, options);
};
