import React, { useState } from 'react';
import { TaskTemplate } from '../types/taskTemplate';
import { DynamicTaskForm } from './DynamicTaskForm';
import './PreviewPanel.css';

interface PreviewPanelProps {
    template: TaskTemplate;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ template }) => {
    const [mockValues, setMockValues] = useState<Record<string, any>>({});

    const basicFields = template.fields.filter(f => f.fieldType !== 'file_upload');
    const documentFields = template.fields.filter(f => f.fieldType === 'file_upload');

    return (
        <div className="preview-panel">
            <div className="preview-header">
                <h2>Предпросмотр формы</h2>
                <p className="hint">Так будет выглядеть форма при использовании шаблона в задаче</p>
            </div>

            <div className="preview-content">
                {/* Mock Task Header */}
                <div className="mock-task-header">
                    <h3>{template.name || 'Новый шаблон'}</h3>
                    <span className="badge">{template.category}</span>
                </div>

                {/* Tabs simulation */}
                <div className="mock-tabs">
                    <div className="tab active">📋 Основное</div>
                    <div className="tab">📎 Документы {documentFields.length > 0 && <span className="tab-badge">{documentFields.length}</span>}</div>
                </div>

                {/* Dynamic Form Preview */}
                {basicFields.length > 0 ? (
                    <div className="preview-form-section">
                        <DynamicTaskForm
                            fields={basicFields}
                            values={mockValues}
                            onChange={(key, val) => setMockValues(prev => ({ ...prev, [key]: val }))}
                            readOnly={false}
                            users={[]}
                        />
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>👈 Добавьте поля в конструкторе для отображения формы</p>
                    </div>
                )}

                {/* Documents Section Preview */}
                {documentFields.length > 0 && (
                    <div className="preview-documents">
                        <h4>📂 Обязательные документы</h4>
                        <div className="doc-list">
                            {documentFields.map(field => (
                                <div key={field.fieldKey} className="doc-preview-item">
                                    <span className="doc-icon">⚠️</span>
                                    <div className="doc-info">
                                        <div className="doc-name">
                                            {field.fieldLabel}
                                            {field.isRequired && <span className="required">*</span>}
                                        </div>
                                        {field.helpText && <small className="doc-help">{field.helpText}</small>}
                                    </div>
                                    <button className="btn-upload-small" disabled>Загрузить</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
