# Инструкция по интеграции ImprovedTaskModal в ProjectDetails.tsx

## Файл уже подготовлен:
- ✅ Импорт добавлен (строка 9): `import { ImprovedTaskModal } from '../components/ImprovedTaskModal';`

## Шаги интеграции:

### Шаг 1: Найти старое модальное окно

Откройте `ProjectDetails.tsx` и найдите **строку 762**:

```typescript
{/* Edit Task Modal */}
{showEditTaskModal && selectedTask && (
    <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
        <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            // ... 361 строка кода старого модального окна ...
        </div>
    </div>
)}
```

Это модальное окно занимает строки **762-1123** (362 строки кода).

---

### Шаг 2: Заменить на новый компонент

**Удалите строки 762-1123** и вставьте вместо них:

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

### Результат:

**Было:**
- 362 строки сложного JSX кода
- Всё в одном файле
- Трудно поддерживать

**Стало:**
- 24 строки чистого кода
- Модульная архитектура
- Легко тестировать и поддерживать
- Современный UI с табами, workflow timeline, метриками

---

### Альтернативный вариант (для тестирования):

Если хотите сначала протестировать новое модальное окно, не удаляя старое:

**Вместо строки 762:**
```typescript
{/* Edit Task Modal */}
{showEditTaskModal && selectedTask && (
```

**Вставьте:**
```typescript
{/* Edit Task Modal - IMPROVED VERSION */}
<ImprovedTaskModal
    task={selectedTask}
    isOpen={showEditTaskModal}
    // ... все props как выше ...
/>

{/* OLD VERSION - FOR COMPARISON (DISABLED) */}
{false && showEditTaskModal && selectedTask && (
```

Тогда старое модальное окно будет отключено (`false &&`), но останется в коде для сравнения.

---

### Проверка после интеграции:

1. ✅ Приложение компилируется без ошибок
2. ✅ При клике на задачу открывается новое модальное окно
3. ✅ Tabs работают (Основное, Документы, История, Комментарии)
4. ✅ Workflow timeline отображается корректно
5. ✅ Кнопки действий отображаются в зависимости от статуса
6. ✅ Метрики (прогресс, дедлайн, приоритет) рассчитываются

---

### Следующие шаги (Фаза 2):

После успешной интеграции, добавьте специфичные поля задач внутрь `ImprovedTaskModal.tsx`:

1. Откройте `/components/ImprovedTaskModal.tsx`
2. Найдите секцию `{/* Task-specific fields would go here */}`
3. Скопируйте туда логику полей из старого модального окна:
   - TASK-PREP-AUDIT → Этап, Плановая дата аудита, Ссылка
   - TASK-AUDIT → Даты аудита
   - TASK-CONTOUR → Дата согласования
   - И т.д.

Подробнее см. `/TASK_MODAL_IMPROVEMENTS.md`

---

## Готово! 🎉

После этих изменений:
- Файл `ProjectDetails.tsx` станет короче на **~350 строк**
- Модальное окно станет многофункциональным и современным
- Код станет модульным и легко поддерживаемым
