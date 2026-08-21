-- Lesson publish workflow + freer reorder (drop unique position)
-- Apply: Get-Content db/migration_lesson_workflow.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lessons_status_check'
    ) THEN
        ALTER TABLE lessons
            ADD CONSTRAINT lessons_status_check
            CHECK (status IN ('draft', 'published', 'archived'));
    END IF;
END $$;

-- Allow temporary position collisions during reorder
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_course_id_position_key;

CREATE INDEX IF NOT EXISTS lessons_course_status_idx
    ON lessons (course_id, status);
