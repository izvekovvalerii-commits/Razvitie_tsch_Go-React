import React, { useEffect, useState } from 'react';
import { TaskTemplate } from '../types/taskTemplate';
import { taskTemplateService } from '../services/taskTemplates';
import './CreateTaskFromTemplateModal.css';

interface CreateTaskFromTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: TaskTemplate) => void;
}

export const CreateTaskFromTemplateModal: React.FC<CreateTaskFromTemplateModalProps> = ({
    isOpen,
    onClose,
    onSelectTemplate
}) => {
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Все');

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await taskTemplateService.getActive();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['Все', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))];

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Все' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content template-selector-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Создать задачу из шаблона</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="filters-row">
                        <input
                            type="text"
                            placeholder="Поиск шаблона..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="category-select"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="loading-state">Загрузка шаблонов...</div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="empty-state">
                            Нет доступных шаблонов.
                            <br />
                            <a href="/admin/task-templates" target="_blank">Создать шаблоны в конструкторе</a>
                        </div>
                    ) : (
                        <div className="templates-grid">
                            {filteredTemplates.map(template => (
                                <div
                                    key={template.id}
                                    className="template-card"
                                    onClick={() => onSelectTemplate(template)}
                                >
                                    <div className="template-card-header">
                                        <div className="template-icon">📄</div>
                                        <div className="template-info">
                                            <div className="template-name">{template.name}</div>
                                            <div className="template-category">{template.category}</div>
                                        </div>
                                    </div>
                                    {template.description && (
                                        <div className="template-description">{template.description}</div>
                                    )}
                                    <div className="template-meta">
                                        <span>Полей: {template.fields?.length || 0}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
