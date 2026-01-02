import React, { useState, useEffect, useMemo } from 'react';
import { storesService } from '../services/stores';
import { Store } from '../types';
import './Stores.css';

const Stores: React.FC = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);

    // UI State
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        setLoading(true);
        try {
            const data = await storesService.getStores();
            setStores(data);
        } catch (err: any) {
            setError(`Ошибка загрузки данных: ${err.message || 'Неизвестная ошибка'}`);
        } finally {
            setLoading(false);
        }
    };

    // Stats Calculation
    const stats = useMemo(() => ({
        total: stores.length,
        active: stores.filter(s => s.status === 'Active').length,
        planning: stores.filter(s => s.status === 'Planning').length,
        renovation: stores.filter(s => s.status === 'Renovation').length
    }), [stores]);

    // Options
    const regionOptions = useMemo(() =>
        Array.from(new Set(stores.map(s => s.region).filter(Boolean))).sort(),
        [stores]);

    const cityOptions = useMemo(() =>
        Array.from(new Set(stores.map(s => s.city).filter(Boolean))).sort(),
        [stores]);

    // Filtering Logic
    const filteredStores = useMemo(() => {
        return stores.filter(store => {
            // Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const match = store.name.toLowerCase().includes(term) ||
                    store.code.toLowerCase().includes(term) ||
                    store.address.toLowerCase().includes(term) ||
                    store.city.toLowerCase().includes(term);
                if (!match) return false;
            }

            // Status Filter
            if (selectedStatuses.length > 0) {

                // Reverse lookup or map store status map
                const mappingRev: { [key: string]: string } = { 'Active': 'Активный', 'Planning': 'Планируется', 'Renovation': 'Ремонт' };
                const ruStatus = mappingRev[store.status];
                if (!ruStatus || !selectedStatuses.includes(ruStatus)) return false;
            }

            // Region & City
            if (selectedRegions.length > 0 && !selectedRegions.includes(store.region)) return false;
            if (selectedCities.length > 0 && !selectedCities.includes(store.city)) return false;

            return true;
        });
    }, [stores, searchTerm, selectedStatuses, selectedRegions, selectedCities]);

    // Handlers
    const handleStatClick = (type: 'total' | 'Active' | 'Planning' | 'Renovation') => {
        if (type === 'total') {
            setSelectedStatuses([]);
        } else {
            const map: any = { 'Active': 'Активный', 'Planning': 'Планируется', 'Renovation': 'Ремонт' };
            setSelectedStatuses([map[type]]);
        }
    };

    const toggleSelection = (list: string[], item: string, setList: (l: string[]) => void) => {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Active': return 'Активный';
            case 'Planning': return 'Планируется';
            case 'Renovation': return 'Ремонт';
            default: return status;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Active': return 'status-active';
            case 'Planning': return 'status-planning';
            case 'Renovation': return 'status-renovation';
            default: return '';
        }
    };

    // Icons (SVG Component Helpers)
    const Icons = {
        Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
        MapPin: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
        Building: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="12" y1="22" x2="12" y2="22.01"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>,
        Maximize: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>,
        Grid: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
        List: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
        Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
    };

    if (loading) return (
        <div className="stores-page loading-state">
            <div className="spinner"></div>
            <p>Загрузка магазинов...</p>
        </div>
    );

    if (error) return (
        <div className="stores-page error-state">
            <p>{error}</p>
            <button onClick={loadStores}>Повторить</button>
        </div>
    );

    return (
        <div className="stores-page">

            {/* Top Controls - Stats + Search + Filters in 1 Row */}
            <div className="top-controls-row">
                {/* 1. Stats Overview (Left Side - Compact) */}
                <div className="stats-inline">
                    <div
                        className={`stat-card-compact total ${selectedStatuses.length === 0 ? 'active-filter' : ''}`}
                        onClick={() => handleStatClick('total')}
                    >
                        <div className="stat-label">Всего магазинов</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                    <div
                        className={`stat-card-compact active ${selectedStatuses.includes('Активный') ? 'active-filter' : ''}`}
                        onClick={() => handleStatClick('Active')}
                    >
                        <div className="stat-label">Активные</div>
                        <div className="stat-value text-green">{stats.active}</div>
                    </div>
                    <div
                        className={`stat-card-compact planning ${selectedStatuses.includes('Планируется') ? 'active-filter' : ''}`}
                        onClick={() => handleStatClick('Planning')}
                    >
                        <div className="stat-label">В плане</div>
                        <div className="stat-value text-orange">{stats.planning}</div>
                    </div>
                    <div
                        className={`stat-card-compact renovation ${selectedStatuses.includes('Ремонт') ? 'active-filter' : ''}`}
                        onClick={() => handleStatClick('Renovation')}
                    >
                        <div className="stat-label">Ремонт</div>
                        <div className="stat-value text-red">{stats.renovation}</div>
                    </div>
                </div>

                {/* Right Side: Search + Filters + View Toggle */}
                <div className="controls-right">
                    {/* Search */}
                    <div className="search-wrapper">
                        <div className="search-icon"><Icons.Search /></div>
                        <input
                            type="text"
                            placeholder="Поиск по названию, коду, адресу..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    {/* Filters + View Toggle */}
                    <div className="toolbar-actions">
                        <div className="filters-group">
                            {/* Region Filter */}
                            <div className="filter-dropdown">
                                <button className={`filter-btn ${regionDropdownOpen ? 'active' : ''}`} onClick={() => { setRegionDropdownOpen(!regionDropdownOpen); setCityDropdownOpen(false); }}>
                                    Регион {selectedRegions.length > 0 && `(${selectedRegions.length})`}
                                </button>
                                {regionDropdownOpen && (
                                    <div className="dropdown-menu">
                                        {regionOptions.map(opt => (
                                            <label key={opt} className="dropdown-item">
                                                <input type="checkbox" checked={selectedRegions.includes(opt)} onChange={() => toggleSelection(selectedRegions, opt, setSelectedRegions)} />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* City Filter */}
                            <div className="filter-dropdown">
                                <button className={`filter-btn ${cityDropdownOpen ? 'active' : ''}`} onClick={() => { setCityDropdownOpen(!cityDropdownOpen); setRegionDropdownOpen(false); }}>
                                    Город {selectedCities.length > 0 && `(${selectedCities.length})`}
                                </button>
                                {cityDropdownOpen && (
                                    <div className="dropdown-menu">
                                        {cityOptions.map(opt => (
                                            <label key={opt} className="dropdown-item">
                                                <input type="checkbox" checked={selectedCities.includes(opt)} onChange={() => toggleSelection(selectedCities, opt, setSelectedCities)} />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {(selectedStatuses.length > 0 || selectedRegions.length > 0 || selectedCities.length > 0) && (
                                <button className="clear-all-btn" onClick={() => { setSelectedStatuses([]); setSelectedRegions([]); setSelectedCities([]); }}>
                                    Сбросить
                                </button>
                            )}
                        </div>

                        <div className="view-toggles">
                            <button className={`toggle-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
                                <Icons.List />
                            </button>
                            <button className={`toggle-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                                <Icons.Grid />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Content */}
            {viewMode === 'grid' ? (
                <div className="stores-grid">
                    {filteredStores.map(store => (
                        <div className="store-card" key={store.id}>
                            <div className="card-top">
                                <span className="card-code">{store.code}</span>
                                <span className={`card-status ${getStatusClass(store.status)}`}>
                                    {getStatusText(store.status)}
                                </span>
                            </div>
                            <h3 className="card-title">{store.name}</h3>

                            <div className="card-details">
                                <div className="detail-item">
                                    <div className="detail-icon"><Icons.MapPin /></div>
                                    <div className="detail-text" title={store.address}>{store.address}</div>
                                </div>
                                <div className="detail-row">
                                    <div className="detail-item">
                                        <div className="detail-icon"><Icons.Building /></div>
                                        <div className="detail-text">{store.city}</div>
                                    </div>
                                    <div className="detail-item right">
                                        <div className="detail-icon"><Icons.Maximize /></div>
                                        <div className="detail-text">{store.totalArea} м²</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="table-wrapper">
                    <table className="compact-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Код</th>
                                <th>Статус</th>
                                <th>Адрес</th>
                                <th>Город</th>
                                <th>Регион</th>
                                <th>Площадь</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStores.map(store => (
                                <tr key={store.id}>
                                    <td className="fw-600">{store.name}</td>
                                    <td><span className="code-tag">{store.code}</span></td>
                                    <td><span className={`status-dot ${getStatusClass(store.status)}`}></span> {getStatusText(store.status)}</td>
                                    <td className="text-muted">{store.address}</td>
                                    <td>{store.city}</td>
                                    <td>{store.region}</td>
                                    <td>{store.totalArea}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredStores.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon"><Icons.Search /></div>
                    <h3>Ничего не найдено</h3>
                    <p>Попробуйте изменить параметры поиска или фильтры</p>
                </div>
            )}
        </div>
    );
};

export default Stores;
