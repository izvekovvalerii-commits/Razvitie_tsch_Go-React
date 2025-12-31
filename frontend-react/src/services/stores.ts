import { Store } from '../types';

export const storesService = {
    getStores: async (): Promise<Store[]> => {
        const response = await fetch('/api/stores');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }
};
