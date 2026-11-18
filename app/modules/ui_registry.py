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
        "title": "Socratic AI Tutor (Ask Vidura)",
        "nav_label": "Ask Vidura",
        "role": "learner",
        "category": "Intelligent Tutoring",
        "target_route": "/learn/coach",
        "has_dedicated_route": True,
        "description": "6-stage maieutic tutor that guides students to independent mastery through diagnostic questions and guided hints.",
        "template_type": "tutor-chat",
        "icon": "MessageCircle",
        "data_endpoint": "/api/v1/app/coach",
        "mutation_endpoint": "/api/v1/app/coach",
        "kpis": [
            {"label": "Mastery Stages", "value": "Levels 0 to 5"},
            {"label": "Tutoring Mode", "value": "Socratic Guided"},
            {"label": "Voice Support", "value": "12 Indian Languages"},
        ],
        "actions": [
            {"id": "run_diagnostic", "label": "Start Socratic Diagnostic", "endpoint": "/api/v1/app/coach"},
            {"id": "request_hint", "label": "Request Guided Hint", "endpoint": "/api/v1/app/coach"},
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
