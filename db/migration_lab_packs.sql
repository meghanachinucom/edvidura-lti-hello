-- Adaptive interactive labs: school-owned textbook chapters → lab packs (tenant RLS).

CREATE TABLE IF NOT EXISTS lab_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID REFERENCES manuals(id) ON DELETE CASCADE,
    chapter_slug TEXT NOT NULL DEFAULT 'overview',
    title TEXT NOT NULL DEFAULT '',
    playground_type TEXT NOT NULL DEFAULT 'cartesian',
    age_band TEXT NOT NULL DEFAULT 'secondary',
    status TEXT NOT NULL DEFAULT 'draft',
    pack JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT lab_packs_status_chk CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT lab_packs_band_chk CHECK (age_band IN ('foundations', 'core', 'secondary'))
);

CREATE UNIQUE INDEX IF NOT EXISTS lab_packs_tenant_manual_chapter_uidx
    ON lab_packs (tenant_id, manual_id, chapter_slug)
    WHERE manual_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lab_packs_tenant_status_idx
    ON lab_packs (tenant_id, status);

ALTER TABLE lab_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_packs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lab_packs_tenant_isolation ON lab_packs;
CREATE POLICY lab_packs_tenant_isolation ON lab_packs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON lab_packs TO edvidura_app;
