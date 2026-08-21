-- Support incidents + optional indexes for specials
-- Apply: Get-Content db/migration_specials.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

CREATE TABLE IF NOT EXISTS support_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL DEFAULT '',
    learner_name TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_incidents_tenant_created_idx
    ON support_incidents (tenant_id, created_at DESC);

ALTER TABLE support_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_incidents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_incidents_tenant_isolation ON support_incidents;
CREATE POLICY support_incidents_tenant_isolation ON support_incidents
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON support_incidents TO edvidura_app;
