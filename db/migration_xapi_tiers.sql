-- Fuller xAPI: local tiers + LRS retry metadata
-- Apply: Get-Content db/migration_xapi_tiers.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

ALTER TABLE xapi_statements
    ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'noisy'
        CHECK (tier IN ('noisy', 'transactional', 'authoritative'));

ALTER TABLE xapi_statements
    ADD COLUMN IF NOT EXISTS lrs_attempts INT NOT NULL DEFAULT 0;

ALTER TABLE xapi_statements
    ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS xapi_statements_tier_idx
    ON xapi_statements (tenant_id, tier, created_at DESC);

CREATE INDEX IF NOT EXISTS xapi_statements_lrs_retry_idx
    ON xapi_statements (tenant_id, sent_to_lrs, lrs_attempts)
    WHERE sent_to_lrs = FALSE;

-- Read-only BI role (Metabase "replica" without a second Postgres)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edvidura_bi') THEN
        CREATE ROLE edvidura_bi LOGIN PASSWORD 'edvidura_bi' NOSUPERUSER NOBYPASSRLS;
    END IF;
END $$;

GRANT CONNECT ON DATABASE edvidura TO edvidura_bi;
GRANT USAGE ON SCHEMA public TO edvidura_bi;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO edvidura_bi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO edvidura_bi;

-- BI role bypasses RLS for cross-tenant dashboards (filter by tenant_id in Metabase)
ALTER ROLE edvidura_bi BYPASSRLS;
