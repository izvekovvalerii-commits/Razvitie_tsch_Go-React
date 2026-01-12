-- Add related entity fields to notifications table
ALTER TABLE notifications 
ADD COLUMN related_project_id INTEGER,
ADD COLUMN related_task_id INTEGER;

-- Add indexes for better query performance
CREATE INDEX idx_notifications_related_project ON notifications(related_project_id);
CREATE INDEX idx_notifications_related_task ON notifications(related_task_id);
