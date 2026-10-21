-- Additive migration for PeBL Phase 2: Reading Position, Bookmarks, and Annotations
-- Apply: Get-Content db/migration_pebl_phase2.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

-- 1. Reading Progress Table
CREATE TABLE IF NOT EXISTS ebook_reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    subject TEXT NOT NULL,
    chapter_index INT NOT NULL DEFAULT 0,
    cfi TEXT DEFAULT NULL,
    progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, manual_id, version, subject)
);

-- 2. Bookmarks Table
CREATE TABLE IF NOT EXISTS ebook_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    subject TEXT NOT NULL,
    chapter_index INT NOT NULL DEFAULT 0,
    cfi TEXT DEFAULT NULL,
    title TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Annotations & Highlights Table
CREATE TABLE IF NOT EXISTS ebook_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    subject TEXT NOT NULL,
    chapter_index INT NOT NULL DEFAULT 0,
    cfi_range TEXT DEFAULT NULL,
    highlight_text TEXT NOT NULL DEFAULT '',
    annotation_text TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'yellow',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for tenant/manual/subject lookups
CREATE INDEX IF NOT EXISTS ebook_progress_lookup_idx
    ON ebook_reading_progress (tenant_id, manual_id, version, subject);

CREATE INDEX IF NOT EXISTS ebook_bookmarks_lookup_idx
    ON ebook_bookmarks (tenant_id, manual_id, version, subject);

CREATE INDEX IF NOT EXISTS ebook_annotations_lookup_idx
    ON ebook_annotations (tenant_id, manual_id, version, subject);

-- RLS Enforcement
ALTER TABLE ebook_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebook_reading_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ebook_reading_progress_tenant_isolation ON ebook_reading_progress;
CREATE POLICY ebook_reading_progress_tenant_isolation ON ebook_reading_progress
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE ebook_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebook_bookmarks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ebook_bookmarks_tenant_isolation ON ebook_bookmarks;
CREATE POLICY ebook_bookmarks_tenant_isolation ON ebook_bookmarks
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE ebook_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebook_annotations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ebook_annotations_tenant_isolation ON ebook_annotations;
CREATE POLICY ebook_annotations_tenant_isolation ON ebook_annotations
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON ebook_reading_progress, ebook_bookmarks, ebook_annotations TO edvidura_app;
