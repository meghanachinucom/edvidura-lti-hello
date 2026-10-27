-- PeBL in-book micro-forums (chapter-scoped discussion under RLS)
-- Apply via scripts/apply_migrations.py

CREATE TABLE IF NOT EXISTS pebl_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    chapter_slug TEXT NOT NULL DEFAULT '',
    chapter_title TEXT NOT NULL DEFAULT '',
    context_id TEXT NOT NULL DEFAULT '',
    access_level TEXT NOT NULL DEFAULT 'class'
        CHECK (access_level IN ('class', 'team', 'all', 'school')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, manual_id, chapter_slug, context_id)
);

CREATE TABLE IF NOT EXISTS pebl_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES pebl_threads(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pebl_messages(id) ON DELETE CASCADE,
    author_subject TEXT NOT NULL DEFAULT '',
    author_name TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    client_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pebl_messages_body_len CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS pebl_threads_manual_idx
    ON pebl_threads (tenant_id, manual_id, chapter_slug);
CREATE INDEX IF NOT EXISTS pebl_messages_thread_idx
    ON pebl_messages (thread_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS pebl_messages_client_id_uidx
    ON pebl_messages (tenant_id, client_id)
    WHERE client_id <> '';

ALTER TABLE pebl_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pebl_threads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pebl_threads_tenant_isolation ON pebl_threads;
CREATE POLICY pebl_threads_tenant_isolation ON pebl_threads
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pebl_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pebl_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pebl_messages_tenant_isolation ON pebl_messages;
CREATE POLICY pebl_messages_tenant_isolation ON pebl_messages
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON pebl_threads, pebl_messages TO edvidura_app;
