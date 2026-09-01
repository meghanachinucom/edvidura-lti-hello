-- C13: SME chatbot source registry (tenant-scoped, RLS).
-- Approved manuals / lessons the study coach may cite (version-pinnable).

CREATE TABLE IF NOT EXISTS sme_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_kind TEXT NOT NULL
        CHECK (source_kind IN ('manual', 'lesson')),
    manual_id UUID REFERENCES manuals(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    pin_version INT,
    focus_slug TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    position INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sme_sources_target_chk CHECK (
        (source_kind = 'manual' AND manual_id IS NOT NULL AND lesson_id IS NULL)
        OR (source_kind = 'lesson' AND lesson_id IS NOT NULL AND manual_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS sme_sources_tenant_idx
    ON sme_sources (tenant_id, status, position);

CREATE UNIQUE INDEX IF NOT EXISTS sme_sources_manual_active_uq
    ON sme_sources (
        tenant_id,
        manual_id,
        COALESCE(pin_version, 0),
        focus_slug
    )
    WHERE source_kind = 'manual' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS sme_sources_lesson_active_uq
    ON sme_sources (tenant_id, lesson_id, focus_slug)
    WHERE source_kind = 'lesson' AND status = 'active';

ALTER TABLE sme_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sme_sources FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sme_sources_tenant_isolation ON sme_sources;
CREATE POLICY sme_sources_tenant_isolation ON sme_sources
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON sme_sources TO edvidura_app;
