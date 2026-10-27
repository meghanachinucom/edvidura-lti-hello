-- Per-language bodies for manuals (e.g. Sanskrit source → Telugu/Tamil/Hindi per state).
-- Canonical body stays on manual_versions; locales override display language.

ALTER TABLE manuals
    ADD COLUMN IF NOT EXISTS source_language TEXT NOT NULL DEFAULT 'en-IN';

COMMENT ON COLUMN manuals.source_language IS
    'BCP-47 of the canonical manual_versions body (e.g. sa-IN for Sanskrit discourse)';

CREATE TABLE IF NOT EXISTS manual_locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body_md TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (manual_id, language_code)
);

CREATE INDEX IF NOT EXISTS manual_locales_tenant_idx ON manual_locales (tenant_id);
CREATE INDEX IF NOT EXISTS manual_locales_manual_idx ON manual_locales (manual_id);

ALTER TABLE manual_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_locales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS manual_locales_tenant_isolation ON manual_locales;
CREATE POLICY manual_locales_tenant_isolation ON manual_locales
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON manual_locales TO edvidura_app;

-- Optional org defaults: preferred Indian state → language for readers.
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS preferred_state TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN tenants.preferred_state IS
    'IN state/UT code (AP, TN, KA, …) used to pick default manual language';
COMMENT ON COLUMN tenants.preferred_language IS
    'BCP-47 override (te-IN, hi-IN, …); wins over preferred_state when set';
