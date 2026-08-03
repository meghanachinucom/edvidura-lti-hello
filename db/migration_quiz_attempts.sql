-- Slice A: quiz attempts (shared DB + RLS). Safe to run on existing DBs.

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    learner_name TEXT NOT NULL DEFAULT '',
    course_label TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    grade_sent BOOLEAN NOT NULL DEFAULT FALSE,
    grade_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_tenant_created_idx
    ON quiz_attempts (tenant_id, created_at DESC);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_attempts_tenant_isolation ON quiz_attempts;
CREATE POLICY quiz_attempts_tenant_isolation ON quiz_attempts
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_attempts TO edvidura_app;
