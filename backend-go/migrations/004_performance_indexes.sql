-- Performance Indexes for Portal Razvitie
-- These indexes optimize the most common query patterns

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
    ON "ProjectTasks"("ProjectId");

CREATE INDEX IF NOT EXISTS idx_tasks_status 
    ON "ProjectTasks"("Status");

CREATE INDEX IF NOT EXISTS idx_tasks_responsible 
    ON "ProjectTasks"("ResponsibleUserId") 
    WHERE "ResponsibleUserId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_deadline 
    ON "ProjectTasks"("NormativeDeadline");

-- Composite indexes for common JOIN queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
    ON "ProjectTasks"("ProjectId", "Status");

CREATE INDEX IF NOT EXISTS idx_tasks_responsible_status 
    ON "ProjectTasks"("ResponsibleUserId", "Status") 
    WHERE "ResponsibleUserId" IS NOT NULL;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
    ON "Notification"("UserID", "IsRead");

CREATE INDEX IF NOT EXISTS idx_notifications_created 
    ON "Notification"("UserID", "CreatedAt" DESC);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_project 
    ON "ProjectDocuments"("ProjectId");

CREATE INDEX IF NOT EXISTS idx_documents_task 
    ON "ProjectDocuments"("TaskId") 
    WHERE "TaskId" IS NOT NULL;

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_store 
    ON "Projects"("StoreId");

CREATE INDEX IF NOT EXISTS idx_projects_status 
    ON "Projects"("Status");

-- Role Permissions (for RBAC cache)
CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
    ON "role_permissions"("RoleID");

-- Analyze tables to update statistics
ANALYZE "ProjectTasks";
ANALYZE "Projects";
ANALYZE "Notification";
ANALYZE "ProjectDocuments";
ANALYZE "role_permissions";

-- Show created indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
