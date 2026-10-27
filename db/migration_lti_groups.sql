-- LTI Advantage Group Services cache + group-based assignments (AI F-11 / LMS F-6).

CREATE TABLE IF NOT EXISTS lti_context_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lti_context_id TEXT NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT '',
    set_id TEXT NOT NULL DEFAULT '',
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    member_count INT NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'lti-gs',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, lti_context_id, group_id)
);

CREATE INDEX IF NOT EXISTS lti_context_groups_tenant_idx
    ON lti_context_groups (tenant_id, fetched_at DESC);

CREATE TABLE IF NOT EXISTS group_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    group_row_id UUID NOT NULL REFERENCES lti_context_groups(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL DEFAULT 'quiz',
    activity_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_assignments_group_idx
    ON group_assignments (group_row_id, created_at DESC);

ALTER TABLE lti_context_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_context_groups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lti_context_groups_tenant_isolation ON lti_context_groups;
CREATE POLICY lti_context_groups_tenant_isolation ON lti_context_groups
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_assignments_tenant_isolation ON group_assignments;
CREATE POLICY group_assignments_tenant_isolation ON group_assignments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_context_groups TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_assignments TO edvidura_app;
