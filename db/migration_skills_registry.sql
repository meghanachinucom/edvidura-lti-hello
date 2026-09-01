-- C8: Skills / competency registry (tenant-scoped, RLS).
-- Links quiz question_keys → skills → remediation (lesson / manual focus).

CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    skill_code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    position INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, skill_code)
);

CREATE INDEX IF NOT EXISTS skills_tenant_idx ON skills (tenant_id, position);

CREATE TABLE IF NOT EXISTS skill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, question_key)
);

CREATE INDEX IF NOT EXISTS skill_items_skill_idx ON skill_items (skill_id);

CREATE TABLE IF NOT EXISTS skill_remediation (
    skill_id UUID PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    manual_id UUID REFERENCES manuals(id) ON DELETE SET NULL,
    manual_focus TEXT NOT NULL DEFAULT '',
    teleport_label TEXT NOT NULL DEFAULT '',
    teleport_hint TEXT NOT NULL DEFAULT '',
    prefer_path TEXT NOT NULL DEFAULT 'manuals'
        CHECK (prefer_path IN ('lessons', 'manuals')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skill_remediation_tenant_idx ON skill_remediation (tenant_id);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skills_tenant_isolation ON skills;
CREATE POLICY skills_tenant_isolation ON skills
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE skill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skill_items_tenant_isolation ON skill_items;
CREATE POLICY skill_items_tenant_isolation ON skill_items
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE skill_remediation ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_remediation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skill_remediation_tenant_isolation ON skill_remediation;
CREATE POLICY skill_remediation_tenant_isolation ON skill_remediation
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON skills, skill_items, skill_remediation TO edvidura_app;
