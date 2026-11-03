-- SME R-2: persisted index chunks for coach / public query (tenant RLS).

CREATE TABLE IF NOT EXISTS sme_index_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    page_no INT NOT NULL DEFAULT 1,
    slug TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sme_index_chunks_tenant_manual_idx
    ON sme_index_chunks (tenant_id, manual_id, version, page_no);

CREATE INDEX IF NOT EXISTS sme_index_chunks_tenant_slug_idx
    ON sme_index_chunks (tenant_id, slug);

ALTER TABLE sme_index_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sme_index_chunks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sme_index_chunks_tenant_isolation ON sme_index_chunks;
CREATE POLICY sme_index_chunks_tenant_isolation ON sme_index_chunks
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON sme_index_chunks TO edvidura_app;
