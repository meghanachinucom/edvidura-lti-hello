-- Additive migration for EPUB3 manual version support (Phase 1)
-- Apply: Get-Content db/migration_epub_versions.sql | docker exec -i db-db-1 psql -U edvidura -d edvidura -v ON_ERROR_STOP=1

ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'markdown';
ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS epub_filename TEXT DEFAULT NULL;
ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS epub_sha256 TEXT DEFAULT NULL;
ALTER TABLE manual_versions ADD COLUMN IF NOT EXISTS epub_manifest JSONB DEFAULT NULL;
