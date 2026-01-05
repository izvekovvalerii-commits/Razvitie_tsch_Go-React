# 🚀 Быстрая шпаргалка - Интеграция за 5 минут

## 1️⃣ Откройте файл:
```bash
/Users/valeriy.izvekov/Documents/Portal_go_react/frontend-react/src/pages/ProjectDetails.tsx
```

## 2️⃣ Найдите строку 762:
```typescript
{/* Edit Task Modal */}
{showEditTaskModal && selectedTask && (
```

## 3️⃣ Удалите строки 762-1123 (362 строки)

## 4️⃣ Вставьте этот код:

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

## 5️⃣ Сохраните (Cmd+S)

## 6️⃣ Проверьте:
- Откройте `http://localhost:5173/projects/81`
- Кликните на задачу
- ✨ Должно открыться красивое новое модальное окно!

---

## ✅ Готово! Теперь у вас:

✨ Tabs (Основное, Документы, История, Комментарии)  
✨ Workflow timeline  
✨ Метрики (прогресс, дедлайн, приоритет)  
✨ Умные кнопки (меняются по статусу)  
✨ Современный дизайн  
✨ -338 строк кода!  

---

## 📚 Больше информации:

- **IMPROVED_MODAL_README.md** - полное руководство
- **INTEGRATION_GUIDE.md** - детальная инструкция  
- **VISUAL_DIFF.md** - что изменилось
- **TASK_MODAL_IMPROVEMENTS.md** - план развития

---

Время: **5 минут**  
Результат: **Профессиональный UI** 🎉
