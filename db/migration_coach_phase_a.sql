-- Phase A coach: teacher-configurable Ask Vidura shortcuts (welcome chips).

CREATE TABLE IF NOT EXISTS coach_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    prompt TEXT NOT NULL,
    position INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_shortcuts_tenant_course_idx
    ON coach_shortcuts (tenant_id, course_id, status, position);

ALTER TABLE coach_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_shortcuts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_shortcuts_tenant_isolation ON coach_shortcuts;
CREATE POLICY coach_shortcuts_tenant_isolation ON coach_shortcuts
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON coach_shortcuts TO edvidura_app;
