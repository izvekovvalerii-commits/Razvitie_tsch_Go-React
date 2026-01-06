import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PROJECT_TYPES, PROJECT_STATUSES } from '../constants';
import { getAvatarColor, getProjectStatusClass } from '../utils/uiHelpers';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { KanbanBoard } from '../components/KanbanBoard';
import { useProjectsData } from '../hooks/useProjectsData';
import './Projects.css';

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    // Custom Hook Logic
    const {
        projects,
        stores,
        loading,
        filteredProjects,
        filters,
        setFilters,
        createProject,
        updateStatus,
        deleteProject
    } = useProjectsData();

    // UI State
    const [viewMode, setViewMode] = useState<'grid' | 'table' | 'board'>('grid');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const canCreate = hasPermission('project:create');

    const handleDeleteProject = async (id: number) => {
        try {
            await deleteProject(id);
        } catch (error: any) {
            console.error('Failed to delete project:', error);
            // Используем стандартный alert или тост
            alert(error.message || 'Ошибка удаления проекта');
        }
    };

    // Calculators
    const activeCount = projects.filter(p => !['Открыт', 'Закрыт', 'Архив', 'Слетел'].includes(p.status)).length;
    const auditCount = projects.filter(p => ['Подготовка к аудиту', 'Аудит объекта'].includes(p.status)).length;

    if (loading) return <div className="projects-page"><p>Загрузка...</p></div>;

    return (
        <div className="projects-page">
            {/* Unified Controls Block */}
            <div className="unified-controls-row">
                {/* Left: Quick Filters (Stats) */}
                {projects.length > 0 && (
                    <div className="quick-filters-inline">
                        <button
                            className={`quick-filter-btn ${filters.quickFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilters.setQuickFilter('all')}
                        >
                            <span className="filter-label">Всего</span>
                            <span className="filter-count">{projects.length}</span>
                        </button>
                        <button
                            className={`quick-filter-btn ${filters.quickFilter === 'active' ? 'active' : ''}`}
                            onClick={() => setFilters.setQuickFilter('active')}
                        >
                            <span className="filter-label">В работе</span>
                            <span className="filter-count">{activeCount}</span>
                        </button>
                        <button
                            className={`quick-filter-btn ${filters.quickFilter === 'audit' ? 'active' : ''}`}
                            onClick={() => setFilters.setQuickFilter('audit')}
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
                        value={filters.selectedType}
                        onChange={(e) => setFilters.setSelectedType(e.target.value)}
                    >
                        <option value="">Все типы</option>
                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                        className="compact-select"
                        value={filters.selectedStatus}
                        onChange={(e) => setFilters.setSelectedStatus(e.target.value)}
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
                            value={filters.searchQuery}
                            onChange={(e) => setFilters.setSearchQuery(e.target.value)}
                            className="search-input-compact"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="view-toggle-compact">
                        <button
                            className={`toggle-btn-compact ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Таблица"
                        >
                            ☰
                        </button>
                        <button
                            className={`toggle-btn-compact ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Сетка"
                        >
                            ⊞
                        </button>
                        <button
                            className={`toggle-btn-compact ${viewMode === 'board' ? 'active' : ''}`}
                            onClick={() => setViewMode('board')}
                            title="Канбан-доска"
                        >
                            📋
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
            {filteredProjects.length > 0 ? (
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
                                                <span className={`status-badge-sm ${getProjectStatusClass(project.status)}`}>
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
                                        <div className={`status-indicator ${getProjectStatusClass(project.status)}`}>
                                            <span className="status-dot"></span>
                                            <span className="status-text">{project.status}</span>
                                        </div>
                                    </div>

                                    <div className="card-info-grid">
                                        <div className="info-col">
                                            <div className="info-label">Адрес</div>
                                            <div className="info-value" style={{ fontSize: '14px' }}>{(project.address || project.store?.address)?.slice(0, 22)}...</div>
                                        </div>
                                        <div className="info-col">
                                            <div className="info-label">Город</div>
                                            <div className="info-value" style={{ fontSize: '14px' }}>{project.store?.city || project.region || project.store?.region}</div>
                                        </div>
                                        <div className="info-col">
                                            <div className="info-label">Площадь</div>
                                            <div className="info-value" style={{ fontSize: '14px' }}>{project.totalArea} м²</div>
                                        </div>
                                        <div className="info-col">
                                            <div className="info-label">Регион</div>
                                            <div className="info-value" style={{ fontSize: '14px' }}>{project.region || project.store?.region}</div>
                                        </div>
                                    </div>

                                    {/* Progress Bar with Real Data */}
                                    <div className="progress-section" style={{ marginBottom: 8 }}>
                                        <div className="progress-bar-container">
                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${project.totalTasks ? Math.round((project.completedTasks || 0) / project.totalTasks * 100) : 0}%`
                                                }}
                                            ></div>
                                        </div>
                                        <div className="progress-text">
                                            <span>Прогресс</span>
                                            <span>
                                                {project.totalTasks ? Math.round((project.completedTasks || 0) / project.totalTasks * 100) : 0}%
                                                <span style={{ color: '#94a3b8', marginLeft: 4 }}>
                                                    ({project.completedTasks || 0} / {project.totalTasks || 0})
                                                </span>
                                            </span>
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

                    {/* Kanban Board View */}
                    {viewMode === 'board' && (
                        <KanbanBoard
                            projects={filteredProjects}
                            onStatusChange={updateStatus}
                            onDelete={handleDeleteProject}
                            searchQuery={filters.searchQuery}
                            onSearchChange={setFilters.setSearchQuery}
                        />
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

            {/* Create Component */}
            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                stores={stores}
                onSave={async (newProject) => {
                    await createProject(newProject);
                }}
            />
        </div>
    );
};

export default Projects;
