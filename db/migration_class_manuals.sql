-- Class-scoped manuals (students only see manuals linked to their LTI class)
-- Apply via scripts/apply_migrations.py

CREATE TABLE IF NOT EXISTS class_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, manual_id)
);

CREATE INDEX IF NOT EXISTS class_manuals_tenant_idx ON class_manuals (tenant_id);
CREATE INDEX IF NOT EXISTS class_manuals_manual_idx ON class_manuals (manual_id);
CREATE INDEX IF NOT EXISTS class_manuals_class_idx ON class_manuals (class_id);

ALTER TABLE class_manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_manuals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_manuals_tenant_isolation ON class_manuals;
CREATE POLICY class_manuals_tenant_isolation ON class_manuals
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON class_manuals TO edvidura_app;
