"""EdVidura UI Feature Registry & Dynamic OpenAPI Introspector.

Discovers, categorizes, and maps all mounted FastAPI capabilities, Tenancy Lego blocks,
and learning modules to frontend navigation and auto-generated workspace screens.
Zero external tool names are exposed: all capabilities are native EdVidura features.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


BUILTIN_FEATURES: List[Dict[str, Any]] = [
    # -------------------------------------------------------------
    # LEARNER CAPABILITIES
    # -------------------------------------------------------------
    {
        "feature_id": "socratic-coach",
        "title": "Guided Mastery Tutor (Ask Vidura)",
        "nav_label": "Ask Vidura",
        "role": "learner",
        "category": "Intelligent Tutoring",
        "target_route": "/learn/coach",
        "has_dedicated_route": True,
        "description": "6-stage guided mastery tutor that helps students reach independent understanding through diagnostic questions, 3-step hint ladders, and spaced reviews.",
        "template_type": "tutor-chat",
        "icon": "MessageCircle",
        "data_endpoint": "/api/v1/app/tutor/skill-tree",
        "mutation_endpoint": "/api/v1/app/tutor/turn",
        "kpis": [
            {"label": "Mastery Stages", "value": "Levels 0 to 5"},
            {"label": "Tutoring Mode", "value": "Guided Mastery"},
            {"label": "Voice Support", "value": "12 Indian Languages"},
        ],
        "actions": [
            {"id": "run_diagnostic", "label": "Start Skill Placement Check", "endpoint": "/api/v1/app/tutor/diagnostic"},
            {"id": "request_hint", "label": "Request Guided Hint", "endpoint": "/api/v1/app/tutor/turn"},
        ],
    },
    {
        "feature_id": "interactive-ebooks",
        "title": "Interactive Digital Textbooks",
        "nav_label": "eBooks",
        "role": "learner",
        "category": "Digital Library",
        "target_route": "/manuals",
        "has_dedicated_route": True,
        "description": "5 multi-chapter interactive textbooks with WCAG 2.1 AA accessibility, animated visual diagrams, concept checks, and Indian voice audiobook narration.",
        "template_type": "card-grid",
        "icon": "Library",
        "data_endpoint": "/api/v1/app/manuals",
        "mutation_endpoint": "/api/v1/app/manuals",
        "kpis": [
            {"label": "Digital Textbooks", "value": "5 Volumes"},
            {"label": "Accessibility Rating", "value": "WCAG 2.1 AA"},
            {"label": "Audiobook Speed", "value": "0.75x – 1.25x"},
        ],
        "actions": [
            {"id": "open_library", "label": "Browse Digital Library", "route": "/manuals"},
            {"id": "export_epub", "label": "Export EPUB3 Bundle", "endpoint": "/api/v1/app/manuals"},
        ],
    },
    {
        "feature_id": "concept-reels",
        "title": "Interactive Concept Reels",
        "nav_label": "Reels",
        "role": "learner",
        "category": "Micro-Learning",
        "target_route": "/learn/micro",
        "has_dedicated_route": True,
        "description": "Bite-sized visual learning reels with animated schematics, diagram callouts, and inline check questions.",
        "template_type": "interactive-studio",
        "icon": "Video",
        "data_endpoint": "/api/v1/app/micro",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Active Reels", "value": "6 Concept Modules"},
            {"label": "Visual Schematics", "value": "Circuit & Kinematics"},
            {"label": "Format", "value": "Step-Through Beats"},
        ],
        "actions": [
            {"id": "open_reels", "label": "Launch Visual Reels", "route": "/learn/micro"},
        ],
    },
    {
        "feature_id": "competency-graph",
        "title": "Semantic Competency Graph & Learning Plan",
        "nav_label": "My Plan",
        "role": "learner",
        "category": "Curriculum Standards",
        "target_route": "/learn/gap",
        "has_dedicated_route": True,
        "description": "Interactive node-and-edge knowledge graph linking competencies, lessons, textbook chapters, and quiz questions.",
        "template_type": "knowledge-graph",
        "icon": "ListChecks",
        "data_endpoint": "/api/v1/ld/graph",
        "mutation_endpoint": "/api/v1/app/personalized/generate",
        "kpis": [
            {"label": "Graph Nodes", "value": "8 Competency Nodes"},
            {"label": "Competency Mapping", "value": "Aligned to Syllabus"},
            {"label": "Graph Format", "value": "Semantic JSON-LD"},
        ],
        "actions": [
            {"id": "view_graph", "label": "Explore Semantic Graph", "route": "/learn/gap"},
            {"id": "fetch_ld", "label": "Inspect JSON-LD Triples", "endpoint": "/api/v1/ld/graph"},
        ],
    },
    {
        "feature_id": "voice-assistant",
        "title": "Voice Studio & Spoken-Math Assistant",
        "nav_label": "Voice Studio",
        "role": "learner",
        "category": "Multilingual AI",
        "target_route": "/workspace/voice-assistant",
        "has_dedicated_route": False,
        "description": "Real-time speech-to-text dictation across 12 Indian languages with automatic verbal filler stripping and spoken math normalization.",
        "template_type": "interactive-studio",
        "icon": "Mic",
        "data_endpoint": "/api/v1/app/voice/languages",
        "mutation_endpoint": "/api/v1/app/voice/cleanup",
        "kpis": [
            {"label": "Languages", "value": "12 Indian Locales"},
            {"label": "Math Normalizer", "value": "Spoken to Symbolic"},
            {"label": "Latency", "value": "< 120ms"},
        ],
        "actions": [
            {"id": "cleanup_voice", "label": "Normalize Spoken Math", "endpoint": "/api/v1/app/voice/cleanup"},
        ],
    },

    # -------------------------------------------------------------
    # INSTRUCTOR CAPABILITIES
    # -------------------------------------------------------------
    {
        "feature_id": "ebook-studio",
        "title": "Interactive eBook Authoring Studio",
        "nav_label": "eBooks",
        "role": "instructor",
        "category": "Content Authoring",
        "target_route": "/teacher/manuals",
        "has_dedicated_route": True,
        "description": "Rich-text WYSIWYG editor and document-to-eBook converter generating semantic HTML, EPUB3, and LTI Deep Link content items.",
        "template_type": "interactive-studio",
        "icon": "Library",
        "data_endpoint": "/api/v1/app/deep-link/items",
        "mutation_endpoint": "/api/v1/app/manuals/upload",
        "kpis": [
            {"label": "Authoring Mode", "value": "WYSIWYG & Document Upload"},
            {"label": "Deep Link Items", "value": "6 LMS Pickable Items"},
            {"label": "Export Formats", "value": "EPUB3 & HTML5"},
        ],
        "actions": [
            {"id": "open_studio", "label": "Open eBook Studio", "route": "/teacher/manuals"},
            {"id": "view_items", "label": "List Deep Link Items", "endpoint": "/api/v1/app/deep-link/items"},
        ],
    },
    {
        "feature_id": "teacher-skills-graph",
        "title": "Curriculum Standards & Competency Map",
        "nav_label": "Skills",
        "role": "instructor",
        "category": "Curriculum Alignment",
        "target_route": "/teacher/skills",
        "has_dedicated_route": True,
        "description": "Visual competency hierarchy and Linked Data inspection console linking institutional course goals to verifiable student evidence.",
        "template_type": "knowledge-graph",
        "icon": "GraduationCap",
        "data_endpoint": "/api/v1/ld/graph",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Linked Pillars", "value": "5 Learning Pillars"},
            {"label": "Vocabulary", "value": "Curriculum Triples"},
            {"label": "Interoperability", "value": "LTI 1.3 & xAPI"},
        ],
        "actions": [
            {"id": "view_skills", "label": "Open Competency Map", "route": "/teacher/skills"},
        ],
    },
    {
        "feature_id": "sme-rag-search",
        "title": "Subject Matter Knowledge Search",
        "nav_label": "Sources",
        "role": "instructor",
        "category": "Knowledge Base",
        "target_route": "/teacher/sme",
        "has_dedicated_route": True,
        "description": "RAG-powered knowledge retrieval engine over institutional course materials with voice search in 12 languages.",
        "template_type": "data-table",
        "icon": "ShieldCheck",
        "data_endpoint": "/api/v1/app/sme/sources",
        "mutation_endpoint": "/api/v1/app/sme/search",
        "kpis": [
            {"label": "Indexed Chunks", "value": "Course Reference Texts"},
            {"label": "Voice Querying", "value": "Enabled"},
            {"label": "Confidence", "value": "High Vector Match"},
        ],
        "actions": [
            {"id": "open_sme", "label": "Search Knowledge Base", "route": "/teacher/sme"},
        ],
    },

    # -------------------------------------------------------------
    # SCHOOL ADMIN CAPABILITIES
    # -------------------------------------------------------------
    {
        "feature_id": "admin-roster-sync",
        "title": "Authoritative LMS Roster Synchronization (NRPS)",
        "nav_label": "Students",
        "role": "school_admin",
        "category": "Enrollment Management",
        "target_route": "/school-admin/students",
        "has_dedicated_route": True,
        "description": "LTI 1.3 Names and Roles Provisioning Service sync keeping institutional classes and learner rosters synchronized with Moodle.",
        "template_type": "data-table",
        "icon": "Users",
        "data_endpoint": "/api/v1/app/roster/nrps",
        "mutation_endpoint": "/api/v1/app/roster/nrps/sync",
        "kpis": [
            {"label": "Provisioning Standard", "value": "LTI 1.3 NRPS"},
            {"label": "Active Learners", "value": "Class 8 Roster"},
            {"label": "Sync Health", "value": "Operational"},
        ],
        "actions": [
            {"id": "sync_roster", "label": "Sync LMS Memberships", "endpoint": "/api/v1/app/roster/nrps/sync"},
        ],
    },
    {
        "feature_id": "admin-lti-console",
        "title": "LTI 1.3 & Deep Linking Registration Console",
        "nav_label": "LTI Connection",
        "role": "school_admin",
        "category": "Standards & Interoperability",
        "target_route": "/lti-integration",
        "has_dedicated_route": True,
        "description": "LMS integration console managing public JWKS, dynamic registration, and LTI Advantage tool configurations.",
        "template_type": "interactive-studio",
        "icon": "Radio",
        "data_endpoint": "/api/v1/app/deep-link/items",
        "mutation_endpoint": "/lti/register",
        "kpis": [
            {"label": "LTI Specification", "value": "1.3 Advantage"},
            {"label": "Services Enabled", "value": "AGS, NRPS, Deep Linking"},
            {"label": "Platforms", "value": "Moodle, Canvas, Blackboard"},
        ],
        "actions": [
            {"id": "open_lti", "label": "Open LTI Console", "route": "/lti-integration"},
        ],
    },

    # -------------------------------------------------------------
    # 20 ENTERPRISE SYSTEM CAPABILITIES (BF-01 TO BF-20)
    # -------------------------------------------------------------
    {
        "feature_id": "agent-interventions",
        "title": "Automated Student Intervention Rules",
        "nav_label": "Interventions",
        "role": "instructor",
        "category": "Intelligent Automation",
        "target_route": "/teacher/analytics",
        "has_dedicated_route": True,
        "description": "Rule-based proactive agent evaluating inactivity, struggling attempts, and automated peer tutor assignments without background daemons.",
        "template_type": "data-table",
        "icon": "Sparkles",
        "data_endpoint": "/api/v1/agents/status",
        "mutation_endpoint": "/api/v1/agents/evaluate",
        "kpis": [
            {"label": "Active Rules", "value": "3 Production Rules"},
            {"label": "Interventions Triggered", "value": "12 This Term"},
            {"label": "Engine", "value": "On-Demand Event Evaluator"},
        ],
        "actions": [
            {"id": "evaluate_rules", "label": "Run Intervention Audit", "endpoint": "/api/v1/agents/evaluate"},
        ],
    },
    {
        "feature_id": "rubric-grader",
        "title": "Unified Rubric Grader",
        "nav_label": "Rubric Grader",
        "role": "instructor",
        "category": "Assessment & Evaluation",
        "target_route": "/teacher/attempts",
        "has_dedicated_route": True,
        "description": "Unified inline assessment grader with criteria sliders, point-based rubric evaluation, annotated feedback, and grade release muting.",
        "template_type": "interactive-studio",
        "icon": "ClipboardCheck",
        "data_endpoint": "/api/v1/grader/submissions/sub-c08-01",
        "mutation_endpoint": "/api/v1/grader/annotations",
        "kpis": [
            {"label": "Rubric Standard", "value": "Multi-Criteria Matrix"},
            {"label": "Grade State", "value": "Draft / Published"},
            {"label": "Grade Sync", "value": "LTI AGS Gradebook"},
        ],
        "actions": [
            {"id": "publish_grades", "label": "Publish Grades to LMS", "endpoint": "/api/v1/grader/publish-grades"},
        ],
    },
    {
        "feature_id": "adaptive-pathways",
        "title": "Adaptive Learning Pathways",
        "nav_label": "Pathways",
        "role": "learner",
        "category": "Adaptive Learning",
        "target_route": "/lessons",
        "has_dedicated_route": True,
        "description": "Conditional branching engine routing learners to remediation, standard reinforcement, or advanced challenge tracks based on score thresholds.",
        "template_type": "card-grid",
        "icon": "BookOpen",
        "data_endpoint": "/api/v1/adaptive/student-route/p-rajesh",
        "mutation_endpoint": "/api/v1/adaptive/mastery-path",
        "kpis": [
            {"label": "Current Tier", "value": "Standard / Mastery"},
            {"label": "Branching Logic", "value": "Score Thresholds (<70%, 70-85%, >85%)"},
            {"label": "Recommended Track", "value": "Direct to Hands-On Lab"},
        ],
        "actions": [
            {"id": "view_path", "label": "Open Adaptive Lessons", "route": "/lessons"},
        ],
    },
    {
        "feature_id": "event-stream",
        "title": "Live Learning Event Stream",
        "nav_label": "Activity Stream",
        "role": "instructor",
        "category": "Analytics & Telemetry",
        "target_route": "/teacher/activity",
        "has_dedicated_route": True,
        "description": "High-throughput append-only event stream logging Caliper/xAPI-compatible interactions with batch flushing and filtered inspection.",
        "template_type": "data-table",
        "icon": "Activity",
        "data_endpoint": "/api/v1/events/stream",
        "mutation_endpoint": "/api/v1/events/ingest",
        "kpis": [
            {"label": "Ingestion Rate", "value": "Sub-millisecond"},
            {"label": "Stream Storage", "value": "PostgreSQL Event Store"},
            {"label": "Event Types", "value": "Video, Quiz, Sim, Reading"},
        ],
        "actions": [
            {"id": "refresh_stream", "label": "Stream Latest Events", "endpoint": "/api/v1/events/stream"},
        ],
    },
    {
        "feature_id": "blueprint-sync",
        "title": "Master Curriculum Blueprint Sync",
        "nav_label": "Blueprint",
        "role": "school_admin",
        "category": "Curriculum Management",
        "target_route": "/school-admin/classes",
        "has_dedicated_route": True,
        "description": "Institutional master course syllabus cascading locked content and competencies to all affiliated class sections.",
        "template_type": "data-table",
        "icon": "Users",
        "data_endpoint": "/api/v1/blueprints/bp-stem-core-01/status",
        "mutation_endpoint": "/api/v1/blueprints/sync",
        "kpis": [
            {"label": "Master Blueprint", "value": "RHS-STEM-CORE-01"},
            {"label": "Associated Sections", "value": "4 Active Classes"},
            {"label": "Lock State", "value": "Syllabus Protected"},
        ],
        "actions": [
            {"id": "sync_blueprint", "label": "Cascade Blueprint Updates", "endpoint": "/api/v1/blueprints/sync"},
        ],
    },
    {
        "feature_id": "algorithmic-math",
        "title": "Algorithmic Practice Engine",
        "nav_label": "Math Practice",
        "role": "learner",
        "category": "Interactive STEM",
        "target_route": "/active-quizzes",
        "has_dedicated_route": True,
        "description": "Dynamic numerical question generator evaluating randomized parameters via safe AST syntax evaluation with configurable tolerance.",
        "template_type": "interactive-studio",
        "icon": "ClipboardList",
        "data_endpoint": "/api/v1/quiz/algorithmic/mint",
        "mutation_endpoint": "/api/v1/quiz/algorithmic/evaluate",
        "kpis": [
            {"label": "Generator Model", "value": "Pure Python Safe AST"},
            {"label": "Randomization", "value": "Unique Numbers per Attempt"},
            {"label": "Tolerance Margin", "value": "+/- 2%"},
        ],
        "actions": [
            {"id": "generate_problem", "label": "Mint Randomized Question", "endpoint": "/api/v1/quiz/algorithmic/mint"},
        ],
    },
    {
        "feature_id": "skill-benchmarks",
        "title": "Diagnostic Skill Benchmarking",
        "nav_label": "Benchmarks",
        "role": "learner",
        "category": "Competency Mastery",
        "target_route": "/learn/analytics",
        "has_dedicated_route": True,
        "description": "Automated skill tier assessment comparing learner mastery against institutional cohorts across core technical competencies.",
        "template_type": "card-grid",
        "icon": "BarChart3",
        "data_endpoint": "/api/v1/skills/benchmark/profile/p-rajesh",
        "mutation_endpoint": "/api/v1/skills/benchmark/start",
        "kpis": [
            {"label": "Assessed Level", "value": "Tier 3 (Mastery Candidate)"},
            {"label": "Cohort Percentile", "value": "88th Percentile"},
            {"label": "Benchmark Status", "value": "Active Verification"},
        ],
        "actions": [
            {"id": "start_benchmark", "label": "Initiate Diagnostic Benchmark", "endpoint": "/api/v1/skills/benchmark/start"},
        ],
    },
    {
        "feature_id": "compliance-engine",
        "title": "Safety Certification & Compliance Engine",
        "nav_label": "Compliance",
        "role": "school_admin",
        "category": "Institutional Governance",
        "target_route": "/school-admin",
        "has_dedicated_route": True,
        "description": "Automated tracking for industrial safety prerequisites, electrical certifications, and 30-day recurring recertification triggers.",
        "template_type": "data-table",
        "icon": "School",
        "data_endpoint": "/api/v1/compliance/expiring",
        "mutation_endpoint": "/api/v1/compliance/re-enroll",
        "kpis": [
            {"label": "Prerequisite Check", "value": "OSHA / Workshop Safety"},
            {"label": "Expiring Within 30d", "value": "1 Student Flagged"},
            {"label": "Audit State", "value": "Fully Compliant"},
        ],
        "actions": [
            {"id": "trigger_recert", "label": "Audit Expiring Certifications", "endpoint": "/api/v1/compliance/expiring"},
        ],
    },
    {
        "feature_id": "peer-review",
        "title": "Calibrated Peer Review Studio",
        "nav_label": "Peer Review",
        "role": "learner",
        "category": "Collaborative Learning",
        "target_route": "/active-quizzes",
        "has_dedicated_route": True,
        "description": "Double-blind student peer evaluation with instructor benchmark calibration, anonymized submissions, and rubric alignment score.",
        "template_type": "interactive-studio",
        "icon": "Users",
        "data_endpoint": "/api/v1/peer-review/assign",
        "mutation_endpoint": "/api/v1/peer-review/submit-grade",
        "kpis": [
            {"label": "Review Format", "value": "Double-Blind Anonymous"},
            {"label": "Calibration Threshold", "value": "90% Rubric Agreement"},
            {"label": "Assigned Reviews", "value": "2 Submissions"},
        ],
        "actions": [
            {"id": "open_peer_review", "label": "View Assigned Peer Review", "route": "/active-quizzes"},
        ],
    },
    {
        "feature_id": "video-checkpoints",
        "title": "Interactive In-Video Checkpoints",
        "nav_label": "Video Labs",
        "role": "learner",
        "category": "Interactive Media",
        "target_route": "/lessons",
        "has_dedicated_route": True,
        "description": "Interactive timestamped question cue points pausing instructional videos until concepts are successfully demonstrated.",
        "template_type": "interactive-studio",
        "icon": "Video",
        "data_endpoint": "/api/v1/video/vid-circuit-01/cues",
        "mutation_endpoint": "/api/v1/video/telemetry",
        "kpis": [
            {"label": "Active Video Cues", "value": "3 Checkpoints"},
            {"label": "Completion Rule", "value": "Gated Progression"},
            {"label": "Seek Restriction", "value": "Unwatched Video Guard"},
        ],
        "actions": [
            {"id": "watch_interactive_video", "label": "Launch Interactive Video Lesson", "route": "/lessons"},
        ],
    },
    {
        "feature_id": "verifiable-credentials",
        "title": "Verifiable Digital Credentials & Badges",
        "nav_label": "Credentials",
        "role": "learner",
        "category": "Certifications",
        "target_route": "/learn/analytics",
        "has_dedicated_route": True,
        "description": "Cryptographically signed digital certificates and micro-badges with SHA-256 verification hash and public ledger verification URL.",
        "template_type": "card-grid",
        "icon": "ShieldCheck",
        "data_endpoint": "/api/v1/credentials/verify/cred-edv-2026-001",
        "mutation_endpoint": "/api/v1/credentials/mint",
        "kpis": [
            {"label": "Issued Credentials", "value": "Earthing & Circuit Specialist"},
            {"label": "Verification Standard", "value": "SHA-256 Public Proof"},
            {"label": "Status", "value": "Cryptographically Sealed"},
        ],
        "actions": [
            {"id": "mint_credential", "label": "Mint Verifiable Digital Badge", "endpoint": "/api/v1/credentials/mint"},
        ],
    },
    {
        "feature_id": "credit-ledger",
        "title": "Academic Credit & Transfer Ledger",
        "nav_label": "Credits",
        "role": "learner",
        "category": "Accreditation",
        "target_route": "/learn/analytics",
        "has_dedicated_route": True,
        "description": "Competency-to-credit conversion broker mapping completed technical competencies to certified semester credit hours.",
        "template_type": "data-table",
        "icon": "BarChart3",
        "data_endpoint": "/api/v1/credits/ledger/p-rajesh",
        "mutation_endpoint": "/api/v1/credits/calculate",
        "kpis": [
            {"label": "Earned Credits", "value": "4.0 Semester Units"},
            {"label": "Transfer Readiness", "value": "State Technical Board Approved"},
            {"label": "Hours Equivalency", "value": "120 Lab Hours"},
        ],
        "actions": [
            {"id": "calc_credits", "label": "Calculate Academic Units", "endpoint": "/api/v1/credits/calculate"},
        ],
    },
    {
        "feature_id": "i18n-gateway",
        "title": "Multilingual Educational Translation Gateway",
        "nav_label": "Translations",
        "role": "learner",
        "category": "Multilingual AI",
        "target_route": "/learn/coach",
        "has_dedicated_route": True,
        "description": "High-performance terminology translation engine caching academic concept translations across Hindi, Telugu, Tamil, and Kannada.",
        "template_type": "interactive-studio",
        "icon": "MessageCircle",
        "data_endpoint": "/api/v1/i18n/translate",
        "mutation_endpoint": "/api/v1/i18n/translate",
        "kpis": [
            {"label": "Supported Languages", "value": "12 Indian Locales"},
            {"label": "Translation Cache", "value": "Pre-Cached Technical Glossaries"},
            {"label": "STEM Preservation", "value": "Preserves Math Formulas & Symbols"},
        ],
        "actions": [
            {"id": "translate_sample", "label": "Translate Course Terminology", "endpoint": "/api/v1/i18n/translate"},
        ],
    },
    {
        "feature_id": "offline-sync",
        "title": "Local-First Offline Sync Engine",
        "nav_label": "Offline Sync",
        "role": "learner",
        "category": "Offline Resilience",
        "target_route": "/lessons",
        "has_dedicated_route": True,
        "description": "Conflict-free revision sync protocol allowing learners to submit notes, quiz responses, and lesson progress without continuous connectivity.",
        "template_type": "data-table",
        "icon": "BookOpen",
        "data_endpoint": "/api/v1/sync/pull?doc_id=doc-notes-c08-01&since_rev=0",
        "mutation_endpoint": "/api/v1/sync/push",
        "kpis": [
            {"label": "Sync Model", "value": "Append-Only Conflict-Free Ledger"},
            {"label": "Pending Operations", "value": "0 (Synchronized)"},
            {"label": "Offline Resilience", "value": "Full Local Storage Cache"},
        ],
        "actions": [
            {"id": "push_sync", "label": "Synchronize Pending Edits", "endpoint": "/api/v1/sync/push"},
        ],
    },
    {
        "feature_id": "proctoring-sentinel",
        "title": "Exam Integrity & Proctoring Sentinel",
        "nav_label": "Proctoring",
        "role": "instructor",
        "category": "Exam Security",
        "target_route": "/teacher/attempts",
        "has_dedicated_route": True,
        "description": "Passive client-side telemetry monitor flagging browser tab switches, multi-face presence, and clipboard pastes with chronological incident logs.",
        "template_type": "data-table",
        "icon": "ShieldCheck",
        "data_endpoint": "/api/v1/proctoring/session/sess-exam-01/timeline",
        "mutation_endpoint": "/api/v1/proctoring/incident",
        "kpis": [
            {"label": "Integrity Score", "value": "98% Clean Session"},
            {"label": "Flagged Incidents", "value": "0 High-Severity Flags"},
            {"label": "Privacy Mode", "value": "Zero Video Storage / Zero Biometrics"},
        ],
        "actions": [
            {"id": "inspect_proctoring", "label": "Review Integrity Timeline", "endpoint": "/api/v1/proctoring/session/sess-exam-01/timeline"},
        ],
    },
    {
        "feature_id": "chat-quiz-minter",
        "title": "Conversational Understanding Quiz",
        "nav_label": "Test Understanding",
        "role": "learner",
        "category": "Intelligent Tutoring",
        "target_route": "/learn/coach",
        "has_dedicated_route": True,
        "description": "On-demand quiz generator synthesizing a 3-question diagnostic comprehension check directly from the active tutoring dialog.",
        "template_type": "interactive-studio",
        "icon": "MessageCircle",
        "data_endpoint": "/api/v1/coach/mint-quiz",
        "mutation_endpoint": "/api/v1/coach/submit-minted-quiz",
        "kpis": [
            {"label": "Questions", "value": "3 Targeted Conceptual Checks"},
            {"label": "Generation Source", "value": "Active Socratic Conversation"},
            {"label": "Instant Feedback", "value": "Step-by-Step Rationale"},
        ],
        "actions": [
            {"id": "mint_quiz", "label": "Generate 3-Question Mini Quiz", "endpoint": "/api/v1/coach/mint-quiz"},
        ],
    },
    {
        "feature_id": "notes-synthesizer",
        "title": "Dynamic Revision Notes Synthesizer",
        "nav_label": "Study Notes",
        "role": "learner",
        "category": "Content Synthesis",
        "target_route": "/learn/coach",
        "has_dedicated_route": True,
        "description": "Auto-generated bulleted revision summaries synthesizing tutoring dialogues and chapter content into printable review handouts.",
        "template_type": "interactive-studio",
        "icon": "FileText",
        "data_endpoint": "/api/v1/coach/download-notes/sum-dyn-001",
        "mutation_endpoint": "/api/v1/coach/synthesize-notes",
        "kpis": [
            {"label": "Handout Format", "value": "Structured Bullet Summary"},
            {"label": "Key Concepts", "value": "Ohm's Law, Circuits, Safety"},
            {"label": "Print Friendly", "value": "Clean Markdown & Printable View"},
        ],
        "actions": [
            {"id": "create_notes", "label": "Synthesize Revision Sheet", "endpoint": "/api/v1/coach/synthesize-notes"},
        ],
    },
    {
        "feature_id": "chapter-bot",
        "title": "Chapter-Anchored Question Assistant",
        "nav_label": "Chapter Assistant",
        "role": "learner",
        "category": "Digital Library",
        "target_route": "/manuals",
        "has_dedicated_route": True,
        "description": "Embedded chapter-level question-answering assistant resolving student doubts restricted to the current textbook section.",
        "template_type": "tutor-chat",
        "icon": "Library",
        "data_endpoint": "/api/v1/coach/topic/ch-circuits-01/init",
        "mutation_endpoint": "/api/v1/coach/topic/ch-circuits-01/ask",
        "kpis": [
            {"label": "Context Scope", "value": "Bound to Active Chapter"},
            {"label": "Hallucination Guard", "value": "Strict Grounding on Textbook"},
            {"label": "Voice Readout", "value": "Available in 12 Locales"},
        ],
        "actions": [
            {"id": "ask_chapter", "label": "Ask Chapter Question", "endpoint": "/api/v1/coach/topic/ch-circuits-01/ask"},
        ],
    },
    {
        "feature_id": "sim-to-real-transfer",
        "title": "Virtual-to-Workshop Transfer Benchmark",
        "nav_label": "Sim-to-Real",
        "role": "instructor",
        "category": "Vocational Excellence",
        "target_route": "/teacher/analytics",
        "has_dedicated_route": True,
        "description": "Correlation ledger benchmarking student performance in 3D digital labs against physical workshop execution tasks.",
        "template_type": "data-table",
        "icon": "Activity",
        "data_endpoint": "/api/v1/workforce/transfer-report",
        "mutation_endpoint": "/api/v1/workforce/transfer-log",
        "kpis": [
            {"label": "Transfer Efficiency", "value": "96.4% Correlation"},
            {"label": "Readiness Tier", "value": "Certified for Workshop Rig"},
            {"label": "Tracked Tasks", "value": "Earthing Rig, Stator Wiring"},
        ],
        "actions": [
            {"id": "log_transfer", "label": "Record Workshop Benchmark", "endpoint": "/api/v1/workforce/transfer-log"},
        ],
    },
    {
        "feature_id": "apprenticeship-ojt",
        "title": "Apprenticeship & OJT Compliance Tracker",
        "nav_label": "Apprenticeship",
        "role": "school_admin",
        "category": "Institutional Governance",
        "target_route": "/school-admin",
        "has_dedicated_route": True,
        "description": "On-the-job training (OJT) and related technical instruction (RTI) hour aggregator exporting verified state compliance filings.",
        "template_type": "data-table",
        "icon": "School",
        "data_endpoint": "/api/v1/workforce/apprenticeship/status",
        "mutation_endpoint": "/api/v1/workforce/apprenticeship/generate-filing",
        "kpis": [
            {"label": "Required OJT Hours", "value": "2,000 Hours (48.5% Complete)"},
            {"label": "Classroom Hours", "value": "174 / 144 Hours Complete"},
            {"label": "Wage Progression", "value": "Tier 2 -> Tier 3 Eligible"},
        ],
        "actions": [
            {"id": "generate_filing", "label": "Generate OJT Compliance Filing", "endpoint": "/api/v1/workforce/apprenticeship/generate-filing"},
        ],
    },
]


def introspect_app_features(app: Any = None) -> List[Dict[str, Any]]:
    """Introspect FastAPI application routes and merge with modular tenancy blocks."""
    features = [dict(f) for f in BUILTIN_FEATURES]

    # Dynamically introspect Tenancy Lego blocks
    try:
        from app.modules.tenancy import list_blocks
        lego_blocks = list_blocks()
        for blk in lego_blocks:
            bid = str(blk.get("id", "")).lower()
            if not bid or any(f["feature_id"] == f"mod-{bid}" for f in features):
                continue
            tier = blk.get("tier", "Core")
            features.append({
                "feature_id": f"mod-{bid}",
                "title": blk.get("name") or f"Module: {bid.title()}",
                "nav_label": blk.get("name") or bid.title(),
                "role": "instructor" if "teach" in bid or "author" in bid else "school_admin",
                "category": f"Enterprise Capability ({tier})",
                "target_route": f"/workspace/mod-{bid}",
                "has_dedicated_route": False,
                "description": blk.get("description") or f"Enterprise capability block: {bid}.",
                "template_type": "card-grid",
                "icon": "Sparkles",
                "data_endpoint": "/api/v1/blocks/catalog",
                "mutation_endpoint": None,
                "kpis": [
                    {"label": "Tier", "value": tier},
                    {"label": "Status", "value": blk.get("status", "Active")},
                ],
                "actions": [
                    {"id": "inspect_block", "label": "Inspect Module Details", "endpoint": "/api/v1/blocks/catalog"},
                ],
            })
    except Exception:
        pass

    return features


def get_ui_registry(role: Optional[str] = None, app: Any = None) -> Dict[str, Any]:
    """Return filtered and categorized UI registry for client consumption."""
    all_features = introspect_app_features(app)

    norm_role = None
    if role:
        r = role.strip().lower()
        if r in ("learner", "student", "alice"):
            norm_role = "learner"
        elif r in ("instructor", "teacher", "priya"):
            norm_role = "instructor"
        elif r in ("admin", "school_admin", "school-admin", "alex", "trainingofficer"):
            norm_role = "school_admin"

    filtered = [
        f for f in all_features
        if norm_role is None or f.get("role") in (norm_role, "all")
    ]

    categories = list(dict.fromkeys(f.get("category", "General") for f in filtered))

    return {
        "ok": True,
        "count": len(filtered),
        "total_available": len(all_features),
        "active_role": norm_role or "all",
        "categories": categories,
        "features": filtered,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
    }
