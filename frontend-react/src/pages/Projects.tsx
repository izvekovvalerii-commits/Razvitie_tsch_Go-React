import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../services/projects';
import { storesService } from '../services/stores';
import { useAuth } from '../hooks/useAuth';
import { Project, Store } from '../types';
import { PROJECT_TYPES, PROJECT_STATUSES, CFO_LIST, MANAGERS } from '../constants';
import './Projects.css';

// Helper function to generate avatar color based on name
const getAvatarColor = (name: string | undefined): string => {
    if (!name) return '#94a3b8';
    const colors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316', // orange
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    const [projects, setProjects] = useState<Project[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & View
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedType, setSelectedType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [quickFilter, setQuickFilter] = useState<'all' | 'active' | 'audit'>('all');

    // Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState<Partial<Project>>({
        projectType: '',
        status: 'Создан',
        mp: '',
        cfo: '',
        nor: 'Начальник отдела развития',
        stMRiZ: 'Старший менеджер',
        rnr: 'Руководитель направления развития',
        gisCode: ''
    });
    const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [pData, sData] = await Promise.all([
                    projectsService.getProjects(),
                    storesService.getStores()
                ]);
                setProjects(pData);
                setStores(sData);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredProjects = useMemo(() => {
        let result = projects;

        // 1. Quick Filter
        if (quickFilter === 'active') {
            result = result.filter(p => !['Слетел', 'Закрыт', 'Архив'].includes(p.status));
        } else if (quickFilter === 'audit') {
            result = result.filter(p => p.status === 'Аудит');
        }

        // 2. Type Filter
        if (selectedType) {
            result = result.filter(p => p.projectType === selectedType);
        }

        // 3. Status Filter
        if (selectedStatus) {
            result = result.filter(p => p.status === selectedStatus);
        }

        // 4. Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.gisCode && p.gisCode.toLowerCase().includes(q)) ||
                (p.address && p.address.toLowerCase().includes(q)) ||
                (p.store?.name && p.store.name.toLowerCase().includes(q))
            );
        }

        return result;
    }, [projects, selectedType, selectedStatus, searchQuery, quickFilter]);

    const handleCreateProject = async () => {
        if (!selectedStoreId || !newProject.projectType || !newProject.gisCode) {
            alert('Заполните обязательные поля');
            return;
        }

        const store = stores.find(s => s.id === Number(selectedStoreId));
        if (!store) return;

        const projectToCreate: Project = {
            id: 0, // Mock will assign ID
            storeId: store.id,
            projectType: newProject.projectType!,
            status: 'Создан',
            gisCode: newProject.gisCode!,
            address: store.address,
            totalArea: store.totalArea,
            tradeArea: store.tradeArea,
            region: store.region,
            cfo: newProject.cfo || 'Центральный ФО',
            mp: newProject.mp || '',
            nor: newProject.nor!,
            stMRiZ: newProject.stMRiZ!,
            rnr: newProject.rnr!,
            store: store // Store object
        };

        try {
            const createdProject = await projectsService.createProject(projectToCreate);
            console.log('Project created:', createdProject.id);
            const updated = await projectsService.getProjects();
            setProjects(updated);
            closeCreateModal();
        } catch (e) {
            console.error(e);
        }
    };

    const handleStoreSelect = (id: string) => {
        const sid = Number(id);
        setSelectedStoreId(sid);
        const store = stores.find(s => s.id === sid);
        if (store) {
            setNewProject(prev => ({
                ...prev,
                address: store.address,
                region: store.region
            }));
        }
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setSelectedStoreId(undefined);
        setNewProject({
            projectType: '',
            status: 'Создан',
            mp: '',
            gisCode: ''
        });
    };

    const canCreate = hasPermission('project:create');

    // Helpers
    const getStatusClass = (status: string) => `status-${status.toLowerCase().replace(/ /g, '-')}`;

    if (loading) return <div className="projects-page"><p>Загрузка...</p></div>;

    const activeCount = projects.filter(p => !['Слетел', 'Закрыт', 'Архив'].includes(p.status)).length;
    const auditCount = projects.filter(p => p.status === 'Аудит').length;

    return (
        <div className="projects-page">
            {/* Unified Controls Block */}
            <div className="unified-controls-row">
                {/* Left: Quick Filters (Stats) */}
                {!loading && projects.length > 0 && (
                    <div className="quick-filters-inline">
                        <button
                            className={`quick-filter-btn ${quickFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setQuickFilter('all')}
                        >
                            <span className="filter-label">Всего</span>
                            <span className="filter-count">{projects.length}</span>
                        </button>
                        <button
                            className={`quick-filter-btn ${quickFilter === 'active' ? 'active' : ''}`}
                            onClick={() => setQuickFilter('active')}
                        >
                            <span className="filter-label">В работе</span>
                            <span className="filter-count">{activeCount}</span>
                        </button>
                        <button
                            className={`quick-filter-btn ${quickFilter === 'audit' ? 'active' : ''}`}
                            onClick={() => setQuickFilter('audit')}
                        >
                            <span className="filter-label">Аудит</span>
                            <span className="filter-count">{auditCount}</span>
                        </button>
                    </div>
                )}

                {/* Right: Filters, Search, View Toggle */}
                <div className="controls-right-group">
                    {/* Dropdown Filters */}
                    <select
                        className="compact-select"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="">Все типы</option>
                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                        className="compact-select"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">Все статусы</option>
                        {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Search */}
                    <div className="search-wrapper-compact">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Поиск (ГИС, адрес)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input-compact"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="view-toggle-compact">
                        <button
                            className={`toggle-btn-compact ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            ☰
                        </button>
                        <button
                            className={`toggle-btn-compact ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            ⊞
                        </button>
                    </div>

                    {/* Create Button */}
                    {canCreate && (
                        <button className="create-btn-compact" onClick={() => setShowCreateModal(true)}>
                            <span className="btn-icon">+</span> Создать
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className={`projects-${viewMode} skeleton-container`}>
                    {Array(6).fill(0).map((_, i) => (
                        viewMode === 'grid' ? (
                            <div key={i} className="project-card-enhanced skeleton-card">
                                <div className="skeleton-header"></div>
                                <div className="skeleton-body"></div>
                                <div className="skeleton-footer"></div>
                            </div>
                        ) : (
                            <div key={i} className="skeleton-row-bar"></div>
                        )
                    ))}
                </div>
            ) : filteredProjects.length > 0 ? (
                <>
                    {/* Table View */}
                    {viewMode === 'table' && (
                        <div className="projects-table-container fade-in">
                            <table className="compact-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '8%' }}>ГИС</th>
                                        <th style={{ width: '20%' }}>Магазин</th>
                                        <th style={{ width: '12%' }}>Тип</th>
                                        <th style={{ width: '15%' }}>Статус</th>
                                        <th style={{ width: '25%' }}>Адрес</th>
                                        <th style={{ width: '10%' }}>Площадь</th>
                                        <th style={{ width: '10%' }}>Менеджер</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.map(project => (
                                        <tr key={project.id} className="clickable-row" onClick={() => navigate(`/projects/${project.id}`)}>
                                            <td><span className="code-badge">{project.gisCode}</span></td>
                                            <td className="name-cell">
                                                <div className="project-name-text">{project.store?.name || `Магазин #${project.storeId}`}</div>
                                                <div className="sub-text" style={{ fontSize: '11px', color: '#666' }}>{project.store?.city}</div>
                                            </td>
                                            <td><span className="project-type-badge" style={{ fontSize: '10px' }}>{project.projectType}</span></td>
                                            <td>
                                                <span className={`status-badge-sm ${getStatusClass(project.status)}`}>
                                                    {project.status}
                                                </span>
                                            </td>
                                            <td className="address-cell" title={project.address || project.store?.address}>
                                                {project.address || project.store?.address}
                                            </td>
                                            <td>{project.totalArea || 0} <span className="unit">м²</span></td>
                                            <td>
                                                <div className="resp-cell">
                                                    <div className="avatar-xs" style={{ backgroundColor: getAvatarColor(project.mp) }} title={project.mp}>{project.mp ? project.mp[0] : '?'}</div>
                                                    <div className="resp-name-sm" style={{ fontSize: '12px' }}>{project.mp}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <div className="projects-grid fade-in">
                            {filteredProjects.map(project => (
                                <div key={project.id} className="project-card-enhanced" onClick={() => navigate(`/projects/${project.id}`)}>
                                    <div className="card-header">
                                        <div className="card-title-section">
                                            <h3 className="card-title">{project.store?.name || `Магазин #${project.storeId}`}</h3>
                                            <p className="card-code">ГИС: {project.gisCode}</p>
                                        </div>
                                        <span className="project-type-badge">{project.projectType}</span>
                                    </div>

                                    <div className="card-status-section">
                                        <div className={`status-indicator ${getStatusClass(project.status)}`}>
                                            <span className="status-dot"></span>
                                            <span className="status-text">{project.status}</span>
                                        </div>
                                    </div>

                                    <div className="card-info-grid">
                                        <div className="info-col">
                                            <div className="info-label">Адрес</div>
                                            <div className="info-value">{(project.address || project.store?.address)?.slice(0, 50)}...</div>
                                        </div>
                                        <div className="info-col">
                                            <div className="info-label">Город</div>
                                            <div className="info-value">{project.store?.city || project.region || project.store?.region}</div>
                                        </div>
                                        <div className="info-col">
                                            <div className="info-label">Площадь</div>
                                            <div className="info-value">{project.totalArea} м²</div>
                                        </div>
                                        <div className="info-col">
                                            <div className="info-label">Регион</div>
                                            <div className="info-value">{project.region || project.store?.region}</div>
                                        </div>
                                    </div>

                                    <div className="card-footer">
                                        <div className="responsible-preview">
                                            <div className="avatar-xs" style={{ backgroundColor: getAvatarColor(project.mp), marginRight: 6 }}>{project.mp ? project.mp[0] : '?'}</div>
                                            <span className="resp-name">{project.mp?.slice(0, 20)}</span>
                                        </div>
                                        <div className="card-action-icon">→</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state-modern fade-in">
                    <div className="empty-icon">📂</div>
                    <h3>Проекты не найдены</h3>
                    <p>Попробуйте изменить параметры поиска или фильтры</p>
                    {canCreate && (
                        <button className="create-btn-small" onClick={() => setShowCreateModal(true)}>
                            Создать новый проект
                        </button>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal" onClick={closeCreateModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Создать новый проект</h2>
                        <div className="form-group">
                            <label>Выберите магазин *</label>
                            <select
                                value={selectedStoreId || ''}
                                onChange={e => handleStoreSelect(e.target.value)}
                            >
                                <option value="">-- Выберите магазин --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name} - {s.city}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Тип проекта *</label>
                            <select
                                value={newProject.projectType}
                                onChange={e => setNewProject({ ...newProject, projectType: e.target.value })}
                            >
                                <option value="">-- Выберите тип --</option>
                                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Код ГИС *</label>
                            <input
                                type="text"
                                value={newProject.gisCode}
                                onChange={e => setNewProject({ ...newProject, gisCode: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>ЦФО *</label>
                            <select
                                value={newProject.cfo || ''}
                                onChange={e => setNewProject({ ...newProject, cfo: e.target.value })}
                            >
                                <option value="">-- Выберите ЦФО --</option>
                                {CFO_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Менеджер проекта (МП) *</label>
                            <select
                                value={newProject.mp}
                                onChange={e => setNewProject({ ...newProject, mp: e.target.value })}
                            >
                                <option value="">-- Выберите менеджера --</option>
                                {MANAGERS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={closeCreateModal}>Отмена</button>
                            <button className="btn-create" onClick={handleCreateProject}>Создать</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
