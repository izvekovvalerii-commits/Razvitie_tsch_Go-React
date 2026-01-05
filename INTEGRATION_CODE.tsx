// ============================================
// INTEGRATION CODE FOR ProjectDetails.tsx
// ============================================

// *** REPLACE LINES 762-1123 WITH THIS CODE: ***

{/* Edit Task Modal - IMPROVED VERSION */ }
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

// ============================================
// END OF INTEGRATION CODE
// ============================================

// RESULT:
// - Old modal: 362 lines removed
// - New modal: 24 lines added
// - Net change: -338 lines!
// - File size reduced by ~30%
