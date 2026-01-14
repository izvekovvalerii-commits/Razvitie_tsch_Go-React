import React from 'react';
import { TaskFieldTemplate, SelectOption } from '../types/taskTemplate';
import './DynamicTaskForm.css';

interface DynamicTaskFormProps {
    fields: TaskFieldTemplate[];
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
    readOnly?: boolean;
    users?: { id: number; name: string }[];
    onFieldClick?: (fieldKey: string) => void;
    selectedFieldKey?: string | null;
}

export const DynamicTaskForm: React.FC<DynamicTaskFormProps> = ({
    fields,
    values,
    onChange,
    readOnly = false,
    users = [],
    onFieldClick,
    selectedFieldKey
}) => {

    const getOptions = (field: TaskFieldTemplate): SelectOption[] => {
        if (field.parsedOptions) return field.parsedOptions;
        if (field.options) {
            try {
                return JSON.parse(field.options);
            } catch (e) {
                console.error("Failed to parse options for " + field.fieldKey);
                return [];
            }
        }
        return [];
    };

    const renderInput = (field: TaskFieldTemplate) => {
        const value = values[field.fieldKey] ?? field.defaultValue ?? '';
        const disabled = readOnly || field.isReadOnly;

        switch (field.fieldType) {
            case 'text':
            case 'currency':
                return (
                    <input
                        type={field.fieldType === 'currency' ? 'number' : 'text'}
                        value={value}
                        onChange={e => onChange(field.fieldKey, e.target.value)}
                        disabled={disabled}
                        placeholder={field.placeholder}
                        className="form-input"
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={e => onChange(field.fieldKey, e.target.value)}
                        disabled={disabled}
                        placeholder={field.placeholder}
                        className="form-textarea"
                        rows={3}
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={e => onChange(field.fieldKey, e.target.value)}
                        disabled={disabled}
                        className="form-input"
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        value={value ? String(value).split('T')[0] : ''}
                        onChange={e => onChange(field.fieldKey, e.target.value)}
                        disabled={disabled}
                        className="form-input"
                    />
                );
            case 'datetime':
                return (
                    <input
                        type="datetime-local"
                        value={value}
                        onChange={e => onChange(field.fieldKey, e.target.value)}
                        disabled={disabled}
                        className="form-input"
                    />
                );
            case 'checkbox':
                return (
                    <label className="checkbox-wrapper">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={e => onChange(field.fieldKey, e.target.checked)}
                            disabled={disabled}
                        />
                        <span className="checkbox-label">{field.placeholder || 'Да'}</span>
                    </label>
                );
            case 'select':
                return (
                    <select
                        value={value}
                        onChange={e => onChange(field.fieldKey, e.target.value)}
                        disabled={disabled}
                        className="form-select"
                    >
                        <option value="">Не выбрано</option>
                        {getOptions(field).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            case 'user_select':
                return (
                    <select
                        value={value}
                        onChange={e => onChange(field.fieldKey, e.target.value)}
                        disabled={disabled}
                        className="form-select"
                    >
                        <option value="">Выберите пользователя</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                );
            case 'file_upload':
                return null; // Will be rendered in Documents tab
            default:
                return <div>Unsupported field type: {field.fieldType}</div>;
        }
    };

    const sortedFields = [...fields].sort((a, b) => a.order - b.order);

    return (
        <div className="dynamic-task-form">
            {sortedFields.map(field => {
                if (!field.isVisible && !values[field.fieldKey]) return null;

                const isSelected = selectedFieldKey === field.fieldKey;

                return (
                    <div
                        key={field.fieldKey}
                        className={`dynamic-field-group ${isSelected ? 'field-selected' : ''} ${onFieldClick ? 'field-clickable' : ''}`}
                        onClick={() => onFieldClick?.(field.fieldKey)}
                    >
                        <label className="field-label">
                            {field.fieldLabel}
                            {field.isRequired && <span className="required-star">*</span>}
                        </label>
                        {renderInput(field)}
                        {field.helpText && <div className="field-help">{field.helpText}</div>}
                    </div>
                );
            })}
        </div>
    );
};
