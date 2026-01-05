# Визуальное сравнение: До и После

## 📊 Статистика изменений:

```
Файл: ProjectDetails.tsx
Строки для замены: 762-1123 (362 строки)
Новый код: 24 строки
Экономия: 338 строк (-29% от файла)
```

---

## ❌ УДАЛИТЬ (строки 762-1123):

```typescript
{/* Edit Task Modal */}
{showEditTaskModal && selectedTask && (
    <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
        <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>{selectedTask.name}</h2>
                <button className="btn-close-modal">×</button>
            </div>

            <div className="modal-form-grid">
                {/* Dependency Box */}
                {selectedTask.code && (
                    <div className="dependency-box">
                        {/* 40 строк кода зависимостей */}
                    </div>
                )}

                {/* Main Info */}
                <div className="form-section-title">Основная информация</div>
                
                <div className="field-group">
                    <label>Ответственный</label>
                    <input type="text" value={selectedTask.responsible} readOnly />
                </div>

                <div className="field-group">
                    <label>Статус</label>
                    <select value={selectedTask.status}>
                        <option>Назначена</option>
                        <option>В работе</option>
                        <option>Завершена</option>
                    </select>
                </div>

                {/* TASK-PREP-AUDIT fields */}
                {selectedTask.code === 'TASK-PREP-AUDIT' && (
                    <>
                        <div className="field-group">
                            <label>Этап</label>
                            <select>{/* ... */}</select>
                        </div>
                        <div className="field-group">
                            <label>Плановая дата аудита</label>
                            <input type="date" />
                        </div>
                        <div className="field-group">
                            <label>Ссылка на папку проекта</label>
                            <input type="text" />
                        </div>
                        <DocumentUploadBlock docType="Технический план" />
                    </>
                )}

                {/* TASK-AUDIT fields */}
                {selectedTask.name === 'Аудит объекта' && (
                    <>
                        {/* 20 строк */}
                    </>
                )}

                {/* TASK-ALCO-LIC fields */}
                {selectedTask.name === 'Алкогольная лицензия' && (
                    <>
                        {/* 15 строк */}
                    </>
                )}

                {/* TASK-WASTE fields */}
                {selectedTask.name === 'Площадка ТБО' && (
                    <>
                        {/* 30 строк */}
                    </>
                )}

                {/* TASK-CONTOUR fields */}
                {selectedTask.name === 'Контур планировки' && (
                    <>
                        {/* 25 строк */}
                    </>
                )}

                {/* TASK-VISUALIZATION fields */}
                {selectedTask.name === 'Визуализация' && (
                    <>
                        {/* 20 строк */}
                    </>
                )}

                {/* TASK-LOGISTICS fields */}
                {selectedTask.name === 'Оценка логистики' && (
                    <>
                        {/* 25 строк */}
                    </>
                )}

                {/* TASK-LAYOUT fields */}
                {selectedTask.name === 'Планировка с расстановкой' && (
                    <>
                        {/* 20 строк */}
                    </>
                )}

                {/* TASK-BUDGET-EQUIP fields */}
                {selectedTask.code === 'TASK-BUDGET-EQUIP' && (
                    <>
                        {/* 15 строк */}
                    </>
                )}

                {/* TASK-BUDGET-SECURITY fields */}
                {selectedTask.code === 'TASK-BUDGET-SECURITY' && (
                    <>
                        {/* 20 строк */}
                    </>
                )}

                {/* TASK-BUDGET-RSR fields */}
                {selectedTask.code === 'TASK-BUDGET-RSR' && (
                    <>
                        {/* 20 строк */}
                    </>
                )}

                {/* TASK-BUDGET-PIS fields */}
                {selectedTask.code === 'TASK-BUDGET-PIS' && (
                    <>
                        {/* 10 строк */}
                    </>
                )}

                {/* TASK-TOTAL-BUDGET fields */}
                {selectedTask.code === 'TASK-TOTAL-BUDGET' && (
                    <>
                        {/* 10 строк */}
                    </>
                )}

                {/* Timeline Group */}
                <div className="form-section-title">Сроки выполнения</div>
                <div className="field-group">
                    <label>Плановый срок</label>
                    <input type="date" readOnly />
                </div>
                <div className="field-group">
                    <label>Фактический срок</label>
                    <input type="date" readOnly />
                </div>

                {/* Deviation */}
                {getTaskDeviation(selectedTask) && (
                    <div className="field-group">
                        {/* 15 строк */}
                    </div>
                )}

                {/* Chronology */}
                <div className="form-section-title">Хронология</div>
                {selectedTask.createdAt && (
                    <div className="field-group">
                        <label>Назначено</label>
                        <div>{/* timestamp */}</div>
                    </div>
                )}
                {selectedTask.startedAt && (
                    <div className="field-group">
                        <label>Взято в работу</label>
                        <div>{/* timestamp */}</div>
                    </div>
                )}
                {selectedTask.completedAt && (
                    <div className="field-group">
                        <label>Завершено</label>
                        <div>{/* timestamp */}</div>
                    </div>
                )}
            </div>

            <div className="modal-actions">
                <button onClick={() => setShowEditTaskModal(false)}>Отмена</button>
                {canUserTakeTask(selectedTask) && (
                    <button onClick={/* В работу */}>▶ В работу</button>
                )}
                {selectedTask.status !== 'Завершена' && (
                    <button onClick={handleCompleteTaskFromModal}>✓ Завершить</button>
                )}
                <button onClick={handleUpdateTask}>Сохранить</button>
            </div>
        </div>
    </div>
)}
```

---

## ✅ ВСТАВИТЬ (вместо строк 762-1123):

```typescript
{/* Edit Task Modal - IMPROVED VERSION */}
<ImprovedTaskModal
    task={selectedTask}
    isOpen={showEditTaskModal}
    onClose={() => setShowEditTaskModal(false)}
    onSave={handleUpdateTask}
    onUpdateStatus={async (taskId, status) => {
        await tasksService.updateTaskStatus(taskId, status);
        loadProjectTasks();
        setShowEditTaskModal(false);
    }}
    onComplete={handleCompleteTaskFromModal}
    workflowConfig={workflowConfig}
    projectDocs={projectDocs}
    onDocumentUpload={async (file, docType) => {
        if (!project) return;
        const uploaded = await documentsService.upload(file, project.id, docType, selectedTask?.id);
        setProjectDocs(prev => [...prev, uploaded]);
    }}
    onDocumentDelete={deleteDoc}
    canTakeTask={selectedTask ? canUserTakeTask(selectedTask) : false}
    hasEditPermission={hasPermission('task:edit') || (selectedTask ? canUserTakeTask(selectedTask) && hasPermission('task:edit_own') : false)}
/>
```

---

## 🎯 Что вы получаете:

### Функционал (всё работает как раньше + новое):

✅ Все поля задачи  
✅ Валидация  
✅ Документы  
✅ Статусы  
✅ Права доступа  
**ПЛЮС:**  
✨ Табы (Основное, Документы, История, Комментарии)  
✨ Workflow timeline (Предшественник → Текущая → Последователь)  
✨ Метрики (Прогресс, Дедлайн, Приоритет)  
✨ Умные кнопки (меняются в зависимости от статуса)  
✨ Анимации и градиенты  
✨ Адаптивный дизайн  

### Код:

✅ -338 строк кода  
✅ Модульная архитектура  
✅ Легко тестировать  
✅ Легко расширять  

---

## 📝 Как применить:

### Способ 1: Вручную (рекомендуется)

1. Откройте `ProjectDetails.tsx` в редакторе
2. Найдите строку 762: `{/* Edit Task Modal */}`
3. Выделите строки 762-1123
4. Удалите
5. Вставьте код из файла `/INTEGRATION_CODE.tsx`
6. Сохраните
7. Проверьте - не должно быть ошибок компиляции

### Способ 2: Git diff (для опытных)

```bash
# Создайте коммит с текущей версией
git add .
git commit -m "Before ImprovedTaskModal integration"

# Примените изменения
# ... вручную как в способе 1 ...

# Создайте коммит с новой версией
git add .
git commit -m "Integrated ImprovedTaskModal"

# Посмотрите diff
git diff HEAD~1
```

---

## ✅ Проверка после интеграции:

```bash
# Terminal 1 - убедитесь что frontend компилируется
npm run dev

# Откройте http://localhost:5173/projects/81
# Кликните на любую задачу
# Должно открыться новое модальное окно с:
# - Шапкой с метриками
# - Workflow timeline
# - Табами
# - Умными кнопками
```

---

Готово! 🎉
