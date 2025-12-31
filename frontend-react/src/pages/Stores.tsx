import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storesService } from '../services/stores';
import { Store } from '../types';
import './Stores.css';

const Stores: React.FC = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

    const statusOptions = ['Активный', 'Планируется', 'Ремонт'];

    // Close dropdowns on outside click - simplified for now with just toggle logic
    // but in a real app better to attach global click listener

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await storesService.getStores();
            setStores(data);
        } catch (err: any) {
            setError(`Ошибка загрузки данных: ${err.message || 'Неизвестная ошибка'}`);
        } finally {
            setLoading(false);
        }
    };

    const regionOptions = useMemo(() => {
        const regions = new Set(stores.map(s => s.region).filter(Boolean));
        return Array.from(regions).sort();
    }, [stores]);

    const cityOptions = useMemo(() => {
        const cities = new Set(stores.map(s => s.city).filter(Boolean));
        return Array.from(cities).sort();
    }, [stores]);

    const filteredStores = useMemo(() => {
        return stores.filter(store => {
            // Status Filter
            if (selectedStatuses.length > 0) {
                const statusMap: { [key: string]: string } = {
                    'Активный': 'Active',
                    'Планируется': 'Planning',
                    'Ремонт': 'Renovation'
                };
                const storeStatusRu = Object.keys(statusMap).find(key => statusMap[key] === store.status);
                if (!storeStatusRu || !selectedStatuses.includes(storeStatusRu)) {
                    return false;
                }
            }

            // Region Filter
            if (selectedRegions.length > 0 && !selectedRegions.includes(store.region)) {
                return false;
            }

            // City Filter
            if (selectedCities.length > 0 && !selectedCities.includes(store.city)) {
                return false;
            }

            return true;
        });
    }, [stores, selectedStatuses, selectedRegions, selectedCities]);

    // Handlers
    const toggleStatusDropdown = () => {
        setStatusDropdownOpen(!statusDropdownOpen);
        setRegionDropdownOpen(false);
        setCityDropdownOpen(false);
    };

    const toggleRegionDropdown = () => {
        setRegionDropdownOpen(!regionDropdownOpen);
        setStatusDropdownOpen(false);
        setCityDropdownOpen(false);
    };

    const toggleCityDropdown = () => {
        setCityDropdownOpen(!cityDropdownOpen);
        setStatusDropdownOpen(false);
        setRegionDropdownOpen(false);
    };

    const toggleSelection = (list: string[], item: string, setList: (l: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const getFilterLabel = (type: 'status' | 'region' | 'city') => {
        let selected: string[] = [];
        let label = '';
        switch (type) {
            case 'status': selected = selectedStatuses; label = 'Статус'; break;
            case 'region': selected = selectedRegions; label = 'Регион'; break;
            case 'city': selected = selectedCities; label = 'Город'; break;
        }

        if (selected.length === 0) return label;
        if (selected.length === 1) return selected[0];
        return `${label} (${selected.length})`;
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Active': return 'status-active';
            case 'Planning': return 'status-planning';
            case 'Renovation': return 'status-renovation';
            default: return '';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Active': return 'Активный';
            case 'Planning': return 'Планируется';
            case 'Renovation': return 'Ремонт';
            default: return status;
        }
    };

    if (loading) return (
        <div className="stores-page">
            <div className="loading">
                <div className="spinner"></div>
                <p>Загрузка...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="stores-page">
            <div className="error">
                <p>{error}</p>
                <button onClick={loadStores}>Попробовать снова</button>
            </div>
        </div>
    );

    return (
        <div className="stores-page">
            <div className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Магазины</h1>
                    <div className="title-underline"></div>
                </div>

                {/* Filters */}
                <div className="filters-section">
                    {/* Status */}
                    <div className="filter-dropdown">
                        <button className="filter-dropdown-btn" onClick={toggleStatusDropdown}>
                            {getFilterLabel('status')}
                            <span className="dropdown-arrow">{statusDropdownOpen ? '▲' : '▼'}</span>
                        </button>
                        {statusDropdownOpen && (
                            <div className="filter-dropdown-menu">
                                {statusOptions.map(status => (
                                    <div className="filter-option" key={status}>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedStatuses.includes(status)}
                                                onChange={() => toggleSelection(selectedStatuses, status, setSelectedStatuses)}
                                            />
                                            <span>{status}</span>
                                        </label>
                                    </div>
                                ))}
                                {selectedStatuses.length > 0 && (
                                    <div className="filter-actions">
                                        <button className="clear-btn" onClick={() => setSelectedStatuses([])}>Очистить</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Region */}
                    <div className="filter-dropdown">
                        <button className="filter-dropdown-btn" onClick={toggleRegionDropdown}>
                            {getFilterLabel('region')}
                            <span className="dropdown-arrow">{regionDropdownOpen ? '▲' : '▼'}</span>
                        </button>
                        {regionDropdownOpen && (
                            <div className="filter-dropdown-menu">
                                {regionOptions.map(region => (
                                    <div className="filter-option" key={region}>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedRegions.includes(region)}
                                                onChange={() => toggleSelection(selectedRegions, region, setSelectedRegions)}
                                            />
                                            <span>{region}</span>
                                        </label>
                                    </div>
                                ))}
                                {selectedRegions.length > 0 && (
                                    <div className="filter-actions">
                                        <button className="clear-btn" onClick={() => setSelectedRegions([])}>Очистить</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* City */}
                    <div className="filter-dropdown">
                        <button className="filter-dropdown-btn" onClick={toggleCityDropdown}>
                            {getFilterLabel('city')}
                            <span className="dropdown-arrow">{cityDropdownOpen ? '▲' : '▼'}</span>
                        </button>
                        {cityDropdownOpen && (
                            <div className="filter-dropdown-menu">
                                {cityOptions.map(city => (
                                    <div className="filter-option" key={city}>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedCities.includes(city)}
                                                onChange={() => toggleSelection(selectedCities, city, setSelectedCities)}
                                            />
                                            <span>{city}</span>
                                        </label>
                                    </div>
                                ))}
                                {selectedCities.length > 0 && (
                                    <div className="filter-actions">
                                        <button className="clear-btn" onClick={() => setSelectedCities([])}>Очистить</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="header-actions">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            <span className="icon">☰</span>
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <span className="icon">⊞</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="stores-container">
                {viewMode === 'table' && filteredStores.length > 0 && (
                    <div className="stores-table-container">
                        <table className="compact-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '15%' }}>Название</th>
                                    <th style={{ width: '10%' }}>Код</th>
                                    <th style={{ width: '10%' }}>Статус</th>
                                    <th style={{ width: '25%' }}>Адрес</th>
                                    <th style={{ width: '15%' }}>Город</th>
                                    <th style={{ width: '15%' }}>Регион</th>
                                    <th style={{ width: '10%' }}>Площадь (Общ/Торг)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStores.map(store => (
                                    <tr key={store.id}>
                                        <td className="name-cell">
                                            <span className="store-name-text">{store.name}</span>
                                        </td>
                                        <td><span className="code-badge">{store.code}</span></td>
                                        <td>
                                            <span className={`status-badge-sm ${getStatusClass(store.status)}`}>
                                                {getStatusText(store.status)}
                                            </span>
                                        </td>
                                        <td className="address-cell" title={store.address}>
                                            {store.address}
                                        </td>
                                        <td>{store.city}</td>
                                        <td>{store.region}</td>
                                        <td>
                                            {store.totalArea} / {store.tradeArea} <span className="unit">м²</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'grid' && filteredStores.length > 0 && (
                    <div className="stores-grid">
                        {filteredStores.map(store => (
                            <div className="store-card" key={store.id}>
                                <div className="store-header">
                                    <h3 className="store-name">{store.name}</h3>
                                    <span className={`store-status ${getStatusClass(store.status)}`}>
                                        {getStatusText(store.status)}
                                    </span>
                                </div>

                                <div className="store-info">
                                    <div className="info-row">
                                        <span className="info-label">Код:</span>
                                        <span className="info-value">{store.code}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Адрес:</span>
                                        <span className="info-value">{store.address}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Город:</span>
                                        <span className="info-value">{store.city}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Регион:</span>
                                        <span className="info-value">{store.region}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Общая площадь:</span>
                                        <span className="info-value">{store.totalArea} м²</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Торговая площадь:</span>
                                        <span className="info-value">{store.tradeArea} м²</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredStores.length === 0 && (
                    <div className="empty-state">
                        <p>Магазины не найдены</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stores;
