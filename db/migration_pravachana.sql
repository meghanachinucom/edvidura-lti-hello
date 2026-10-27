-- Government pravachana catalogue (AP Chaganti / cultural video library).
-- Separate from school LTI. Apply via scripts/apply_migrations.py

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'tenants'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%segment%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tenants DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE tenants
    ADD CONSTRAINT tenants_segment_check
    CHECK (segment IN ('school', 'corporate', 'government'));

COMMENT ON COLUMN tenants.segment IS
    'school = Moodle class path + graded quiz; corporate = L&D video; government = public pravachana library (no Moodle)';

CREATE TABLE IF NOT EXISTS pravachana_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title_te TEXT NOT NULL DEFAULT '',
    title_en TEXT NOT NULL DEFAULT '',
    description_te TEXT NOT NULL DEFAULT '',
    description_en TEXT NOT NULL DEFAULT '',
    scripture TEXT NOT NULL DEFAULT '',
    cover_url TEXT NOT NULL DEFAULT '',
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS pravachana_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES pravachana_series(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    title_te TEXT NOT NULL DEFAULT '',
    title_en TEXT NOT NULL DEFAULT '',
    duration_sec INT NOT NULL DEFAULT 0,
    stream_url TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'file'
        CHECK (source IN ('file', 'hls', 'youtube')),
    language TEXT NOT NULL DEFAULT 'te-IN',
    pack TEXT NOT NULL DEFAULT 'public'
        CHECK (pack IN ('public', 'no_bag_day', 'library_hour')),
    featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    cover_url TEXT NOT NULL DEFAULT '',
    transcript_sa TEXT NOT NULL DEFAULT '',
    transcript_te TEXT NOT NULL DEFAULT '',
    meaning_en TEXT NOT NULL DEFAULT '',
    demo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS pravachana_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES pravachana_episodes(id) ON DELETE CASCADE,
    subject TEXT NOT NULL DEFAULT '',
    learner_name TEXT NOT NULL DEFAULT '',
    position_sec INT NOT NULL DEFAULT 0,
    duration_sec INT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    play_count INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, episode_id, subject)
);

CREATE TABLE IF NOT EXISTS pravachana_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES pravachana_episodes(id) ON DELETE CASCADE,
    author_subject TEXT NOT NULL DEFAULT '',
    author_name TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pravachana_notes_body_len CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS pravachana_episodes_series_idx
    ON pravachana_episodes (tenant_id, series_id, position);
CREATE INDEX IF NOT EXISTS pravachana_progress_subject_idx
    ON pravachana_progress (tenant_id, subject, updated_at DESC);
CREATE INDEX IF NOT EXISTS pravachana_notes_episode_idx
    ON pravachana_notes (tenant_id, episode_id, created_at);

ALTER TABLE pravachana_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE pravachana_series FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pravachana_series_tenant_isolation ON pravachana_series;
CREATE POLICY pravachana_series_tenant_isolation ON pravachana_series
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pravachana_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pravachana_episodes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pravachana_episodes_tenant_isolation ON pravachana_episodes;
CREATE POLICY pravachana_episodes_tenant_isolation ON pravachana_episodes
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pravachana_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pravachana_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pravachana_progress_tenant_isolation ON pravachana_progress;
CREATE POLICY pravachana_progress_tenant_isolation ON pravachana_progress
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE pravachana_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pravachana_notes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pravachana_notes_tenant_isolation ON pravachana_notes;
CREATE POLICY pravachana_notes_tenant_isolation ON pravachana_notes
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON
    pravachana_series, pravachana_episodes, pravachana_progress, pravachana_notes
    TO edvidura_app;
