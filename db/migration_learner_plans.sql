-- C9/C10 PLE: persisted personal learning plans (one open plan per learner).
-- Moodle still owns people; we key by LTI subject only.

CREATE TABLE IF NOT EXISTS learner_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    source_attempt_id UUID,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'completed', 'superseded')),
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_step INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS learner_plans_one_open_idx
    ON learner_plans (tenant_id, subject)
    WHERE status = 'open';

CREATE INDEX IF NOT EXISTS learner_plans_tenant_subject_idx
    ON learner_plans (tenant_id, subject, updated_at DESC);

ALTER TABLE learner_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_plans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learner_plans_tenant_isolation ON learner_plans;
CREATE POLICY learner_plans_tenant_isolation ON learner_plans
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON learner_plans TO edvidura_app;
