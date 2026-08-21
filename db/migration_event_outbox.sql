-- Event outbox (EVENT_ENVELOPE_V1) — tenant-owned, RLS
-- Apply: Get-Content db/migration_event_outbox.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

CREATE TABLE IF NOT EXISTS event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    subject TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    publish_error TEXT,
    UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS event_outbox_pending_idx
    ON event_outbox (tenant_id, created_at)
    WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS event_outbox_tenant_type_idx
    ON event_outbox (tenant_id, event_type, created_at DESC);

ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_outbox_tenant_isolation ON event_outbox;
CREATE POLICY event_outbox_tenant_isolation ON event_outbox
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON event_outbox TO edvidura_app;
