import { BpmnTaskDefinition } from '../constants/store-opening-process.config';

export const workflowService = {
    getWorkflowSchema: async (): Promise<BpmnTaskDefinition[]> => {
        const response = await fetch('/api/workflow/schema');
        if (!response.ok) {
            throw new Error(`Failed to fetch workflow schema: ${response.status}`);
        }
        return response.json();
    }
};
