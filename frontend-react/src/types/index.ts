export interface User {
    id: number;
    name: string;
    email?: string;
    role: string;
    avatar?: string;
    permissions?: string[];
}


export interface Notification {
    id: number;
    message: string;
    date: Date;
    isRead: boolean;
    type?: string;
    relatedProjectId?: number;
    relatedTaskId?: number;
}

export interface Store {
    id: number;
    code: string;
    name: string;
    address: string;
    city: string;
    region: string;
    totalArea: number;
    tradeArea: number;
    status: string;
    openingDate: string;
    createdAt: string;
}

export interface Project {
    id: number;
    storeId: number;
    projectType: string;
    status: string;
    gisCode: string;
    address: string;
    totalArea?: number;
    tradeArea?: number;
    region: string;
    cfo: string;
    mp: string;
    nor: string;
    stMRiZ: string;
    rnr: string;
    createdAt?: string;
    updatedAt?: string;
    store?: Store;
    // BPMN fields
    currentStage?: string;
    templateId?: number;
}

export interface ProjectTask {
    id: number;
    projectId: number;
    name: string;
    taskType: string;
    responsible: string;
    responsibleUserId?: number;
    normativeDeadline: string;
    plannedStartDate?: string;
    actualDate?: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
    startedAt?: string;
    completedAt?: string;
    code?: string;
    isActive?: boolean;
    stage?: string;
    plannedAuditDate?: string;
    projectFolderLink?: string;
    actualAuditDate?: string;
    alcoholLicenseEligibility?: string;
    tboDocsLink?: string;
    tboAgreementDate?: string;
    tboRegistryDate?: string;
    planningContourAgreementDate?: string;
    visualizationAgreementDate?: string;
    logisticsNbkpEligibility?: string;
    layoutAgreementDate?: string;
    // Custom fields
    equipmentCostNoVat?: number;
    securityBudgetNoVat?: number;
    rsrBudgetNoVat?: number;
    pisBudgetNoVat?: number;
    totalBudgetNoVat?: number;
    days?: number;
    dependsOn?: string | string[];
}

export interface ProjectDocument {
    id: number;
    name: string;
    type: string;
    url: string;
    uploadDate: string;
    size: number;
    projectId?: number;
    taskId?: number;
}

export interface UserActivity {
    id: number;
    userId: number;
    user?: User;
    action: string;
    entityType: string;
    entityId: number;
    entityName: string;
    projectId?: number;
    project?: Project;
    createdAt: string;
    updatedAt: string;
}

export interface TaskComment {
    id: number;
    taskId: number;
    userId: number;
    user?: User;
    content: string;
    createdAt: string;
}

export interface TeamMember {
    name: string;
    role: string;
    phone: string;
    initials: string;
    color: string;
}
