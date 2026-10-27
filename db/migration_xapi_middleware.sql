-- xAPI middleware: stored files, inbound grades, attempt-counter sync (F-3–F-7, F-9, F-10).

CREATE TABLE IF NOT EXISTS middleware_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL DEFAULT '',
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    kind TEXT NOT NULL DEFAULT 'binary',
    payload BYTEA,
    json_body JSONB,
    source TEXT NOT NULL DEFAULT 'upload',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS middleware_files_tenant_idx
    ON middleware_files (tenant_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS middleware_files_key_idx
    ON middleware_files (tenant_id, file_key)
    WHERE file_key <> '';

CREATE TABLE IF NOT EXISTS attempt_counter_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    activity_id TEXT NOT NULL DEFAULT 'school-quiz',
    used INT NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'external',
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, subject, activity_id)
);

CREATE INDEX IF NOT EXISTS attempt_counter_sync_tenant_idx
    ON attempt_counter_sync (tenant_id, synced_at DESC);

CREATE TABLE IF NOT EXISTS inbound_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    learner_name TEXT NOT NULL DEFAULT '',
    activity_id TEXT NOT NULL DEFAULT 'school-quiz',
    score INT NOT NULL,
    max_score INT NOT NULL,
    source TEXT NOT NULL DEFAULT 'external',
    attempt_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbound_grades_tenant_idx
    ON inbound_grades (tenant_id, created_at DESC);

ALTER TABLE middleware_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE middleware_files FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS middleware_files_tenant_isolation ON middleware_files;
CREATE POLICY middleware_files_tenant_isolation ON middleware_files
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE attempt_counter_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_counter_sync FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attempt_counter_sync_tenant_isolation ON attempt_counter_sync;
CREATE POLICY attempt_counter_sync_tenant_isolation ON attempt_counter_sync
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE inbound_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_grades FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inbound_grades_tenant_isolation ON inbound_grades;
CREATE POLICY inbound_grades_tenant_isolation ON inbound_grades
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON middleware_files TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON attempt_counter_sync TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON inbound_grades TO edvidura_app;
