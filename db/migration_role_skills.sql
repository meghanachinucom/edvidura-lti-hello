-- D23: Role → required skills matrix (difference training).

CREATE TABLE IF NOT EXISTS role_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, role_code)
);

CREATE INDEX IF NOT EXISTS role_profiles_tenant_idx
    ON role_profiles (tenant_id, position);

CREATE TABLE IF NOT EXISTS role_skill_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES role_profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, role_id, skill_id)
);

CREATE INDEX IF NOT EXISTS role_skill_requirements_role_idx
    ON role_skill_requirements (role_id);

ALTER TABLE role_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_profiles_tenant_isolation ON role_profiles;
CREATE POLICY role_profiles_tenant_isolation ON role_profiles
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE role_skill_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_skill_requirements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_skill_requirements_tenant_isolation ON role_skill_requirements;
CREATE POLICY role_skill_requirements_tenant_isolation ON role_skill_requirements
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON role_profiles TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON role_skill_requirements TO edvidura_app;
