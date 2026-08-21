-- Versioned technical manuals / eBook path (Slice B start)
-- Apply: Get-Content db/migration_manuals.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

CREATE TABLE IF NOT EXISTS manuals (
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

CREATE TABLE IF NOT EXISTS manual_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    changelog TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_subject TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    UNIQUE (manual_id, version)
);

CREATE INDEX IF NOT EXISTS manuals_tenant_status_idx ON manuals (tenant_id, status);
CREATE INDEX IF NOT EXISTS manual_versions_manual_idx
    ON manual_versions (manual_id, version DESC);

ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS manuals_tenant_isolation ON manuals;
CREATE POLICY manuals_tenant_isolation ON manuals
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE manual_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS manual_versions_tenant_isolation ON manual_versions;
CREATE POLICY manual_versions_tenant_isolation ON manual_versions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON manuals, manual_versions TO edvidura_app;
