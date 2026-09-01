-- D08: Competency framework import drafts + TO→skill review queue.

CREATE TABLE IF NOT EXISTS skill_framework_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_label TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'json'
        CHECK (format IN ('json', 'csv')),
    payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS skill_framework_imports_tenant_idx
    ON skill_framework_imports (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS skill_external_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    system TEXT NOT NULL DEFAULT 'ieee',
    external_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, system, external_id)
);

CREATE INDEX IF NOT EXISTS skill_external_ids_skill_idx
    ON skill_external_ids (skill_id);

CREATE TABLE IF NOT EXISTS to_skill_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    to_code TEXT NOT NULL,
    to_label TEXT NOT NULL DEFAULT '',
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    skill_code TEXT NOT NULL DEFAULT '',
    confidence REAL NOT NULL DEFAULT 0.5,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    proposed_by TEXT NOT NULL DEFAULT 'import',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS to_skill_proposals_tenant_idx
    ON to_skill_proposals (tenant_id, status, created_at DESC);

ALTER TABLE skill_framework_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_framework_imports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skill_framework_imports_tenant_isolation ON skill_framework_imports;
CREATE POLICY skill_framework_imports_tenant_isolation ON skill_framework_imports
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE skill_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_external_ids FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skill_external_ids_tenant_isolation ON skill_external_ids;
CREATE POLICY skill_external_ids_tenant_isolation ON skill_external_ids
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE to_skill_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_skill_proposals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS to_skill_proposals_tenant_isolation ON to_skill_proposals;
CREATE POLICY to_skill_proposals_tenant_isolation ON to_skill_proposals
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON skill_framework_imports TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON skill_external_ids TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON to_skill_proposals TO edvidura_app;
