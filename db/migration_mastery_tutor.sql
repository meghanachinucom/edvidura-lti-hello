-- ======================================================================
-- MIGRATION: Guided Mastery Tutor (Phase 1 Engine)
-- Tracks learner skill mastery (Levels 0 to 5) and stateful tutor sessions.
-- Idempotent, tenant-scoped, and RLS-ready.
-- ======================================================================

CREATE TABLE IF NOT EXISTS learner_skill_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    parent_topic TEXT NOT NULL,
    mastery_level INT NOT NULL DEFAULT 1 CHECK (mastery_level BETWEEN 0 AND 5),
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    interval_days INT NOT NULL DEFAULT 1,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    misconceptions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_learner_skill UNIQUE (tenant_id, subject, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_skill_reviews 
    ON learner_skill_mastery (tenant_id, subject, next_review_at);

CREATE TABLE IF NOT EXISTS tutor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'guided',
    current_step INT NOT NULL DEFAULT 1,
    diagnostic_score INT NOT NULL DEFAULT 0,
    turns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_sessions_active 
    ON tutor_sessions (tenant_id, subject, skill_id, status);

-- Seed initial Riverside High School Class 8 Algebra skills for Learner Alice Nguyen (subject '6')
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'riverside' LIMIT 1;
    IF v_tenant_id IS NOT NULL THEN
        -- Skill 1: Variables & Expressions (Level 3 - review due right now for 2-min review demo)
        INSERT INTO learner_skill_mastery (
            tenant_id, subject, skill_id, skill_name, parent_topic, 
            mastery_level, ease_factor, interval_days, next_review_at, misconceptions_json
        ) VALUES (
            v_tenant_id, '6', 'variables', 'Variables & Algebraic Expressions', 'Algebraic Foundations',
            3, 2.6, 2, NOW() - INTERVAL '1 hour', '["Confusing coefficient with exponent"]'::jsonb
        ) ON CONFLICT (tenant_id, subject, skill_id) DO UPDATE SET
            mastery_level = 3,
            next_review_at = NOW() - INTERVAL '1 hour';

        -- Skill 2: Solving Linear Equations (Level 2 - review due right now)
        INSERT INTO learner_skill_mastery (
            tenant_id, subject, skill_id, skill_name, parent_topic, 
            mastery_level, ease_factor, interval_days, next_review_at, misconceptions_json
        ) VALUES (
            v_tenant_id, '6', 'solve-linear', 'Solving Linear Equations', 'Linear Equations',
            2, 2.4, 1, NOW() - INTERVAL '2 hours', '["Sign inversion when moving terms"]'::jsonb
        ) ON CONFLICT (tenant_id, subject, skill_id) DO UPDATE SET
            mastery_level = 2,
            next_review_at = NOW() - INTERVAL '2 hours';

        -- Skill 3: Linear Word Problems (Level 1 - next review in 2 days)
        INSERT INTO learner_skill_mastery (
            tenant_id, subject, skill_id, skill_name, parent_topic, 
            mastery_level, ease_factor, interval_days, next_review_at, misconceptions_json
        ) VALUES (
            v_tenant_id, '6', 'word-problems', 'Linear Word Problems & Modeling', 'Word Problems',
            1, 2.2, 1, NOW() + INTERVAL '2 days', '["Translating phrases like more than to subtraction"]'::jsonb
        ) ON CONFLICT (tenant_id, subject, skill_id) DO UPDATE SET
            mastery_level = 1,
            next_review_at = NOW() + INTERVAL '2 days';

        -- Skill 4: Graphing Lines & Coordinates (Level 0 - locked until foundations reach Level 3)
        INSERT INTO learner_skill_mastery (
            tenant_id, subject, skill_id, skill_name, parent_topic, 
            mastery_level, ease_factor, interval_days, next_review_at, misconceptions_json
        ) VALUES (
            v_tenant_id, '6', 'graphing-lines', 'Graphing Lines & Coordinate Geometry', 'Coordinate Geometry',
            0, 2.5, 1, NOW() + INTERVAL '3 days', '[]'::jsonb
        ) ON CONFLICT (tenant_id, subject, skill_id) DO UPDATE SET
            mastery_level = 0;
    END IF;
END $$;
