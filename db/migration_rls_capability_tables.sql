-- Phase 4: RLS on capability / session tables (DEC-006).
-- Opaque token / launch_id lookups use SET LOCAL app.capability_lookup = '1'
-- (see app.db.capability_connection). Inserts still require app.tenant_id.
-- Apply via: python scripts/apply_migrations.py

-- —— quiz_session_tokens: add tenant_id ——
ALTER TABLE quiz_session_tokens
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE quiz_session_tokens
SET tenant_id = NULLIF(context->>'tenant_id', '')::uuid
WHERE tenant_id IS NULL
  AND context ? 'tenant_id'
  AND NULLIF(context->>'tenant_id', '') IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_session_tokens_tenant_idx
    ON quiz_session_tokens (tenant_id);

-- —— lti_launch_snapshots: index for tenant scans ——
CREATE INDEX IF NOT EXISTS lti_launch_snapshots_tenant_idx
    ON lti_launch_snapshots (tenant_id);

-- —— lti_registration_invites ——
ALTER TABLE lti_registration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_registration_invites FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lti_registration_invites_select ON lti_registration_invites;
DROP POLICY IF EXISTS lti_registration_invites_insert ON lti_registration_invites;
DROP POLICY IF EXISTS lti_registration_invites_update ON lti_registration_invites;
DROP POLICY IF EXISTS lti_registration_invites_delete ON lti_registration_invites;
DROP POLICY IF EXISTS lti_registration_invites_tenant_isolation ON lti_registration_invites;

CREATE POLICY lti_registration_invites_select ON lti_registration_invites
    FOR SELECT
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR current_setting('app.capability_lookup', true) = '1'
    );

CREATE POLICY lti_registration_invites_insert ON lti_registration_invites
    FOR INSERT
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY lti_registration_invites_update ON lti_registration_invites
    FOR UPDATE
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR current_setting('app.capability_lookup', true) = '1'
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR current_setting('app.capability_lookup', true) = '1'
    );

CREATE POLICY lti_registration_invites_delete ON lti_registration_invites
    FOR DELETE
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_registration_invites TO edvidura_app;

-- —— lti_launch_snapshots ——
ALTER TABLE lti_launch_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_launch_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lti_launch_snapshots_select ON lti_launch_snapshots;
DROP POLICY IF EXISTS lti_launch_snapshots_insert ON lti_launch_snapshots;
DROP POLICY IF EXISTS lti_launch_snapshots_update ON lti_launch_snapshots;
DROP POLICY IF EXISTS lti_launch_snapshots_delete ON lti_launch_snapshots;

CREATE POLICY lti_launch_snapshots_select ON lti_launch_snapshots
    FOR SELECT
    USING (
        (
            tenant_id IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR current_setting('app.capability_lookup', true) = '1'
    );

CREATE POLICY lti_launch_snapshots_insert ON lti_launch_snapshots
    FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY lti_launch_snapshots_update ON lti_launch_snapshots
    FOR UPDATE
    USING (
        (
            tenant_id IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR current_setting('app.capability_lookup', true) = '1'
    )
    WITH CHECK (
        (
            tenant_id IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR current_setting('app.capability_lookup', true) = '1'
    );

CREATE POLICY lti_launch_snapshots_delete ON lti_launch_snapshots
    FOR DELETE
    USING (
        tenant_id IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_launch_snapshots TO edvidura_app;

-- —— quiz_session_tokens ——
ALTER TABLE quiz_session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_session_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_session_tokens_select ON quiz_session_tokens;
DROP POLICY IF EXISTS quiz_session_tokens_insert ON quiz_session_tokens;
DROP POLICY IF EXISTS quiz_session_tokens_update ON quiz_session_tokens;
DROP POLICY IF EXISTS quiz_session_tokens_delete ON quiz_session_tokens;

CREATE POLICY quiz_session_tokens_select ON quiz_session_tokens
    FOR SELECT
    USING (
        (
            tenant_id IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR current_setting('app.capability_lookup', true) = '1'
    );

CREATE POLICY quiz_session_tokens_insert ON quiz_session_tokens
    FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY quiz_session_tokens_update ON quiz_session_tokens
    FOR UPDATE
    USING (
        (
            tenant_id IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR current_setting('app.capability_lookup', true) = '1'
    )
    WITH CHECK (
        (
            tenant_id IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR current_setting('app.capability_lookup', true) = '1'
    );

CREATE POLICY quiz_session_tokens_delete ON quiz_session_tokens
    FOR DELETE
    USING (
        tenant_id IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_session_tokens TO edvidura_app;
