-- xAPI statements store (tenant-owned, RLS) — analytics, not gradebook SoR
-- Apply: Get-Content db/migration_xapi_statements.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

CREATE TABLE IF NOT EXISTS xapi_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    statement_id UUID NOT NULL,
    verb_id TEXT NOT NULL,
    actor_sub TEXT NOT NULL DEFAULT '',
    object_id TEXT NOT NULL,
    statement JSONB NOT NULL,
    source_event_id UUID,
    attempt_id UUID,
    sent_to_lrs BOOLEAN NOT NULL DEFAULT FALSE,
    lrs_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (statement_id)
);

CREATE INDEX IF NOT EXISTS xapi_statements_tenant_created_idx
    ON xapi_statements (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS xapi_statements_tenant_verb_idx
    ON xapi_statements (tenant_id, verb_id);

ALTER TABLE xapi_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xapi_statements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS xapi_statements_tenant_isolation ON xapi_statements;
CREATE POLICY xapi_statements_tenant_isolation ON xapi_statements
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON xapi_statements TO edvidura_app;
