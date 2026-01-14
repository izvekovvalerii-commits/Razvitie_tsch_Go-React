import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskTemplateService } from '../../services/taskTemplates';
import { TaskTemplate } from '../../types/taskTemplate';
import { Plus, Copy, Trash2, Power, Edit, Search, Filter } from 'lucide-react';
import './TaskTemplateList.css';

export const TaskTemplateList: React.FC = () => {
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const navigate = useNavigate();

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const data = await taskTemplateService.getAll();
            setTemplates(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот шаблон?')) return;
        try {
            await taskTemplateService.delete(id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleToggleStatus = async (id: number) => {
        try {
            await taskTemplateService.toggleStatus(id);
            setTemplates(templates.map(t =>
                t.id === id ? { ...t, isActive: !t.isActive } : t
            ));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleClone = async (template: TaskTemplate) => {
        const newCode = prompt('Введите код для нового шаблона:', `${template.code}_COPY`);
        if (!newCode) return;

        const newName = prompt('Введите название для нового шаблона:', `${template.name} (Копия)`);
        if (!newName) return;

        try {
            const cloned = await taskTemplateService.clone(template.id, newCode, newName);
            setTemplates([...templates, cloned]);
            navigate(`/admin/task-templates/${cloned.id}`);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const categories = Array.from(new Set(templates.map(t => t.category)));

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) return (
        <div className="task-templates-page">
            <div className="loading" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '100px 20px'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #e2e8f0',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>Загрузка шаблонов...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="task-templates-page">
            <div className="error" style={{
                maxWidth: '600px',
                margin: '60px auto',
                padding: '32px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Ошибка загрузки</h2>
                <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>{error}</p>
                <button
                    className="btn-primary"
                    onClick={loadTemplates}
                    style={{ margin: '0 auto' }}
                >
                    Попробовать снова
                </button>
            </div>
        </div>
    );

    return (
        <div className="task-templates-page">
            <div className="page-header">
                <div>
                    <h1>Конструктор задач</h1>
                    <p className="subtitle">Управление шаблонами и конструктор форм</p>
                </div>

                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Поиск по названию или коду..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="category-filter">
                        <Filter size={16} />
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            <option value="all">Все категории</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button className="btn-primary" onClick={() => navigate('/admin/task-templates/new')}>
                    <Plus size={18} />
                    Создать шаблон
                </button>
            </div>

            <div className="templates-grid">
                {filteredTemplates.map(template => (
                    <div key={template.id} className={`template-card ${!template.isActive ? 'inactive' : ''}`}>
                        <div className="card-header">
                            <span className="template-category">{template.category}</span>
                            <div className="card-actions">
                                <button
                                    className="icon-btn"
                                    title={template.isActive ? "Деактивировать" : "Активировать"}
                                    onClick={() => handleToggleStatus(template.id)}
                                >
                                    <Power size={18} color={template.isActive ? "#4CAF50" : "#ccc"} />
                                </button>
                                <button
                                    className="icon-btn"
                                    title="Клонировать"
                                    onClick={() => handleClone(template)}
                                >
                                    <Copy size={18} />
                                </button>
                                <button
                                    className="icon-btn delete"
                                    title="Удалить"
                                    onClick={() => handleDelete(template.id)}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <h3 className="template-name">{template.name}</h3>
                        <div className="template-code">{template.code}</div>
                        <p className="template-desc">{template.description || 'Нет описания'}</p>

                        <div className="card-footer">
                            <div className="fields-count">
                                <strong>{template.fields?.length || 0}</strong> полей
                            </div>
                            <button className="btn-outline" onClick={() => navigate(`/admin/task-templates/${template.id}`)}>
                                <Edit size={16} />
                                Редактировать
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="empty-state" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '80px 20px'
                }}>
                    <div style={{ fontSize: '64px', opacity: 0.3 }}>📋</div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: 600 }}>
                        {searchTerm || selectedCategory !== 'all'
                            ? 'Шаблоны не найдены'
                            : 'Нет созданных шаблонов'}
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                        {searchTerm || selectedCategory !== 'all'
                            ? 'Попробуйте изменить параметры поиска'
                            : 'Создайте первый шаблон задачи для вашей команды'}
                    </p>
                    {!searchTerm && selectedCategory === 'all' && (
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/admin/task-templates/new')}
                            style={{ marginTop: '12px' }}
                        >
                            <Plus size={20} />
                            Создать первый шаблон
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
