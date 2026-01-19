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
                <div className="modal-header-wrapper">
                    <div className="modal-header-top">
                        <h2>Создать задачу из шаблона</h2>
                        <button className="close-button" onClick={onClose}>&times;</button>
                    </div>

                    <div className="modal-filters-section">
                        <div className="search-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Поиск шаблона..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
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
                </div>

                <div className="modal-scroll-content">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            Загрузка шаблонов...
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📂</div>
                            <h3>Шаблоны не найдены</h3>
                            <p>Попробуйте изменить параметры поиска или создайте новый шаблон.</p>
                            <a href="/admin/task-templates" target="_blank" className="create-link">Перейти в конструктор шаблонов</a>
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
                                        <div className="template-icon">
                                            {template.category === 'IT' ? '💻' :
                                                template.category === 'Строительство' ? '🏗️' :
                                                    template.category === 'Маркетинг' ? '📢' : '📋'}
                                        </div>
                                        <div className="template-info">
                                            <div className="template-name" title={template.name}>{template.name}</div>
                                            <div className="template-category-badge">{template.category}</div>
                                        </div>
                                    </div>
                                    {template.description && (
                                        <div className="template-description">{template.description}</div>
                                    )}
                                    <div className="template-meta">
                                        <span className="meta-item">🔹 {template.fields?.length || 0} полей</span>
                                        <button className="select-btn">Выбрать</button>
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
