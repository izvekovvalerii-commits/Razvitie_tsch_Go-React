-- Add PlannedStartDate column to ProjectTasks
-- This field tracks when a task is planned to start, separate from CreatedAt

ALTER TABLE "ProjectTasks" 
ADD COLUMN IF NOT EXISTS "PlannedStartDate" TIMESTAMP;

-- Initialize PlannedStartDate for existing tasks based on dependencies
-- For tasks without dependencies, use CreatedAt
-- For tasks with dependencies, calculate based on max(NormativeDeadline of dependencies) + 1 day

UPDATE "ProjectTasks" pt
SET "PlannedStartDate" = (
    SELECT COALESCE(
        -- If has dependencies, use max deadline of deps + 1 day
        (
            SELECT MAX(dep."NormativeDeadline") + INTERVAL '1 day'
            FROM "ProjectTasks" dep
            WHERE dep."ProjectId" = pt."ProjectId"
            AND dep."Code" = ANY(
                SELECT jsonb_array_elements_text(pt."DependsOn"::jsonb)
            )
        ),
        -- Otherwise use project creation date or task creation date
        COALESCE(pt."CreatedAt", (SELECT "CreatedAt" FROM "Projects" WHERE "Id" = pt."ProjectId"))
    )
)
WHERE "PlannedStartDate" IS NULL;

-- Verify
SELECT 
    "Id",
    "Name", 
    "PlannedStartDate",
    "NormativeDeadline",
    "CreatedAt"
FROM "ProjectTasks"
ORDER BY "ProjectId", "Id"
LIMIT 10;
