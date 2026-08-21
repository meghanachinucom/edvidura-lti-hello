-- LTI Dynamic Registration invites (one-click Moodle connect)
-- Apply: Get-Content db/migration_lti_dynreg.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

CREATE TABLE IF NOT EXISTS lti_registration_invites (
    token TEXT PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    client_id TEXT,
    issuer TEXT
);

CREATE INDEX IF NOT EXISTS lti_registration_invites_tenant_idx
    ON lti_registration_invites (tenant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_registration_invites TO edvidura_app;
