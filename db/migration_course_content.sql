-- Tenant-isolated course content (DEC-006 RLS)
-- Apply: docker exec -i db-db-1 psql -U edvidura -d edvidura -f - < db/migration_course_content.sql

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS courses_tenant_status_idx
    ON courses (tenant_id, status);

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    position INT NOT NULL DEFAULT 1,
    lesson_type TEXT NOT NULL DEFAULT 'article'
        CHECK (lesson_type IN ('article', 'video', 'quiz')),
    body_md TEXT NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, slug),
    UNIQUE (course_id, position)
);

CREATE INDEX IF NOT EXISTS lessons_course_position_idx
    ON lessons (course_id, position);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lesson_id, subject)
);

CREATE INDEX IF NOT EXISTS lesson_progress_learner_idx
    ON lesson_progress (tenant_id, course_id, subject);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courses_tenant_isolation ON courses;
CREATE POLICY courses_tenant_isolation ON courses
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lessons_tenant_isolation ON lessons;
CREATE POLICY lessons_tenant_isolation ON lessons
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_progress_tenant_isolation ON lesson_progress;
CREATE POLICY lesson_progress_tenant_isolation ON lesson_progress
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON courses, lessons, lesson_progress TO edvidura_app;

-- Seed Tenant A curriculum (isolated content)
INSERT INTO courses (id, tenant_id, slug, title, description, status)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'readiness-check',
    'Course readiness check',
    'Short lessons, then a quiz. Scores can sync to Moodle.',
    'published'
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

INSERT INTO lessons (id, tenant_id, course_id, slug, title, position, lesson_type, body_md, video_url)
VALUES
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'welcome',
    'Welcome to EdVidura',
    1,
    'article',
    $md$You opened this tool from Moodle through a trusted LTI launch.

That means Moodle already verified who you are and which course you came from. EdVidura does not ask for a separate password.

In the next lessons you will see how your school’s data stays private, then take a short quiz.$md$,
    ''
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'your-space',
    'Your school’s private space',
    2,
    'article',
    $md$Many schools can use the same EdVidura product — but each school has its own sealed workspace.

Your attempts and progress stay with your institution. Another school cannot read your rows.

That isolation is enforced in the database for every tenant-owned table.$md$,
    ''
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'watch-overview',
    'How launch works (video)',
    3,
    'video',
    $md$Watch this short overview of LTI tool launch, then continue to the quiz.

(Replace the sample URL with your institution’s video when ready.)$md$,
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'quiz',
    'Readiness quiz',
    4,
    'quiz',
    $md$Complete the quiz to check what you learned. Your score is saved for this school and may sync to Moodle.$md$,
    ''
)
ON CONFLICT (course_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    position = EXCLUDED.position,
    lesson_type = EXCLUDED.lesson_type,
    body_md = EXCLUDED.body_md,
    video_url = EXCLUDED.video_url;

-- Seed Tenant B with different content (proves isolation)
INSERT INTO courses (id, tenant_id, slug, title, description, status)
VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'tenant-b-only',
    'Tenant B private course',
    'This course must never appear under Tenant A.',
    'published'
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

INSERT INTO lessons (id, tenant_id, course_id, slug, title, position, lesson_type, body_md, video_url)
VALUES (
    'ffffffff-ffff-ffff-ffff-fffffffffff1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'secret',
    'Tenant B secret lesson',
    1,
    'article',
    'If Tenant A can see this text, content isolation is broken.',
    ''
)
ON CONFLICT (course_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    body_md = EXCLUDED.body_md;
