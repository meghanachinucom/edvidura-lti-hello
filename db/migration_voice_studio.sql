-- ======================================================================
-- MIGRATION: Context-Aware Multilingual Voice Studio (Phase 4 Engine)
-- Stores domain glossary vocabulary across 12 Indian languages and
-- user voice preferences (smart cleanup vs exact words, TTS speeds).
-- ======================================================================

CREATE TABLE IF NOT EXISTS course_vocab_glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    term TEXT NOT NULL,
    pronunciation_hint TEXT,
    language_code TEXT NOT NULL DEFAULT 'en-IN'
);

CREATE INDEX IF NOT EXISTS idx_vocab_course 
    ON course_vocab_glossary (tenant_id, course_id, language_code);

CREATE TABLE IF NOT EXISTS user_voice_preferences (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    preferred_language TEXT NOT NULL DEFAULT 'en-IN',
    cleanup_mode TEXT NOT NULL DEFAULT 'smart',
    tts_speed FLOAT NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, subject)
);

-- Seed domain vocabulary for Riverside High School courses
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'riverside' LIMIT 1;
    IF v_tenant_id IS NOT NULL THEN
        -- Algebra & Math Glossary
        INSERT INTO course_vocab_glossary (tenant_id, course_id, term, pronunciation_hint, language_code)
        VALUES 
            (v_tenant_id, 'RHS-C08', 'linear equation', 'LIN-ee-er ee-KWAY-shun', 'en-IN'),
            (v_tenant_id, 'RHS-C08', 'coefficient', 'koh-uh-FISH-unt', 'en-IN'),
            (v_tenant_id, 'RHS-C08', 'variable', 'VAIR-ee-uh-bul', 'en-IN'),
            (v_tenant_id, 'RHS-C08', 'Cartesian plane', 'kar-TEE-zhun playn', 'en-IN'),
            (v_tenant_id, 'RHS-C08', 'रैखिक समीकरण', 'raikhik sameekaran', 'hi-IN'),
            (v_tenant_id, 'RHS-C08', 'గుణకం', 'gunakam', 'te-IN'),
            (v_tenant_id, 'RHS-C08', 'చరరాశి', 'chararasi', 'te-IN'),
            (v_tenant_id, 'RHS-C08', 'Alice Nguyen', 'AL-iss WIN', 'en-IN'),
            (v_tenant_id, 'RHS-C08', 'Priya Sharma', 'PREE-yah SHAR-mah', 'en-IN');

        -- Initial preferences for Learner Alice Nguyen
        INSERT INTO user_voice_preferences (tenant_id, subject, preferred_language, cleanup_mode, tts_speed)
        VALUES (v_tenant_id, '6', 'en-IN', 'smart', 1.0)
        ON CONFLICT (tenant_id, subject) DO NOTHING;
    END IF;
END $$;
