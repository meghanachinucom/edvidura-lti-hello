-- Classes, teachers, enrollments, tenant-scoped quizzes (DEC-006 RLS)
-- Apply: Get-Content db/migration_school_org.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

-- Teachers (per school / tenant)
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    teacher_code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, teacher_code)
);

CREATE INDEX IF NOT EXISTS teachers_tenant_idx ON teachers (tenant_id);

-- Classes (multiple per school)
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    class_code TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    term TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, class_code)
);

CREATE INDEX IF NOT EXISTS classes_tenant_idx ON classes (tenant_id);
CREATE INDEX IF NOT EXISTS classes_institution_idx ON classes (institution_id);

CREATE TABLE IF NOT EXISTS class_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'lead'
        CHECK (role IN ('lead', 'assistant')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS class_teachers_tenant_idx ON class_teachers (tenant_id);

CREATE TABLE IF NOT EXISTS class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS class_enrollments_tenant_idx ON class_enrollments (tenant_id);

-- Quizzes owned by tenant (not shared globally)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS quizzes_tenant_idx ON quizzes (tenant_id);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    prompt TEXT NOT NULL,
    choices JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (quiz_id, question_key),
    UNIQUE (quiz_id, position)
);

CREATE INDEX IF NOT EXISTS quiz_questions_quiz_idx ON quiz_questions (quiz_id, position);

-- Optional: link lesson quiz step to a quiz row
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teachers_tenant_isolation ON teachers;
CREATE POLICY teachers_tenant_isolation ON teachers
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS classes_tenant_isolation ON classes;
CREATE POLICY classes_tenant_isolation ON classes
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_teachers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_teachers_tenant_isolation ON class_teachers;
CREATE POLICY class_teachers_tenant_isolation ON class_teachers
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_enrollments_tenant_isolation ON class_enrollments;
CREATE POLICY class_enrollments_tenant_isolation ON class_enrollments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quizzes_tenant_isolation ON quizzes;
CREATE POLICY quizzes_tenant_isolation ON quizzes
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_questions_tenant_isolation ON quiz_questions;
CREATE POLICY quiz_questions_tenant_isolation ON quiz_questions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON
    teachers, classes, class_teachers, class_enrollments, quizzes, quiz_questions
    TO edvidura_app;
