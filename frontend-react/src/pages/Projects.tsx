import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
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

    // Dropdown states
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

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

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedProjects = useMemo(() => {
        let sortableItems = [...filteredProjects];
        if (sortConfig.key) {
            sortableItems.sort((a: any, b: any) => {
                const getVal = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
                let valA = getVal(a, sortConfig.key) || '';
                let valB = getVal(b, sortConfig.key) || '';
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredProjects, sortConfig]);

    // Calculators
    const activeCount = projects.filter(p => !['Открыт', 'Закрыт', 'Архив', 'Слетел'].includes(p.status)).length;
    const auditCount = projects.filter(p => ['Подготовка к аудиту', 'Аудит объекта'].includes(p.status)).length;

    if (loading) return <div className="projects-page"><p>Загрузка...</p></div>;

    return (
        <div className="projects-page">
            {/* Unified Controls Block */}
            <div className="main-toolbar">
                {/* Left: Quick Filters (Stats) */}
                {projects.length > 0 && (
                    <div className="toolbar-section stats-section">
                        <div
                            className={`stat-badge badge-total ${filters.quickFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilters.setQuickFilter('all')}
                        >
                            <span className="stat-label">Всего</span>
                            <span className="stat-value">{projects.length}</span>
                        </div>
                        <div
                            className={`stat-badge badge-active ${filters.quickFilter === 'active' ? 'active' : ''}`}
                            onClick={() => setFilters.setQuickFilter('active')}
                        >
                            <span className="stat-label">В работе</span>
                            <span className="stat-value">{activeCount}</span>
                        </div>
                        <div
                            className={`stat-badge badge-audit ${filters.quickFilter === 'audit' ? 'active' : ''}`}
                            onClick={() => setFilters.setQuickFilter('audit')}
                        >
                            <span className="stat-label">Аудит</span>
                            <span className="stat-value">{auditCount}</span>
                        </div>
                    </div>
                )}

                {/* Right: Filters, Search, View Toggle */}
                <div className="toolbar-section filters-section">
                    {/* Type Filter */}
                    <div className="filter-dropdown-wrapper">
                        <button
                            className={`filter-select ${typeDropdownOpen ? 'open' : ''}`}
                            onClick={() => { setTypeDropdownOpen(!typeDropdownOpen); setStatusDropdownOpen(false); }}
                        >
                            <span className="select-text">
                                {filters.selectedType || "Все типы"}
                            </span>
                            <Icons.ChevronDown size={16} className="chevron" />
                        </button>

                        {typeDropdownOpen && (
                            <div className="dropdown-menu">
                                <div
                                    className={`dropdown-item ${!filters.selectedType ? 'selected' : ''}`}
                                    onClick={() => { setFilters.setSelectedType(""); setTypeDropdownOpen(false); }}
                                >
                                    Все типы
                                </div>
                                {PROJECT_TYPES.map(t => (
                                    <div
                                        key={t}
                                        className={`dropdown-item ${filters.selectedType === t ? 'selected' : ''}`}
                                        onClick={() => { setFilters.setSelectedType(t); setTypeDropdownOpen(false); }}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="filter-dropdown-wrapper">
                        <button
                            className={`filter-select ${statusDropdownOpen ? 'open' : ''}`}
                            onClick={() => { setStatusDropdownOpen(!statusDropdownOpen); setTypeDropdownOpen(false); }}
                        >
                            <span className="select-text">
                                {filters.selectedStatus || "Все статусы"}
                            </span>
                            <Icons.ChevronDown size={16} className="chevron" />
                        </button>

                        {statusDropdownOpen && (
                            <div className="dropdown-menu">
                                <div
                                    className={`dropdown-item ${!filters.selectedStatus ? 'selected' : ''}`}
                                    onClick={() => { setFilters.setSelectedStatus(""); setStatusDropdownOpen(false); }}
                                >
                                    Все статусы
                                </div>
                                {PROJECT_STATUSES.map(s => (
                                    <div
                                        key={s}
                                        className={`dropdown-item ${filters.selectedStatus === s ? 'selected' : ''}`}
                                        onClick={() => { setFilters.setSelectedStatus(s); setStatusDropdownOpen(false); }}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="toolbar-section actions-section">
                    {/* Search */}
                    <div className="search-compact">
                        <Icons.Search size={16} />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters.setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="view-toggles-group">
                        <button
                            className={`view-toggle ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Таблица"
                        >
                            <Icons.List size={18} />
                        </button>
                        <button
                            className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Сетка"
                        >
                            <Icons.LayoutGrid size={18} />
                        </button>
                        <button
                            className={`view-toggle ${viewMode === 'board' ? 'active' : ''}`}
                            onClick={() => setViewMode('board')}
                            title="Канбан-доска"
                        >
                            <Icons.KanbanSquare size={18} />
                        </button>
                    </div>

                    {/* Create Button */}
                    {canCreate && (
                        <button className="btn-primary-yellow" onClick={() => setShowCreateModal(true)}>
                            <Icons.Plus size={18} /> Создать
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {filteredProjects.length > 0 ? (
                <>
                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <div className="projects-grid fade-in">
                            {sortedProjects.map(project => (
                                <div
                                    key={project.id}
                                    className={`project-card-enhanced ${getProjectStatusClass(project.status)}`}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                >
                                    <div className="card-header">
                                        <div className="card-title-section">
                                            <h3 className="card-title-lg">{project.store?.name || `Магазин #${project.storeId}`}</h3>
                                            <div className="card-meta-line">
                                                <span className="card-gis-clean">#{project.gisCode}</span>
                                                {project.projectType && (
                                                    <>
                                                        <span className="meta-separator-small">•</span>
                                                        <span className="card-type-clean">{project.projectType}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`status-pill-clean ${getProjectStatusClass(project.status)}`}>
                                            {project.status}
                                        </div>
                                    </div>

                                    <div className="card-content-clean">
                                        <div className="info-row-address">
                                            <Icons.MapPin size={14} className="info-icon" />
                                            <span className="info-text-primary">
                                                {project.store?.city ? `${project.store.city}, ` : ''}
                                                {(project.address || project.store?.address) || 'Адрес не указан'}
                                            </span>
                                        </div>

                                        <div className="info-row-meta">
                                            <div className="meta-item">
                                                <Icons.Globe size={13} className="info-icon-muted" />
                                                <span>{project.region || project.store?.region || 'Регион не указан'}</span>
                                            </div>
                                            <span className="meta-separator">•</span>
                                            <div className="meta-item">
                                                <Icons.Maximize2 size={13} className="info-icon-muted" />
                                                <span>{project.totalArea || 0} м²</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="progress-section-clean">
                                        <div className="progress-bar-container-clean">
                                            <div
                                                className="progress-bar-fill-clean"
                                                style={{
                                                    width: `${project.totalTasks ? Math.round((project.completedTasks || 0) / project.totalTasks * 100) : 0}%`
                                                }}
                                            ></div>
                                        </div>
                                        <div className="progress-text-clean">
                                            <span>Прогресс: {project.totalTasks ? Math.round((project.completedTasks || 0) / project.totalTasks * 100) : 0}%</span>
                                        </div>
                                    </div>

                                    <div className="card-footer-clean">
                                        <div className="responsible-preview">
                                            <div className="avatar-xs" style={{ backgroundColor: getAvatarColor(project.mp), marginRight: 6 }}>{project.mp ? project.mp[0] : '?'}</div>
                                            <span className="resp-name">{project.mp?.slice(0, 20)}</span>
                                        </div>
                                        <div className="card-action-icon">
                                            <Icons.ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* List View */}
                    {viewMode === 'table' && (
                        <div className="projects-table-container fade-in">
                            <table className="projects-table">
                                <thead>
                                    <tr>
                                        <th className="th-gis sortable" onClick={() => handleSort('gisCode')}>
                                            ГИС {sortConfig.key === 'gisCode' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </th>
                                        <th className="th-store sortable" onClick={() => handleSort('store.name')}>
                                            Магазин {sortConfig.key === 'store.name' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </th>
                                        <th className="th-type sortable" onClick={() => handleSort('projectType')}>
                                            Тип {sortConfig.key === 'projectType' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </th>
                                        <th className="th-status sortable" onClick={() => handleSort('status')}>
                                            Статус {sortConfig.key === 'status' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </th>
                                        <th className="th-address">Адрес</th>
                                        <th className="th-area sortable" onClick={() => handleSort('totalArea')}>
                                            Площадь {sortConfig.key === 'totalArea' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </th>
                                        <th className="th-manager sortable" onClick={() => handleSort('mp')}>
                                            Менеджер {sortConfig.key === 'mp' && <span className="sort-arrow">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedProjects.map(project => (
                                        <tr key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="project-row">
                                            <td className="cell-gis">
                                                <span className="gis-badge">#{project.gisCode}</span>
                                            </td>
                                            <td className="cell-store">
                                                <div className="store-info">
                                                    <span className="store-name">{project.store?.name || `Магазин #${project.storeId}`}</span>
                                                    <span className="store-city">{project.store?.city}</span>
                                                </div>
                                            </td>
                                            <td className="cell-type">
                                                <span className="type-text">{project.projectType}</span>
                                            </td>
                                            <td className="cell-status">
                                                <div className={`status-pill-clean ${getProjectStatusClass(project.status)}`}>
                                                    {project.status}
                                                </div>
                                            </td>
                                            <td className="cell-address">
                                                <div className="address-text" title={project.address || project.store?.address}>
                                                    {project.address || project.store?.address}
                                                </div>
                                            </td>
                                            <td className="cell-area">
                                                {project.totalArea ? <span className="area-badge text-nowrap">{project.totalArea} м²</span> : '—'}
                                            </td>
                                            <td className="cell-manager">
                                                <div className="manager-info">
                                                    <div className="avatar-xs" style={{ backgroundColor: getAvatarColor(project.mp) }}>
                                                        {project.mp ? project.mp[0] : '?'}
                                                    </div>
                                                    <span className="manager-name">{project.mp}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
