--Fix tasks with null CreatedAt by setting it to a reasonable default
-- Use the project's creation date or current timestamp

UPDATE "ProjectTasks" 
SET "CreatedAt" = COALESCE(
    (SELECT "CreatedAt" FROM "Projects" WHERE "Projects"."Id" = "ProjectTasks"."ProjectId"),
    NOW()
)
WHERE "CreatedAt" IS NULL;

-- Verify the update
SELECT COUNT(*) as tasks_with_null_created_at FROM "ProjectTasks" WHERE "CreatedAt" IS NULL;
