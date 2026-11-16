-- School admins (one school = one tenant; each school has its own admin)
-- Moodle site admin creates schools; school admin manages that school only.
-- Apply: Get-Content db/migration_school_admins.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

CREATE TABLE IF NOT EXISTS school_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    admin_code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    subject TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, admin_code)
);

ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS subject TEXT;

CREATE INDEX IF NOT EXISTS school_admins_tenant_idx ON school_admins (tenant_id);
CREATE INDEX IF NOT EXISTS school_admins_tenant_subject_idx ON school_admins (tenant_id, subject);
CREATE UNIQUE INDEX IF NOT EXISTS school_admins_tenant_subject_uniq ON school_admins (tenant_id, subject) WHERE subject IS NOT NULL;

ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admins FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_admins_tenant_isolation ON school_admins;
CREATE POLICY school_admins_tenant_isolation ON school_admins
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON school_admins TO edvidura_app;
