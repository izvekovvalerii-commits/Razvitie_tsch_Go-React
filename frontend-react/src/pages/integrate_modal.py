#!/usr/bin/env python3
"""
Script to integrate ImprovedTaskModal into ProjectDetails.tsx
Replaces lines 762-1123 with the new component
"""

import sys

# Read the backup (original) file
try:
    with open('ProjectDetails.tsx.backup', 'r', encoding='utf-8') as f:
        lines = f.readlines()
except:
    print("❌ Backup not found, using current file")
    with open('ProjectDetails.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()

# New modal code to insert (properly formatted)
new_modal = """            {/* Edit Task Modal - IMPROVED VERSION */}
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
"""

# Create new file content
# Lines 0-761 (indices 0-760), then new modal, then lines from 1123 onwards (index 1123+)
new_lines = lines[:761] + [new_modal] + lines[1123:]

# Write to new file
with open('ProjectDetails.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ Integration complete!")
print(f"📊 Old file: {len(lines)} lines")
print(f"📊 New file: {len(new_lines)} lines")
print(f"📉 Removed: {len(lines) - len(new_lines)} lines") 
print(f"🎉 Code reduced by {len(lines) - len(new_lines)} lines!")
