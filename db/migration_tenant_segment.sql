-- School vs corporate tenant profile (segment + capability flags).
-- Existing tenants default to school (full curriculum + quizzes).

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'school'
        CHECK (segment IN ('school', 'corporate'));

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tenants.segment IS
    'school = Moodle class path + graded quiz; corporate = video training, exams off by default';
COMMENT ON COLUMN tenants.capabilities IS
    'Feature flags merged over segment defaults (lessons, manuals, video_library, ask_vidura, quiz_graded, …)';

UPDATE tenants
SET segment = 'school',
    capabilities = COALESCE(capabilities, '{}'::jsonb)
WHERE segment IS NULL OR capabilities IS NULL;
