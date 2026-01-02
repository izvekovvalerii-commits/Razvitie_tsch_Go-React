import { BpmnTaskDefinition } from '../constants/store-opening-process.config';
import { apiFetch } from '../utils/api';

export const workflowService = {
    getWorkflowSchema: async (): Promise<BpmnTaskDefinition[]> => {
        const response = await apiFetch('/workflow/schema');
        if (!response.ok) {
            throw new Error(`Failed to fetch workflow schema: ${response.status}`);
        }
        return response.json();
    }
};
