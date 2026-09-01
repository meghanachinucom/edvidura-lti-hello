-- LTI Advantage NRPS roster cache (Moodle owns people; we cache awareness only).

CREATE TABLE IF NOT EXISTS lti_context_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lti_context_id TEXT NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    member_count INT NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'nrps',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, lti_context_id)
);

CREATE INDEX IF NOT EXISTS lti_context_rosters_tenant_idx
    ON lti_context_rosters (tenant_id, fetched_at DESC);

ALTER TABLE lti_context_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_context_rosters FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lti_context_rosters_tenant_isolation ON lti_context_rosters;
CREATE POLICY lti_context_rosters_tenant_isolation ON lti_context_rosters
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_context_rosters TO edvidura_app;
