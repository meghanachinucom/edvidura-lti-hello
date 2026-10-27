-- Teacher test-bank drafts (AI Assessment F-4 review workflow).

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS qtype TEXT NOT NULL DEFAULT 'single';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_text TEXT NOT NULL DEFAULT '';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS quiz_bank_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Test bank',
    source_kind TEXT NOT NULL DEFAULT 'lesson',
    source_label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    requested_count INT NOT NULL DEFAULT 0,
    generated_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_bank_batches_tenant_idx
    ON quiz_bank_batches (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quiz_bank_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES quiz_bank_batches(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 1,
    prompt TEXT NOT NULL,
    choices JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index INT NOT NULL DEFAULT 0,
    qtype TEXT NOT NULL DEFAULT 'single',
    topic TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL DEFAULT 'core',
    correct_text TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_bank_items_batch_idx
    ON quiz_bank_items (batch_id, position);

ALTER TABLE quiz_bank_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_bank_batches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_bank_batches_tenant_isolation ON quiz_bank_batches;
CREATE POLICY quiz_bank_batches_tenant_isolation ON quiz_bank_batches
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE quiz_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_bank_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_bank_items_tenant_isolation ON quiz_bank_items;
CREATE POLICY quiz_bank_items_tenant_isolation ON quiz_bank_items
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_bank_batches TO edvidura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_bank_items TO edvidura_app;
