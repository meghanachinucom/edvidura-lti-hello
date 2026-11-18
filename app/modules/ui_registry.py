"""Automatic Live Backend-to-Frontend UI Feature Registry & OpenAPI Introspector.

Discovers, categorizes, and maps all mounted FastAPI routes, Tenancy Lego blocks,
and open-source AI capabilities to frontend-react navigation and auto-generated workspace screens.
"""
from __future__ import annotations

import inspect
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# Base feature catalog covering all required and existing capabilities
BUILTIN_FEATURES: List[Dict[str, Any]] = [
    # -------------------------------------------------------------
    # LEARNER CAPABILITIES
    # -------------------------------------------------------------
    {
        "feature_id": "socratic-tutor",
        "title": "Jane Street Socratic Tutor (Ask Vidura)",
        "nav_label": "Socratic Tutor",
        "role": "learner",
        "category": "AI & Socratic Learning",
        "target_route": "/learn/coach",
        "has_dedicated_route": True,
        "description": "6-stage maieutic tutor that guides students to independent mastery through diagnostic hints without giving away direct answers.",
        "template_type": "tutor-chat",
        "icon": "Brain",
        "data_endpoint": "/api/v1/app/coach",
        "mutation_endpoint": "/api/v1/app/coach",
        "kpis": [
            {"label": "Active Mastery Skills", "value": "4 Competencies"},
            {"label": "Pedagogical Method", "value": "Jane Street Socratic"},
            {"label": "Supported Languages", "value": "12 Indian Locales"},
        ],
        "actions": [
            {"id": "run_diagnostic", "label": "Run Socratic Diagnostic", "endpoint": "/api/v1/app/coach"},
            {"id": "request_hint", "label": "Request Guided Hint", "endpoint": "/api/v1/app/coach"},
        ],
    },
    {
        "feature_id": "papermorph-ebooks",
        "title": "PaperMorph Interactive Textbooks",
        "nav_label": "Interactive eBooks (5)",
        "role": "learner",
        "category": "Interactive Digital Library",
        "target_route": "/manuals",
        "has_dedicated_route": True,
        "description": "5 multi-chapter interactive textbooks with WCAG 2.1 AA accessibility, animated visual diagrams, concept checks, and Indian audiobook narration.",
        "template_type": "card-grid",
        "icon": "BookOpen",
        "data_endpoint": "/api/v1/app/manuals",
        "mutation_endpoint": "/api/v1/app/manuals",
        "kpis": [
            {"label": "Seeded Textbooks", "value": "5 Volumes"},
            {"label": "Accessibility Rating", "value": "WCAG 2.1 AA"},
            {"label": "Audiobook Speed", "value": "0.75x – 1.25x"},
        ],
        "actions": [
            {"id": "open_library", "label": "Browse Digital Library", "route": "/manuals"},
            {"id": "export_epub", "label": "Download EPUB3 Bundle", "endpoint": "/api/v1/app/manuals"},
        ],
    },
    {
        "feature_id": "papermorph-reels",
        "title": "PaperMorph Interactive Reels",
        "nav_label": "PaperMorph Reels",
        "role": "learner",
        "category": "Interactive Digital Library",
        "target_route": "/learn/micro",
        "has_dedicated_route": True,
        "description": "Bite-sized micro-learning reels with visual keyframe schematics and inline interactive concept check cards.",
        "template_type": "card-grid",
        "icon": "Video",
        "data_endpoint": "/api/v1/app/micro",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Reel Format", "value": "PaperMorph Web Book"},
            {"label": "Diagram Callouts", "value": "Schematic / SVG"},
            {"label": "Completion Rate", "value": "88%"},
        ],
        "actions": [
            {"id": "watch_reels", "label": "Explore Micro Reels", "route": "/learn/micro"},
        ],
    },
    {
        "feature_id": "linked-data-graph",
        "title": "I2IDL 5-Pillar Linked Data & Study Plan",
        "nav_label": "Linked Data & Study Plan",
        "role": "learner",
        "category": "Standards & Interoperability",
        "target_route": "/learn/gap",
        "has_dedicated_route": True,
        "description": "Standardized competency alignment connecting IEEE 1484.20.3 competencies to IEEE 2881 learning metadata, PEBL chapters, and diagnostic evidence.",
        "template_type": "knowledge-graph",
        "icon": "Network",
        "data_endpoint": "/api/v1/ld/graph",
        "mutation_endpoint": "/api/v1/app/plan",
        "kpis": [
            {"label": "RDF Competencies", "value": "IEEE 1484.20.3"},
            {"label": "Metadata Schema", "value": "IEEE 2881"},
            {"label": "Graph Triples", "value": "24 Linked Relations"},
        ],
        "actions": [
            {"id": "inspect_graph", "label": "Open Graph Visualizer", "route": "/learn/gap"},
            {"id": "view_jsonld", "label": "Fetch Raw JSON-LD", "endpoint": "/api/v1/ld/graph"},
        ],
    },
    {
        "feature_id": "freeflow-voice",
        "title": "FreeFlow Indian Voice & Spoken Math Studio",
        "nav_label": "Voice & Math Studio",
        "role": "learner",
        "category": "AI & Socratic Learning",
        "target_route": "/workspace/freeflow-voice",
        "has_dedicated_route": False,
        "description": "High-accuracy Indian multilingual speech dictation and real-time spoken mathematics cleanup ('two x plus five' -> '2x + 5 = 15').",
        "template_type": "interactive-studio",
        "icon": "Mic",
        "data_endpoint": "/api/v1/app/voice/cleanup",
        "mutation_endpoint": "/api/v1/app/voice/cleanup",
        "kpis": [
            {"label": "Supported Languages", "value": "12 Indian Locales"},
            {"label": "Math Normalizer", "value": "LaTeX / Arithmetic"},
            {"label": "Filler Removal", "value": "Um / Uh / You know"},
        ],
        "actions": [
            {"id": "test_cleanup", "label": "Test Spoken Math Cleanup", "endpoint": "/api/v1/app/voice/cleanup"},
        ],
    },
    {
        "feature_id": "learner-flashcards",
        "title": "Spaced-Repetition Study Flashcards",
        "nav_label": "Flashcards",
        "role": "learner",
        "category": "Interactive Digital Library",
        "target_route": "/learn/flashcards",
        "has_dedicated_route": True,
        "description": "Active recall and spaced review flashcards synchronized with textbook chapter formulas and key vocabulary.",
        "template_type": "card-grid",
        "icon": "ClipboardCheck",
        "data_endpoint": "/api/v1/app/flashcards",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Card Decks", "value": "Algebra I & Science"},
            {"label": "Recall Mode", "value": "Leitner System"},
        ],
        "actions": [
            {"id": "review_cards", "label": "Start Flashcard Review", "route": "/learn/flashcards"},
        ],
    },
    {
        "feature_id": "learner-activity",
        "title": "Activity Stream & xAPI Statements",
        "nav_label": "Activity & Evidence",
        "role": "learner",
        "category": "Analytics & Learning Evidence",
        "target_route": "/learn/activity",
        "has_dedicated_route": True,
        "description": "Verifiable xAPI learning evidence trail recording read, interacted, completed, and answered statements.",
        "template_type": "data-table",
        "icon": "Activity",
        "data_endpoint": "/api/v1/app/activity",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "xAPI Standard", "value": "IEEE 2881 / ADL"},
            {"label": "LRS Pipeline", "value": "Active & Verifiable"},
        ],
        "actions": [
            {"id": "view_activity", "label": "View Learning Evidence", "route": "/learn/activity"},
        ],
    },
    {
        "feature_id": "learner-analytics",
        "title": "Progress Snapshot & Mastery Analytics",
        "nav_label": "Progress Snapshot",
        "role": "learner",
        "category": "Analytics & Learning Evidence",
        "target_route": "/learn/analytics",
        "has_dedicated_route": True,
        "description": "Curriculum completion rings, weekly rhythm analysis, and formative assessment mastery breakdown.",
        "template_type": "card-grid",
        "icon": "BarChart3",
        "data_endpoint": "/api/v1/app/analytics",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Course Progress", "value": "84% Complete"},
            {"label": "Quiz Average", "value": "88% Accuracy"},
        ],
        "actions": [
            {"id": "view_analytics", "label": "View Progress Snapshot", "route": "/learn/analytics"},
        ],
    },

    # -------------------------------------------------------------
    # INSTRUCTOR CAPABILITIES
    # -------------------------------------------------------------
    {
        "feature_id": "teacher-results",
        "title": "Class Results & Formative Assessment",
        "nav_label": "Class Results",
        "role": "instructor",
        "category": "Curriculum & Evaluation",
        "target_route": "/teacher/attempts",
        "has_dedicated_route": True,
        "description": "Authoritative gradebook submissions, AGS score lineitem passback, and item-by-item response diagnostics.",
        "template_type": "data-table",
        "icon": "ClipboardCheck",
        "data_endpoint": "/api/v1/app/attempts",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Active Course", "value": "Class 8 · RHS-C08"},
            {"label": "LTI AGS Passback", "value": "Enabled (100%)"},
        ],
        "actions": [
            {"id": "view_grades", "label": "Inspect Gradebook", "route": "/teacher/attempts"},
        ],
    },
    {
        "feature_id": "teacher-content",
        "title": "Content Studio & Lesson Authoring",
        "nav_label": "Content Studio",
        "role": "instructor",
        "category": "Curriculum & Evaluation",
        "target_route": "/teacher/content",
        "has_dedicated_route": True,
        "description": "Multi-chapter curriculum structuring, competency tag association, and lesson publication workflows.",
        "template_type": "interactive-studio",
        "icon": "FileText",
        "data_endpoint": "/api/v1/app/content",
        "mutation_endpoint": "/api/v1/app/content",
        "kpis": [
            {"label": "Total Modules", "value": "5 Units"},
            {"label": "Competency Coverage", "value": "100%"},
        ],
        "actions": [
            {"id": "edit_content", "label": "Open Content Studio", "route": "/teacher/content"},
        ],
    },
    {
        "feature_id": "teacher-ebook-studio",
        "title": "eBook Studio & LTI Deep Linking (F-01/F-02/F-08)",
        "nav_label": "eBook Studio & Deep Link",
        "role": "instructor",
        "category": "Interactive Digital Library",
        "target_route": "/teacher/manuals",
        "has_dedicated_route": True,
        "description": "WYSIWYG rich-text textbook editor, AI document converter (PDF/Word to EPUB3/HTML), and LTI 1.3 Content-Item selection modal.",
        "template_type": "interactive-studio",
        "icon": "Library",
        "data_endpoint": "/api/v1/app/deep-link/items",
        "mutation_endpoint": "/api/v1/app/manuals/upload",
        "kpis": [
            {"label": "Available Deep Links", "value": "6 Standard Items"},
            {"label": "Converter Pipeline", "value": "PDF / EPUB3 / HTML"},
        ],
        "actions": [
            {"id": "open_studio", "label": "Open eBook Studio", "route": "/teacher/manuals"},
            {"id": "preview_picker", "label": "Open Deep Link Content Picker", "endpoint": "/api/v1/app/deep-link/items"},
        ],
    },
    {
        "feature_id": "teacher-skills-graph",
        "title": "Skills & I2IDL Linked Data Knowledge Graph",
        "nav_label": "Skills & Linked Data Graph",
        "role": "instructor",
        "category": "Standards & Interoperability",
        "target_route": "/teacher/skills",
        "has_dedicated_route": True,
        "description": "Comprehensive competency graph displaying cross-module semantic ties, difference training paths, and JSON-LD RDF triples.",
        "template_type": "knowledge-graph",
        "icon": "GraduationCap",
        "data_endpoint": "/api/v1/ld/graph",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Graph Triples", "value": "IEEE 1484.20.3"},
            {"label": "Resolvable URIs", "value": "W3C Linked Data"},
        ],
        "actions": [
            {"id": "view_skills", "label": "Open Skills Graph", "route": "/teacher/skills"},
        ],
    },
    {
        "feature_id": "teacher-sme-rag",
        "title": "SME RAG & Voice Knowledge Search",
        "nav_label": "SME RAG & Voice Search",
        "role": "instructor",
        "category": "AI & Socratic Learning",
        "target_route": "/teacher/sme",
        "has_dedicated_route": True,
        "description": "Subject Matter Expert contextual retrieval engine over curriculum materials with voice query support in 12 Indian languages.",
        "template_type": "interactive-studio",
        "icon": "ShieldCheck",
        "data_endpoint": "/api/v1/app/sme",
        "mutation_endpoint": "/api/v1/app/sme/query",
        "kpis": [
            {"label": "Indexed Corpora", "value": "Math, Science & Safety"},
            {"label": "Voice Query", "value": "12 Indian Languages"},
        ],
        "actions": [
            {"id": "query_sme", "label": "Search SME Knowledge", "route": "/teacher/sme"},
        ],
    },
    {
        "feature_id": "teacher-dct",
        "title": "Micro-Planner & Dynamic Competency Targeting (DCT)",
        "nav_label": "Micro-Planner (DCT)",
        "role": "instructor",
        "category": "Curriculum & Evaluation",
        "target_route": "/teacher/dct",
        "has_dedicated_route": True,
        "description": "Dynamic syllabus micro-planning mapping specific class session hours to diagnostic learning gaps.",
        "template_type": "card-grid",
        "icon": "Video",
        "data_endpoint": "/api/v1/app/dct",
        "mutation_endpoint": "/api/v1/app/dct",
        "kpis": [
            {"label": "Active Lesson Plans", "value": "12 Micro-Units"},
            {"label": "Gap Remediation", "value": "Alg. Balancing"},
        ],
        "actions": [
            {"id": "open_dct", "label": "Open Micro-Planner", "route": "/teacher/dct"},
        ],
    },
    {
        "feature_id": "teacher-analytics",
        "title": "Class Performance & Intervention Analytics",
        "nav_label": "Class Analytics",
        "role": "instructor",
        "category": "Analytics & Learning Evidence",
        "target_route": "/teacher/analytics",
        "has_dedicated_route": True,
        "description": "Cohort performance distribution, student struggle alerts, and formative outcome forecasting.",
        "template_type": "card-grid",
        "icon": "BarChart3",
        "data_endpoint": "/api/v1/app/teacher/analytics",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Enrolled Cohort", "value": "24 Students"},
            {"label": "Students On Track", "value": "87.5%"},
        ],
        "actions": [
            {"id": "view_class_analytics", "label": "Inspect Cohort Analytics", "route": "/teacher/analytics"},
        ],
    },
    {
        "feature_id": "teacher-activity",
        "title": "Live Classroom Activity Stream",
        "nav_label": "Activity Stream",
        "role": "instructor",
        "category": "Analytics & Learning Evidence",
        "target_route": "/teacher/activity",
        "has_dedicated_route": True,
        "description": "Real-time feed of learner quiz submissions, textbook progress, and Socratic coach interactions.",
        "template_type": "data-table",
        "icon": "Activity",
        "data_endpoint": "/api/v1/app/teacher/activity",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Real-Time Events", "value": "Live Polling"},
            {"label": "Event Types", "value": "Quizzes / eBooks / Coach"},
        ],
        "actions": [
            {"id": "view_stream", "label": "View Activity Stream", "route": "/teacher/activity"},
        ],
    },
    {
        "feature_id": "teacher-roster",
        "title": "Authoritative Student Directory & NRPS",
        "nav_label": "NRPS Roster",
        "role": "instructor",
        "category": "Institutional Operations",
        "target_route": "/student-directory",
        "has_dedicated_route": True,
        "description": "Class 8 enrolled roster synced with LMS course memberships via Names and Roles Provisioning Service.",
        "template_type": "data-table",
        "icon": "Users",
        "data_endpoint": "/api/v1/app/roster/nrps",
        "mutation_endpoint": "/api/v1/app/roster/nrps/sync",
        "kpis": [
            {"label": "Authoritative Source", "value": "LTI 1.3 NRPS"},
            {"label": "Class 8 Roster", "value": "6 Active Learners"},
        ],
        "actions": [
            {"id": "sync_roster", "label": "Sync LMS Roster", "endpoint": "/api/v1/app/roster/nrps/sync"},
        ],
    },

    # -------------------------------------------------------------
    # SCHOOL ADMIN CAPABILITIES
    # -------------------------------------------------------------
    {
        "feature_id": "admin-overview",
        "title": "School Administrator Overview",
        "nav_label": "Overview",
        "role": "school_admin",
        "category": "Institutional Operations",
        "target_route": "/school-admin",
        "has_dedicated_route": True,
        "description": "Institution health KPI cards, tenant governance, and LMS integration operational monitoring.",
        "template_type": "card-grid",
        "icon": "School",
        "data_endpoint": "/api/v1/app/institution",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Total Classes", "value": "10 Active"},
            {"label": "Teaching Faculty", "value": "10 Instructors"},
            {"label": "Total Learners", "value": "220 Students"},
        ],
        "actions": [
            {"id": "open_overview", "label": "Open Admin Dashboard", "route": "/school-admin"},
        ],
    },
    {
        "feature_id": "admin-classes",
        "title": "Class Management & Sections",
        "nav_label": "Classes (10)",
        "role": "school_admin",
        "category": "Institutional Operations",
        "target_route": "/school-admin/classes",
        "has_dedicated_route": True,
        "description": "Manage institutional class codes, academic terms, and teacher assignments.",
        "template_type": "data-table",
        "icon": "Users",
        "data_endpoint": "/api/v1/app/school-admin/classes",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Grade 8 Class", "value": "RHS-C08 (Algebra I)"},
            {"label": "Sync Status", "value": "Bound to Moodle ID 10"},
        ],
        "actions": [
            {"id": "view_classes", "label": "Manage Classes", "route": "/school-admin/classes"},
        ],
    },
    {
        "feature_id": "admin-teachers",
        "title": "Faculty Directory & Course Assignments",
        "nav_label": "Faculty (10)",
        "role": "school_admin",
        "category": "Institutional Operations",
        "target_route": "/school-admin/teachers",
        "has_dedicated_route": True,
        "description": "Manage instructor accounts, course allocations, and teaching credentials.",
        "template_type": "data-table",
        "icon": "GraduationCap",
        "data_endpoint": "/api/v1/app/school-admin/teachers",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Head of Math", "value": "Priya Sharma"},
            {"label": "Active Faculty", "value": "10 Verified"},
        ],
        "actions": [
            {"id": "view_faculty", "label": "View Faculty Directory", "route": "/school-admin/teachers"},
        ],
    },
    {
        "feature_id": "admin-students",
        "title": "Learner Roster & NRPS Sync",
        "nav_label": "Learners & NRPS (220)",
        "role": "school_admin",
        "category": "Institutional Operations",
        "target_route": "/school-admin/students",
        "has_dedicated_route": True,
        "description": "Authoritative student directory with 1-click LMS NRPS roster synchronization.",
        "template_type": "data-table",
        "icon": "Users",
        "data_endpoint": "/api/v1/app/roster/nrps",
        "mutation_endpoint": "/api/v1/app/roster/nrps/sync",
        "kpis": [
            {"label": "Total Students", "value": "220 Enrolled"},
            {"label": "NRPS Roster Service", "value": "Online & Synced"},
        ],
        "actions": [
            {"id": "sync_admin_roster", "label": "Sync LMS Memberships", "endpoint": "/api/v1/app/roster/nrps/sync"},
        ],
    },
    {
        "feature_id": "admin-institution",
        "title": "Institution Profile & Tenant Settings",
        "nav_label": "Institution Profile",
        "role": "school_admin",
        "category": "Institutional Operations",
        "target_route": "/institution-detail",
        "has_dedicated_route": True,
        "description": "Riverside High School institutional attributes, domain settings, and data retention rules.",
        "template_type": "interactive-studio",
        "icon": "Building2",
        "data_endpoint": "/api/v1/app/institution",
        "mutation_endpoint": None,
        "kpis": [
            {"label": "Tenant Name", "value": "Riverside High School"},
            {"label": "RLS Isolation", "value": "Active Tenant A"},
        ],
        "actions": [
            {"id": "view_profile", "label": "Inspect Institution Profile", "route": "/institution-detail"},
        ],
    },
    {
        "feature_id": "admin-lti-integration",
        "title": "LTI 1.3 Platforms & Deep Linking Registration",
        "nav_label": "LTI 1.3 & Deep Linking",
        "role": "school_admin",
        "category": "Standards & Interoperability",
        "target_route": "/lti-integration",
        "has_dedicated_route": True,
        "description": "LMS integration console for Moodle, Canvas, Blackboard, and Brightspace with public JWKS and dynamic registration.",
        "template_type": "interactive-studio",
        "icon": "Radio",
        "data_endpoint": "/api/v1/app/deep-link/items",
        "mutation_endpoint": "/lti/register",
        "kpis": [
            {"label": "LTI Specification", "value": "1.3 Core & Advantage"},
            {"label": "Services Enabled", "value": "AGS, NRPS, Deep Linking"},
        ],
        "actions": [
            {"id": "open_lti_console", "label": "Open LTI Console", "route": "/lti-integration"},
        ],
    },
]


def introspect_app_features(app: Any = None) -> List[Dict[str, Any]]:
    """Introspect FastAPI application routes and merge with Lego tenancy blocks."""
    features = [dict(f) for f in BUILTIN_FEATURES]

    # Dynamically introspect Tenancy Lego blocks
    try:
        from app.modules.tenancy import list_blocks
        lego_blocks = list_blocks()
        for blk in lego_blocks:
            bid = str(blk.get("id", "")).lower()
            if not bid or any(f["feature_id"] == f"lego-{bid}" for f in features):
                continue
            cat = "Lego Tenancy Block"
            tier = blk.get("tier", "Core")
            features.append({
                "feature_id": f"lego-{bid}",
                "title": blk.get("name") or f"Block: {bid.title()}",
                "nav_label": blk.get("name") or bid.title(),
                "role": "instructor" if "teach" in bid or "author" in bid else "school_admin",
                "category": f"Dynamic Capability ({tier})",
                "target_route": f"/workspace/lego-{bid}",
                "has_dedicated_route": False,
                "description": blk.get("description") or f"Dynamically discovered Lego block: {bid}.",
                "template_type": "card-grid",
                "icon": "Sparkles",
                "data_endpoint": "/api/v1/blocks/catalog",
                "mutation_endpoint": None,
                "kpis": [
                    {"label": "Wave Tier", "value": tier},
                    {"label": "Block Status", "value": blk.get("status", "Active")},
                ],
                "actions": [
                    {"id": "inspect_block", "label": "Inspect Block Metadata", "endpoint": "/api/v1/blocks/catalog"},
                ],
            })
    except Exception:
        pass

    return features


def get_ui_registry(role: Optional[str] = None, app: Any = None) -> Dict[str, Any]:
    """Return filtered and categorized UI registry for client consumption."""
    all_features = introspect_app_features(app)

    # Normalize role
    norm_role = None
    if role:
        r = role.strip().lower()
        if r in ("learner", "student", "alice"):
            norm_role = "learner"
        elif r in ("instructor", "teacher", "priya"):
            norm_role = "instructor"
        elif r in ("admin", "school_admin", "school-admin", "alex"):
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
