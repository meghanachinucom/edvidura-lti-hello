-- Shared key/value cache for multi-instance LTI state (Phase 5).
-- Used by app.launch_cache.SharedCache for nonce/state across workers.
-- Not tenant-scoped (LTI protocol state is platform-scoped by opaque keys).

CREATE TABLE IF NOT EXISTS shared_cache (
    cache_key TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shared_cache_expires_idx
    ON shared_cache (expires_at)
    WHERE expires_at IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON shared_cache TO edvidura_app;

-- Optional: prune helper (also called from app on write)
-- DELETE FROM shared_cache WHERE expires_at IS NOT NULL AND expires_at < now();
