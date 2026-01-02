-- Migration: Add DEFAULT value and trigger for CreatedAt field
-- This ensures all new tasks automatically get a CreatedAt timestamp

-- Step 1: Add DEFAULT for future records
ALTER TABLE "ProjectTasks" 
ALTER COLUMN "CreatedAt" SET DEFAULT NOW();

-- Step 2: Create trigger function to ensure CreatedAt is never null
CREATE OR REPLACE FUNCTION ensure_task_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."CreatedAt" IS NULL THEN
        NEW."CreatedAt" = COALESCE(
            (SELECT "CreatedAt" FROM "Projects" WHERE "Id" = NEW."ProjectId"),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger
DROP TRIGGER IF EXISTS set_task_created_at ON "ProjectTasks";
CREATE TRIGGER set_task_created_at
    BEFORE INSERT OR UPDATE ON "ProjectTasks"
    FOR EACH ROW
    EXECUTE FUNCTION ensure_task_created_at();

-- Verification: Check for any remaining NULL values
SELECT COUNT(*) as null_created_at_count 
FROM "ProjectTasks" 
WHERE "CreatedAt" IS NULL;
