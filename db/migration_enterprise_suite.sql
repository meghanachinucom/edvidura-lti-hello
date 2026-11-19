-- ==============================================================================
-- EDVIDURA ENTERPRISE SUITE MIGRATION (BF-01 to BF-20)
-- Idempotent, tenant-scoped schema supporting Vercel Serverless + Supabase Postgres
-- ==============================================================================

-- 1. BF-01: Intelligent Intervention Agents
CREATE TABLE IF NOT EXISTS intelligent_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_name VARCHAR(128) NOT NULL,
    condition_expr JSONB NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    action_payload JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_intelligent_agents_tenant ON intelligent_agents(tenant_id);

-- 2. BF-02: Unified Rubric Grader & Annotations
CREATE TABLE IF NOT EXISTS speedgrader_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    submission_id VARCHAR(128) NOT NULL,
    grader_id VARCHAR(128) NOT NULL,
    rubric_scores JSONB DEFAULT '{}'::jsonb,
    inline_notes JSONB DEFAULT '[]'::jsonb,
    is_muted BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grader_sub_tenant ON speedgrader_annotations(tenant_id, submission_id);

-- 3. BF-03: Adaptive Learning Pathways
CREATE TABLE IF NOT EXISTS mastery_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    course_id VARCHAR(128) NOT NULL,
    module_id VARCHAR(128) NOT NULL,
    threshold_support INT DEFAULT 60,
    threshold_enrichment INT DEFAULT 85,
    support_branch JSONB NOT NULL,
    core_branch JSONB NOT NULL,
    enrichment_branch JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mastery_paths_tenant ON mastery_paths(tenant_id, course_id);

-- 4. BF-04: High-Throughput Learning Event Stream Firehose
CREATE TABLE IF NOT EXISTS raw_event_stream (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_stream_tenant ON raw_event_stream(tenant_id, ingested_at DESC);

-- 5. BF-05: Blueprint Course Syndication
CREATE TABLE IF NOT EXISTS blueprint_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    master_course_id VARCHAR(128) NOT NULL,
    associated_section_id VARCHAR(128) NOT NULL,
    locked_item_ids JSONB DEFAULT '[]'::jsonb,
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(32) DEFAULT 'synchronized',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blueprint_tenant ON blueprint_links(tenant_id, master_course_id);

-- 6. BF-06: Algorithmic & Dynamic STEM Question Generator
CREATE TABLE IF NOT EXISTS algorithmic_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    template_key VARCHAR(64) NOT NULL,
    expression_template TEXT NOT NULL,
    variable_ranges JSONB NOT NULL,
    tolerance_pct NUMERIC(5,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_algo_q_tenant ON algorithmic_questions(tenant_id, template_key);

-- 7. BF-07: Skill Benchmarks & Proficiency Profiler
CREATE TABLE IF NOT EXISTS skill_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    skill_code VARCHAR(64) NOT NULL,
    measured_score NUMERIC(5,2) NOT NULL,
    benchmark_percentile INT NOT NULL,
    proficiency_tier VARCHAR(32) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skill_benchmarks_user ON skill_benchmarks(tenant_id, user_id);

-- 8. BF-08: Recertification & Compliance Tracker
CREATE TABLE IF NOT EXISTS compliance_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    certificate_code VARCHAR(64) NOT NULL,
    student_id VARCHAR(128) NOT NULL,
    title VARCHAR(256) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    auto_re_enroll BOOLEAN DEFAULT TRUE,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compliance_exp ON compliance_requirements(tenant_id, expires_at);

-- 9. BF-09: Calibrated Anonymous Peer Review
CREATE TABLE IF NOT EXISTS peer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    assignment_id VARCHAR(128) NOT NULL,
    reviewer_hash VARCHAR(64) NOT NULL,
    reviewee_hash VARCHAR(64) NOT NULL,
    rubric_scores JSONB NOT NULL,
    calibration_weight NUMERIC(4,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_assign ON peer_reviews(tenant_id, assignment_id);

-- 10. BF-10: In-Video Interactive Checkpoints
CREATE TABLE IF NOT EXISTS video_cue_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    video_id VARCHAR(128) NOT NULL,
    timestamp_seconds INT NOT NULL,
    question_payload JSONB NOT NULL,
    is_blocking BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_cues ON video_cue_points(tenant_id, video_id, timestamp_seconds);

-- 11. BF-11: Cryptographic Verifiable Credentials
CREATE TABLE IF NOT EXISTS verifiable_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    credential_id VARCHAR(128) NOT NULL UNIQUE,
    recipient_id VARCHAR(128) NOT NULL,
    course_name VARCHAR(256) NOT NULL,
    claim_payload JSONB NOT NULL,
    signature_digest VARCHAR(256) NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vc_recipient ON verifiable_credentials(tenant_id, recipient_id);

-- 12. BF-12: Academic Credit Ledger
CREATE TABLE IF NOT EXISTS academic_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    student_id VARCHAR(128) NOT NULL,
    verified_hours NUMERIC(6,1) NOT NULL,
    credits_awarded NUMERIC(4,2) NOT NULL,
    verification_hash VARCHAR(128) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_student ON academic_credit_ledger(tenant_id, student_id);

-- 13. BF-13: Cached Multilingual Translation Gateway
CREATE TABLE IF NOT EXISTS translation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_hash VARCHAR(64) NOT NULL,
    target_locale VARCHAR(16) NOT NULL,
    translated_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_translation_entry UNIQUE (source_hash, target_locale)
);
CREATE INDEX IF NOT EXISTS idx_trans_cache ON translation_cache(source_hash, target_locale);

-- 14. BF-14: Offline-First Vector Sync
CREATE TABLE IF NOT EXISTS sync_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    client_id VARCHAR(128) NOT NULL,
    change_type VARCHAR(64) NOT NULL,
    entity_key VARCHAR(128) NOT NULL,
    vector_clock JSONB NOT NULL,
    payload JSONB NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant ON sync_change_log(tenant_id, client_id);

-- 15. BF-15: Exam Integrity Sentinel
CREATE TABLE IF NOT EXISTS proctoring_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    session_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    incident_type VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proctoring_sess ON proctoring_incidents(tenant_id, session_id);

-- 16. BF-16: Instant Quiz Minter from Chat
CREATE TABLE IF NOT EXISTS chat_minted_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    chat_thread_id VARCHAR(128) NOT NULL,
    quiz_title VARCHAR(256) NOT NULL,
    questions JSONB NOT NULL,
    score INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_quizzes_user ON chat_minted_quizzes(tenant_id, user_id);

-- 17. BF-17: Conversational Study Notes Synthesizer
CREATE TABLE IF NOT EXISTS dynamic_ebook_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    topic VARCHAR(128) NOT NULL,
    compiled_notes_html TEXT NOT NULL,
    formula_sheet_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ebook_summaries ON dynamic_ebook_summaries(tenant_id, user_id);

-- 18. BF-18: Chapter-Scoped Doubt Tutor
CREATE TABLE IF NOT EXISTS topic_bot_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    chapter_id VARCHAR(128) NOT NULL,
    book_id VARCHAR(128) NOT NULL,
    allowed_topics JSONB NOT NULL,
    fallback_prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_chapter_bot UNIQUE (tenant_id, chapter_id)
);

-- 19. BF-19: Sim-to-Real Transfer Analytics
CREATE TABLE IF NOT EXISTS sim_to_real_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    skill_id VARCHAR(128) NOT NULL,
    sim_score NUMERIC(5,2) NOT NULL,
    real_workshop_score NUMERIC(5,2) NOT NULL,
    gap_flag VARCHAR(64) DEFAULT 'aligned',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_transfer_user ON sim_to_real_transfers(tenant_id, user_id);

-- 20. BF-20: Apprenticeship OJT & Compliance Filing
CREATE TABLE IF NOT EXISTS apprenticeship_filing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    student_id VARCHAR(128) NOT NULL,
    employer_name VARCHAR(256) NOT NULL,
    hours_logged NUMERIC(6,1) NOT NULL,
    supervisor_pin_hash VARCHAR(128) NOT NULL,
    compliance_batch_id VARCHAR(128) NOT NULL,
    filing_status VARCHAR(32) DEFAULT 'verified',
    filed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ojt_filing_student ON apprenticeship_filing_records(tenant_id, student_id);

-- ==============================================================================
-- REALISTIC SEED DATA FOR RIVERSIDE HIGH CLASS 8 (RHS-C08)
-- Tenant ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- ==============================================================================

-- Seed BF-01: Intelligent Intervention Agent Rules
INSERT INTO intelligent_agents (id, tenant_id, rule_name, condition_expr, action_type, action_payload, is_active)
VALUES 
    ('11111111-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Low Quiz Score Intervention', '{"metric": "quiz_score", "op": "<", "val": 60}'::jsonb, 'guided_tutoring', '{"unlock_coach": true, "suggested_topic": "Linear Equations"}'::jsonb, TRUE),
    ('11111111-0001-0001-0001-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3-Day Inactivity Prompt', '{"metric": "days_inactive", "op": ">=", "val": 3}'::jsonb, 'sms_reminder', '{"template": "reminder_practice_streak"}'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed BF-03: Mastery Pathway
INSERT INTO mastery_paths (id, tenant_id, course_id, module_id, threshold_support, threshold_enrichment, support_branch, core_branch, enrichment_branch)
VALUES (
    '33333333-0003-0003-0003-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'RHS-C08',
    'mod-algebra-linear',
    60,
    85,
    '{"track": "Support", "resources": ["Algebra I Ch. 1 Balance Basics", "Ask Vidura Linear Foundations"]}'::jsonb,
    '{"track": "Core", "resources": ["Algebra I Ch. 2 Multi-Step Equations", "Concept Reel 3"]}'::jsonb,
    '{"track": "Enrichment", "resources": ["Cartesian 3D Spatial Modeling", "Real-World Systems Challenge"]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Seed BF-07: Skill Benchmark for Alice Nguyen
INSERT INTO skill_benchmarks (tenant_id, user_id, skill_code, measured_score, benchmark_percentile, proficiency_tier)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '6', 'solve-linear', 88.5, 92, 'Proficient'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '6', 'variables', 95.0, 98, 'Advanced')
ON CONFLICT DO NOTHING;

-- Seed BF-08: Compliance Requirement (Electrical Workshop Safety)
INSERT INTO compliance_requirements (id, tenant_id, certificate_code, student_id, title, expires_at, auto_re_enroll, status)
VALUES 
    ('88888888-0008-0008-0008-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SAFETY-01', '6', 'Workshop Electrical Safety Standard', NOW() + INTERVAL '45 days', TRUE, 'expiring_soon')
ON CONFLICT (id) DO NOTHING;

-- Seed BF-10: In-Video Checkpoints for Lesson 1
INSERT INTO video_cue_points (tenant_id, video_id, timestamp_seconds, question_payload, is_blocking)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'les-transformer', 45, '{"question": "What is the primary function of the core in a transformer?", "options": ["Conduct current", "Guide magnetic flux", "Dissipate heat", "Insulate windings"], "correct": 1}'::jsonb, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'les-transformer', 120, '{"question": "Does step-up voltage increase current or decrease current?", "options": ["Increases current", "Decreases current", "Keeps current equal"], "correct": 1}'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

-- Seed BF-11: Verified Credential for Alice Nguyen
INSERT INTO verifiable_credentials (credential_id, tenant_id, recipient_id, course_name, claim_payload, signature_digest)
VALUES (
    'EDV-RHS-2026-ALICE-ALG',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '6',
    'Class 8 Algebra & Industrial Math',
    '{"mastery_level": 5, "verified_skills": ["Linear Equations", "Balance Model", "Variables"], "school": "Riverside High"}'::jsonb,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
)
ON CONFLICT (credential_id) DO NOTHING;

-- Seed BF-12: Academic Credit Ledger
INSERT INTO academic_credit_ledger (tenant_id, student_id, verified_hours, credits_awarded, verification_hash)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '6', 90.0, 3.0, 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a')
ON CONFLICT DO NOTHING;

-- Seed BF-19: Sim-to-Real Transfer
INSERT INTO sim_to_real_transfers (tenant_id, user_id, skill_id, sim_score, real_workshop_score, gap_flag)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '6', 'solve-linear', 94.0, 91.0, 'aligned'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '6', 'multimeter-calibration', 96.0, 89.0, 'aligned')
ON CONFLICT DO NOTHING;

-- Seed BF-20: Apprenticeship Filing Record
INSERT INTO apprenticeship_filing_records (tenant_id, student_id, employer_name, hours_logged, supervisor_pin_hash, compliance_batch_id, filing_status)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '6', 'Riverside Regional Tech Labs', 140.0, 'd033e22ae348aeb5660fc2140aec35850c4da997', 'COMP-2026-Q4-RHS', 'verified')
ON CONFLICT DO NOTHING;
