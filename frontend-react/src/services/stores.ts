import { Store } from '../types';
import { apiFetch } from '../utils/api';

export const storesService = {
    getStores: async (): Promise<Store[]> => {
        const response = await apiFetch('/stores');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
};
