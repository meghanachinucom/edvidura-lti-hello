-- Persist LTI launch JWT bodies so AGS survives uvicorn --reload (in-memory cache clears).

CREATE TABLE IF NOT EXISTS lti_launch_snapshots (
    launch_id TEXT PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    launch_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lti_launch_snapshots_created_idx
    ON lti_launch_snapshots (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON lti_launch_snapshots TO edvidura_app;

-- Quiz tokens survive reload (form posts quiz_token; memory cache alone is wiped).
CREATE TABLE IF NOT EXISTS quiz_session_tokens (
    token TEXT PRIMARY KEY,
    context JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS quiz_session_tokens_expires_idx
    ON quiz_session_tokens (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_session_tokens TO edvidura_app;
