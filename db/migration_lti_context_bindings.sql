-- Phase 7: Moodle LTI context → EdVidura class + curriculum course.
-- Apply: python scripts/apply_migrations.py

-- Optional curriculum link on each class (subject learning path)
ALTER TABLE classes
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS classes_course_idx ON classes (course_id)
    WHERE course_id IS NOT NULL;

-- One Moodle course/context → one EdVidura class (per tenant)
CREATE TABLE IF NOT EXISTS lti_context_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lti_context_id TEXT NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    context_label TEXT NOT NULL DEFAULT '',
    context_title TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, lti_context_id)
);

CREATE INDEX IF NOT EXISTS lti_context_bindings_tenant_idx
    ON lti_context_bindings (tenant_id);
CREATE INDEX IF NOT EXISTS lti_context_bindings_class_idx
    ON lti_context_bindings (class_id);

ALTER TABLE lti_context_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_context_bindings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lti_context_bindings_tenant_isolation ON lti_context_bindings;
CREATE POLICY lti_context_bindings_tenant_isolation ON lti_context_bindings
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_context_bindings TO edvidura_app;
