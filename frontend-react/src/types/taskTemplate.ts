export type FieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'datetime'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'file_upload'
    | 'user_select'
    | 'currency';

export interface ValidationRule {
    type: 'min' | 'max' | 'regex' | 'email' | 'url';
    value: any;
    message: string;
}

export interface SelectOption {
    value: string;
    label: string;
}

export interface TaskFieldTemplate {
    id?: number;
    templateId?: number;
    fieldKey: string;
    fieldLabel: string;
    fieldType: FieldType;
    isRequired: boolean;
    isVisible: boolean;
    isReadOnly: boolean;
    defaultValue?: string;
    validationRules?: string; // JSON string in DB, need parsing in UI
    options?: string; // JSON string in DB
    order: number;
    section?: string;
    placeholder?: string;
    helpText?: string;
    createdAt?: string;
    updatedAt?: string;

    // UI Helpers (parsed)
    parsedValidationRules?: ValidationRule[];
    parsedOptions?: SelectOption[];
}

export interface TaskTemplate {
    id: number;
    code: string;
    name: string;
    description?: string;
    category: string;
    isActive: boolean;
    fields: TaskFieldTemplate[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTaskTemplateRequest {
    code: string;
    name: string;
    description?: string;
    category: string;
    isActive: boolean;
    fields: TaskFieldTemplate[];
}
