# 🎨 Улучшенное модальное окно задачи - Руководство

## ✅ Что уже реализовано

### 1. **Новый компонент**
- ✅ `ImprovedTaskModal.tsx` - улучшенный компонент модального окна
- ✅ `ImprovedTaskModal.css` - современные стили с анимациями

### 2. **Реализованные улучшения**

#### 🎯 Шапка модального окна:
- ✅ Код задачи как бейдж (TASK-PREP-AUDIT)
- ✅ Статус-бейдж с цветовым кодированием
- ✅ Прогресс-бар (0%, 50%, 100%)
- ✅ Индикатор времени до дедлайна с предупреждениями
- ✅ Автоматический расчет приоритета

#### 🔄 Workflow Timeline:
- ✅ Визуальный workflow с 3 узлами
- ✅ Предшественник → Текущая задача → Последователь
- ✅ Подсветка текущей задачи
- ✅ Автоматическая загрузка зависимостей из workflow config

#### 📑 Табы:
-  ✅ **Основное** - основные поля задачи
- ✅ **Документы** - загрузка и управление документами  
- ✅ **История** - лог изменений (заглушка)
- ✅ **Комментарии** - обсуждения (заглушка)
- ✅ Счетчики на табах

#### 🎨 Форма:
- ✅ Двухколоночный layout
- ✅ Приоритет (автоматический расчет)
- ✅ Плановая/нормативная/фактическая даты
- ✅ Подсказки для полей

#### 🎬 Умные кнопки действий:
- ✅ "В работу" - только для статуса "Назначена"
- ✅ "Приостановить" + "Завершить" - для статуса "В работе"
- ✅ "Вернуть в работу" - для статуса "Завершена"
- ✅ Проверка прав доступа (canTakeTask, hasEditPermission)

#### ✨ Визуальные улучшения:
- ✅ Плавные анимации (fadeIn, slideUp)
- ✅ Градиенты на кнопках
- ✅ Пульсация для просроченных задач
- ✅ Адаптивный дизайн (мобильная версия)
- ✅ Современная цветовая палитра

---

## 🔧 Интеграция в ProjectDetails.tsx

### Шаг 1: Импортировать компонент

```typescript
import { ImprovedTaskModal } from '../components/ImprovedTaskModal';
```

### Шаг 2: Заменить существующее модальное окно

**Было:**
```tsx
{showEditTaskModal && selectedTask && (
    <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
        <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            {/* Старый код */}
        </div>
    </div>
)}
```

**Стало:**
```tsx
<ImprovedTaskModal
    task={selectedTask}
    isOpen={showEditTaskModal}
    onClose={() => setShowEditTaskModal(false)}
    onSave={handleUpdateTask}
    onUpdateStatus={(taskId, status) => tasksService.updateTaskStatus(taskId, status)}
    onComplete={handleCompleteTaskFromModal}
    workflowConfig={workflowConfig}
    projectDocs={projectDocs}
    onDocumentUpload={async (file, docType) => {
        const uploaded = await documentsService.upload(file, project!.id, docType, selectedTask?.id);
        setProjectDocs(prev => [...prev, uploaded]);
    }}
    onDocumentDelete={deleteDoc}
    canTakeTask={selectedTask ? canUserTakeTask(selectedTask) : false}
    hasEditPermission={hasPermission('task:edit') || (selectedTask && canUserTakeTask(selectedTask) && hasPermission('task:edit_own'))}
/>
```

---

## 🚀 Следующие шаги (TODO)

### Фаза 1: Интеграция специфичных полей задач (приоритет: высокий)

Нужно добавить рендеринг полей в зависимости от `task.code`:

```tsx
// В ImprovedTaskModal.tsx, в секции tab-content "basic"
{editedTask.code === 'TASK-PREP-AUDIT' && (
    <>
        <div className="field-group">
            <label>📅 Плановая дата аудита *</label>
            <input 
                type="date"
                className="modern-input"
                value={editedTask.plannedAuditDate ? new Date(editedTask.plannedAuditDate).toISOString().split('T')[0] : ''}
                onChange={e => setEditedTask({ 
                    ...editedTask, 
                    plannedAuditDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                })}
            />
        </div>
        <div className="field-group">
            <label>🔗 Ссылка на папку проекта *</label>
            <input 
                type="text"
                className="modern-input"
                value={editedTask.projectFolderLink || ''}
                onChange={e => setEditedTask({ ...editedTask, projectFolderLink: e.target.value })}
            />
        </div>
    </>
)}

// Аналогично для других задач: TASK-AUDIT, TASK-CONTOUR, и т.д.
```

### Фаза 2: Вкладка "Документы" (приоритет: высокий)

Добавить компонент загрузки документов:

```tsx
{activeTab === 'documents' && (
    <div className="tab-content">
        <div className="documents-section">
            <h3>📂 Обязательные документы</h3>
            
            {/* Для TASK-PREP-AUDIT */}
            {editedTask.code === 'TASK-PREP-AUDIT' && (
                <DocumentUploadBlock
                    docType="Технический план"
                    label="Технический план *"
                    existingDocs={taskDocs.filter(d => d.type === 'Технический план')}
                    onUpload={onDocumentUpload}
                    onDelete={onDocumentDelete}
                />
            )}
            
            {/* Аналогично для других задач */}
        </div>
    </div>
)}
```

### Фаза 3: Вкладка "История" (приоритет: средний)

Создать новый endpoint в backend:

```go
// backend-go/routes/routes.go
api.GET("/tasks/:id/history", tasksController.GetTaskHistory)
```

```tsx
// Frontend
const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([]);

useEffect(() => {
    if (editedTask) {
        tasksService.getTaskHistory(editedTask.id)
            .then(setTaskHistory);
    }
}, [editedTask]);

// В табе история:
{taskHistory.map(item => (
    <div key={item.id} className="history-item">
        <div className="history-avatar">{item.user.initials}</div>
        <div className="history-content">
            <div className="history-action">{item.action}</div>
            <div className="history-time">{formatDate(item.createdAt)}</div>
        </div>
    </div>
))}
```

### Фаза 4: Вкладка "Комментарии" (приоритет: средний)

Создать систему комментариев:

```typescript
interface TaskComment {
    id: number;
    taskId: number;
    userId: number;
    user: { name: string; avatar: string };
    text: string;
    createdAt: string;
}

// Компонент комментариев
<div className="comments-list">
    {comments.map(comment => (
        <div key={comment.id} className="comment-card">
            <div className="comment-avatar">{comment.user.avatar}</div>
            <div className="comment-body">
                <div className="comment-header">
                    <strong>{comment.user.name}</strong>
                    <span className="comment-time">{formatTime(comment.createdAt)}</span>
                </div>
                <div className="comment-text">{comment.text}</div>
            </div>
        </div>
    ))}
</div>
```

### Фаза 5: Валидация (приоритет: высокий)

Добавить визуальную валидацию:

```tsx
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

const validateTask = () => {
    const errors: Record<string, string> = {};
    
    if (editedTask.code === 'TASK-PREP-AUDIT') {
        if (!editedTask.plannedAuditDate) {
            errors.plannedAuditDate = 'Поле обязательно';
        }
        if (!editedTask.projectFolderLink) {
            errors.projectFolderLink = 'Поле обязательно';
        }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
};

// В форме:
<input 
    className={`modern-input ${validationErrors.plannedAuditDate ? 'error' : ''}`}
    // ...
/>
{validationErrors.plannedAuditDate && (
    <span className="error-message">{validationErrors.plannedAuditDate}</span>
)}
```

### Фаза 6: Auto-save (приоритет: низкий)

Добавить автосохранение черновика:

```tsx
const [lastSaved, setLastSaved] = useState<string>('');

useEffect(() => {
    const timer = setTimeout(() => {
        if (editedTask && JSON.stringify(editedTask) !== JSON.stringify(task)) {
            localStorage.setItem(`task-draft-${editedTask.id}`, JSON.stringify(editedTask));
            setLastSaved(new Date().toLocaleTimeString());
        }
    }, 5000); // Auto-save через 5 секунд

    return () => clearTimeout(timer);
}, [editedTask, task]);

// Отображение статуса сохранения
{lastSaved && (
    <div className="autosave-indicator">
        ✓ Сохранено в {lastSaved}
    </div>
)}
```

### Фаза 7: Клавиатурные шорткаты (приоритет: низкий)

```tsx
useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+S - Сохранить
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
        
        // Esc - Закрыть
        if (e.key === 'Escape') {
            onClose();
        }
        
        // Ctrl+Enter - Основное действие
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (editedTask.status === 'Назначена' && canTakeTask) {
                handleAction('start');
            } else if (editedTask.status === 'В работе') {
                handleAction('complete');
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [editedTask, canTakeTask]);
```

---

## 🎨 Дополнительные визуальные улучшения

### Микроанимации:

```css
/* Пульсация кнопки основного действия */
@keyframes pulse-button {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
}

.btn-start {
    animation: pulse-button 2s infinite;
}

/* Появление полей */
.field-group {
    animation: slideInLeft 0.3s ease;
}

@keyframes slideInLeft {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}
```

### Индикаторы обязательности:

```tsx
<label>
    📅 Плановая дата аудита 
    <span className="required-asterisk">*</span>
</label>
```

```css
.required-asterisk {
    color: #ef4444;
    margin-left: 4px;
    font-weight: 700;
}

.field-group.filled label::before {
    content: '✓';
    color: #10b981;
    margin-right: 4px;
}
```

---

## 📊 Метрики и аналитика (будущие улучшения)

1. **Время выполнения задач**
2. **Среднее отклонение от плана**
3. **Рейтинг эффективности исполнителя**
4. **Статистика по типам задач**

---

## ✅ Checklist интеграции

- [ ] Импортировать `ImprovedTaskModal` в `ProjectDetails.tsx`
- [ ] Заменить старое модальное окно редактирования
- [ ] Добавить специфичные поля для каждого типа задачи
- [ ] Интегрировать `DocumentUploadBlock` во вкладку "Документы"
- [ ] Создать backend endpoint для истории задач
- [ ] Реализовать систему комментариев
- [ ] Добавить валидацию перед завершением задачи
- [ ] Реализовать auto-save (опционально)
- [ ] Добавить клавиатурные шорткаты (опционально)
- [ ] Протестировать на всех типах задач
- [ ] Протестировать на мобильных устройствах

---

Готово! Улучшенное модальное окно создано и готово к интеграции! 🎉
