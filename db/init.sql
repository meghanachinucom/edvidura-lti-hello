-- EdVidura multi-tenant spike schema (DEC-006: shared DB + RLS)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lti_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    deployment_ids TEXT[] NOT NULL DEFAULT ARRAY['1'],
    auth_login_url TEXT NOT NULL,
    auth_token_url TEXT NOT NULL,
    key_set_url TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (issuer, client_id)
);

CREATE INDEX lti_platforms_issuer_client_idx
    ON lti_platforms (issuer, client_id)
    WHERE active;

CREATE TABLE launch_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    roles TEXT NOT NULL DEFAULT '',
    course_label TEXT NOT NULL DEFAULT '',
    raw_claims JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX launch_events_tenant_created_idx
    ON launch_events (tenant_id, created_at DESC);

ALTER TABLE launch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_events FORCE ROW LEVEL SECURITY;

CREATE POLICY launch_events_tenant_isolation ON launch_events
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

-- App role must NOT be superuser / BYPASSRLS (Docker POSTGRES_USER is superuser)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edvidura_app') THEN
        CREATE ROLE edvidura_app LOGIN PASSWORD 'edvidura_app' NOSUPERUSER NOBYPASSRLS;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE edvidura TO edvidura_app;
GRANT USAGE ON SCHEMA public TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edvidura_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO edvidura_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO edvidura_app;

-- Fixed UUIDs so seed scripts and docs stay stable
INSERT INTO tenants (id, slug, name, status) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tenant-a', 'Tenant A (Moodle 8085)', 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tenant-b', 'Tenant B (RLS fixture)', 'active');

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_code TEXT NOT NULL UNIQUE,
    institution_name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    deployment_ids TEXT[] NOT NULL DEFAULT ARRAY['1']::TEXT[],
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_students_institution_student_code UNIQUE (institution_id, student_code)
);

CREATE INDEX IF NOT EXISTS idx_institutions_tenant_id ON institutions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_institutions_code ON institutions (institution_code);
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON students (institution_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON students (student_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edvidura_app;


