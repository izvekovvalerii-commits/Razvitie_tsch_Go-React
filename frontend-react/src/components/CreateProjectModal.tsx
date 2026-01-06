import React, { useState } from 'react';
import { Modal } from './common/Modal'; // Assuming generic Modal is here
import { Project, Store } from '../types';
import { PROJECT_TYPES, CFO_LIST, MANAGERS } from '../constants';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Project) => Promise<void>;
    stores: Store[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    isOpen,
    onClose,
    onSave,
    stores
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
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

    const handleSave = async () => {
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
        } as Project;

        setIsSaving(true);
        try {
            await onSave(projectToCreate);
            handleClose();
        } catch (e) {
            // Error handling usually in parent, but we can stop loading
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setNewProject({
            projectType: '',
            status: 'Создан',
            mp: '',
            cfo: '',
            gisCode: ''
        });
        setSelectedStoreId(undefined);
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Создать новый проект"
            footer={(
                <>
                    <button className="btn-cancel" onClick={handleClose} disabled={isSaving}>Отмена</button>
                    <button className="btn-create" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Сохранение...' : 'Создать'}
                    </button>
                </>
            )}
        >
            <div className="form-group">
                <label>Выберите магазин *</label>
                <select
                    value={selectedStoreId || ''}
                    onChange={e => handleStoreSelect(e.target.value)}
                    className="modern-input"
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
                    className="modern-input"
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
                    className="modern-input"
                />
            </div>

            <div className="form-group">
                <label>ЦФО *</label>
                <select
                    value={newProject.cfo || ''}
                    onChange={e => setNewProject({ ...newProject, cfo: e.target.value })}
                    className="modern-input"
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
                    className="modern-input"
                >
                    <option value="">-- Выберите менеджера --</option>
                    {MANAGERS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
            </div>
        </Modal>
    );
};
