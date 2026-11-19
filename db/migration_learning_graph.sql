-- ======================================================================
-- MIGRATION: Semantic Competency & Evidence Graph (Phase 3 Engine)
-- Tracks cross-module semantic links, difference training gaps,
-- and verified multi-source learner evidence ledger.
-- ======================================================================

CREATE TABLE IF NOT EXISTS semantic_uri_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subject_uri TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object_uri TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    object_type TEXT NOT NULL,
    title TEXT NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_semantic_uri_link UNIQUE (tenant_id, subject_uri, predicate, object_uri)
);

CREATE INDEX IF NOT EXISTS idx_semantic_subject 
    ON semantic_uri_links (tenant_id, subject_uri);
CREATE INDEX IF NOT EXISTS idx_semantic_object 
    ON semantic_uri_links (tenant_id, object_uri);

CREATE TABLE IF NOT EXISTS learner_evidence_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    competency_uri TEXT NOT NULL,
    evidence_source TEXT NOT NULL CHECK (evidence_source IN ('quiz', 'ebook', 'tutor', 'lab', 'lms')),
    source_uri TEXT NOT NULL,
    score_pct INT NOT NULL DEFAULT 100,
    mastery_level INT NOT NULL DEFAULT 1,
    xapi_statement_id TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_ledger_learner 
    ON learner_evidence_ledger (tenant_id, subject, competency_uri);

-- Seed Canonical URI links across Riverside High School Class 8 Algebra
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'riverside' LIMIT 1;
    IF v_tenant_id IS NOT NULL THEN
        -- 1. Variables & Expressions Links
        INSERT INTO semantic_uri_links (
            tenant_id, subject_uri, predicate, object_uri, subject_type, object_type, title, metadata_json
        ) VALUES 
        (
            v_tenant_id, 'urn:edvidura:competency:variables', 'teachesBy',
            'urn:edvidura:lesson:les-intro', 'Competency', 'Lesson',
            'Lesson: Introduction to Variables', '{"duration_min": 20, "order": 1}'::jsonb
        ),
        (
            v_tenant_id, 'urn:edvidura:competency:variables', 'referencedIn',
            'urn:edvidura:manual:de7900fd-488b-4740-bf7e-7a11b3475cd6', 'Competency', 'Manual',
            'Textbook: Algebra I Foundations Chapter 1', '{"pages": "1-14"}'::jsonb
        ),
        (
            v_tenant_id, 'urn:edvidura:competency:variables', 'assessedBy',
            'urn:edvidura:quiz:qz-algebra-1', 'Competency', 'Quiz',
            'Quiz: Class 8 Foundations Check', '{"question_count": 5}'::jsonb
        ),
        (
            v_tenant_id, 'urn:edvidura:competency:variables', 'simulatedIn',
            'urn:edvidura:lab:xr-cartesian-1', 'Competency', '3DLab',
            '3D Spatial Lab: Cartesian Sliders', '{"mode": "interactive"}'::jsonb
        )
        ON CONFLICT (tenant_id, subject_uri, predicate, object_uri) DO NOTHING;

        -- 2. Solving Linear Equations Links
        INSERT INTO semantic_uri_links (
            tenant_id, subject_uri, predicate, object_uri, subject_type, object_type, title, metadata_json
        ) VALUES 
        (
            v_tenant_id, 'urn:edvidura:competency:solve-linear', 'teachesBy',
            'urn:edvidura:lesson:les-algebra', 'Competency', 'Lesson',
            'Lesson: Balance Method in Linear Equations', '{"duration_min": 25, "order": 2}'::jsonb
        ),
        (
            v_tenant_id, 'urn:edvidura:competency:solve-linear', 'referencedIn',
            'urn:edvidura:manual:de7900fd-488b-4740-bf7e-7a11b3475cd6', 'Competency', 'Manual',
            'Textbook: Algebra I Foundations Chapter 2', '{"pages": "15-32"}'::jsonb
        ),
        (
            v_tenant_id, 'urn:edvidura:competency:solve-linear', 'assessedBy',
            'urn:edvidura:quiz:qz-algebra-1', 'Competency', 'Quiz',
            'Quiz: Linear Equation Solving', '{"question_count": 5}'::jsonb
        )
        ON CONFLICT (tenant_id, subject_uri, predicate, object_uri) DO NOTHING;

        -- 3. Linear Word Problems Links
        INSERT INTO semantic_uri_links (
            tenant_id, subject_uri, predicate, object_uri, subject_type, object_type, title, metadata_json
        ) VALUES 
        (
            v_tenant_id, 'urn:edvidura:competency:word-problems', 'referencedIn',
            'urn:edvidura:manual:de7900fd-488b-4740-bf7e-7a11b3475cd6', 'Competency', 'Manual',
            'Textbook: Algebra I Foundations Chapter 3', '{"pages": "33-50"}'::jsonb
        )
        ON CONFLICT (tenant_id, subject_uri, predicate, object_uri) DO NOTHING;

        -- Seed initial verified evidence for Learner Alice Nguyen (subject '6')
        INSERT INTO learner_evidence_ledger (
            tenant_id, subject, competency_uri, evidence_source, source_uri, score_pct, mastery_level
        ) VALUES 
        (
            v_tenant_id, '6', 'urn:edvidura:competency:variables', 'quiz',
            'urn:edvidura:quiz:qz-algebra-1', 100, 3
        ),
        (
            v_tenant_id, '6', 'urn:edvidura:competency:variables', 'ebook',
            'urn:edvidura:manual:de7900fd-488b-4740-bf7e-7a11b3475cd6', 100, 3
        ),
        (
            v_tenant_id, '6', 'urn:edvidura:competency:solve-linear', 'tutor',
            'urn:edvidura:tutor:turn:solve-linear', 90, 2
        );

    END IF;
END $$;
