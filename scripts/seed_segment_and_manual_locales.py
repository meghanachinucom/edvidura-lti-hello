"""Seed three distinct clients on the same app.

  Riverside (TENANT_A)     → school Class 8 demo (NOT Chaganti) · school caps
  telugu-chaganti (AP)     → Telugu school · Chaganti Sanskrit + te/hi locales
  welding-corp             → corporate · welding video/handbook · no exams

Usage:
  python scripts/apply_migrations.py
  python scripts/seed_segment_and_manual_locales.py

Safe to re-run. Requires Riverside (TENANT_A).
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os

from app import db
from app.modules import adaptive, manuals as manuals_mod, skills, sme
from app.modules.school import create_class, list_classes_with_roster
from app.modules.tenancy import defaults_for_segment, merge_capabilities
from app.tenancy import TENANT_A_ID

CHAGANTI_TITLE = "Chaganti discourse (demo · Sanskrit source)"
WELDING_TITLE = "Welding fundamentals (demo pack)"

CHAGANTI_SLUG = "telugu-chaganti"
CHAGANTI_NAME = "Telugu Chaganti School (AP demo)"

CORP_SLUG = "welding-corp"
CORP_NAME = "Welding Works L&D (corporate demo)"

SANSKRIT_BODY = """## धर्मः

धर्मो रक्षति रक्षितः। सत्यात् नास्ति परो धर्मः।

## ज्ञानम्

विद्या ददाति विनयम्। विनयाद् याति पात्रताम्।

## अभ्यासः

1. पठतु श्लोकम्।
2. अर्थं चिन्तयतु।
3. स्वभाषायां वदतु।
"""

TELUGU_BODY = """## ధర్మం

ధర్మం రక్షించబడినవారిని రక్షిస్తుంది. సత్యం కంటే గొప్ప ధర్మం లేదు.

## జ్ఞానం

విద్య వినయాన్ని ఇస్తుంది. వినయం నుండి అర్హత వస్తుంది.

## అభ్యాసం

1. శ్లోకం చదవండి.
2. అర్థం ఆలోచించండి.
3. మీ భాషలో చెప్పండి.
"""

HINDI_BODY = """## धर्म

धर्म रक्षितों की रक्षा करता है। सत्य से बड़ा कोई धर्म नहीं।

## ज्ञान

विद्या विनय देती है। विनय से पात्रता आती है।

## अभ्यास

1. श्लोक पढ़ें।
2. अर्थ सोचें।
3. अपनी भाषा में बोलें।
"""


def _ensure_tenant_school(
    *,
    slug: str,
    name: str,
    preferred_state: str,
    preferred_language: str,
) -> str:
    existing = db.get_tenant_by_slug(slug)
    if existing:
        tid = str(existing["id"])
        db.update_tenant_segment(tid, segment="school", reset_capabilities=True)
        print(f"  Updated school {slug} ({tid[:8]}...)")
    else:
        row = db.create_tenant(
            slug=slug, name=name, status="active", segment="school"
        )
        tid = str(row["id"])
        print(f"  Created school {slug} ({tid[:8]}...)")
    db.update_tenant_prefs(
        tid,
        preferred_state=preferred_state,
        preferred_language=preferred_language,
    )
    print(
        f"  segment=school state={preferred_state or '-'} "
        f"lang={preferred_language or '-'}"
    )
    return tid


def _ensure_chaganti_manual(tid: str) -> tuple[str, int]:
    existing = [
        m
        for m in manuals_mod.list_manuals(tid, include_unpublished=True)
        if str(m.get("title") or "") == CHAGANTI_TITLE
    ]
    if existing:
        mid = str(existing[0]["id"])
        manuals_mod.set_source_language(
            tenant_id=tid, manual_id=mid, source_language="sa-IN"
        )
        pub = manuals_mod.latest_published_version(tid, mid)
        return mid, int(pub["version"]) if pub else 1

    manual = manuals_mod.create_manual(
        tenant_id=tid,
        title=CHAGANTI_TITLE,
        description="Telugu school discourse — Sanskrit source, state languages",
        body_md=SANSKRIT_BODY,
        subject="chaganti-telugu-school",
        publish=True,
        source_language="sa-IN",
    )
    return str(manual["id"]), 1


def _seed_chaganti_locales(tid: str, mid: str) -> None:
    for code, title, body in (
        ("te-IN", "చాగంటి ప్రవచనం (డెమో)", TELUGU_BODY),
        ("hi-IN", "चागंति प्रवचन (डेमो)", HINDI_BODY),
    ):
        manuals_mod.upsert_locale(
            tenant_id=tid,
            manual_id=mid,
            language_code=code,
            title=title,
            body_md=body,
            publish=True,
            is_auto=False,
        )
        print(f"  Locale ready: {code}")


def _ensure_client_class(
    tid: str, *, code: str, name: str, subject: str
) -> dict:
    for c in list_classes_with_roster(tid):
        if str(c.get("class_code") or "") == code:
            return c
    return create_class(
        tid,
        class_code=code,
        class_name=name,
        subject=subject,
        term="Demo",
    )


def _link_manual_to_class(tid: str, mid: str, class_id: str, label: str) -> None:
    manuals_mod.link_manual_to_class(
        tid, manual_id=mid, class_id=class_id
    )
    print(f"  Linked manual to class: {label}")


def _seed_riverside_only() -> None:
    """Riverside stays the Class 8 / general school demo — no Chaganti pack."""
    print("=== Riverside (Class 8 school - not Chaganti) ===")
    row = db.get_tenant(TENANT_A_ID)
    if not row:
        raise SystemExit(
            "TENANT_A missing — run Riverside/school seed first"
        )
    db.update_tenant_segment(
        TENANT_A_ID, segment="school", reset_capabilities=True
    )
    # Neutral prefs — Riverside is English Class 8 path, not AP discourse.
    db.update_tenant_prefs(
        TENANT_A_ID, preferred_state="", preferred_language="en-IN"
    )
    print(
        f"  slug={row.get('slug')} school en-IN "
        "(Class 8 content; no Chaganti)"
    )

    # If an older seed attached Chaganti to Riverside, leave the row but warn.
    chaganti_on_riverside = [
        m
        for m in manuals_mod.list_manuals(TENANT_A_ID, include_unpublished=True)
        if str(m.get("title") or "") == CHAGANTI_TITLE
    ]
    if chaganti_on_riverside:
        print(
            "  Note: Chaganti manual still on Riverside from an older seed; "
            f"canonical Telugu school is `{CHAGANTI_SLUG}`"
        )


def _seed_telugu_chaganti_school() -> str:
    print("=== Telugu Chaganti school (AP) ===")
    tid = _ensure_tenant_school(
        slug=CHAGANTI_SLUG,
        name=CHAGANTI_NAME,
        preferred_state="AP",
        preferred_language="te-IN",
    )
    mid, pin_v = _ensure_chaganti_manual(tid)
    print(f"  Manual {mid[:8]}... source=sa-IN")
    _seed_chaganti_locales(tid, mid)
    try:
        sme.add_manual_source(
            tid, manual_id=mid, pin_version=pin_v, label=CHAGANTI_TITLE
        )
        print(f"  SME pinned v{pin_v}")
    except Exception as exc:  # noqa: BLE001
        print(f"  SME skip: {exc}")
    klass = _ensure_client_class(
        tid,
        code="TCG-AP-01",
        name="Telugu Discourse AP",
        subject="Discourse",
    )
    _link_manual_to_class(
        tid, mid, str(klass["id"]), klass.get("class_name") or "TCG-AP-01"
    )
    return tid


def _seed_corporate_welding() -> str:
    print("=== Corporate welding (not school, not Chaganti) ===")
    caps = merge_capabilities(
        "corporate",
        {
            **defaults_for_segment("corporate"),
            "manuals": True,
            "video_library": True,
            "ask_vidura": True,
            "quiz_graded": False,
            "quiz_practice": False,
            "lessons": False,
            "ghost_coach_gate": False,
        },
    )
    existing = db.get_tenant_by_slug(CORP_SLUG)
    if existing:
        tid = str(existing["id"])
        db.update_tenant_segment(
            tid,
            segment="corporate",
            capabilities=caps,
            reset_capabilities=False,
        )
        print(f"  Updated {CORP_SLUG} ({tid[:8]}...)")
    else:
        row = db.create_tenant(
            slug=CORP_SLUG,
            name=CORP_NAME,
            status="active",
            segment="corporate",
            capabilities=caps,
        )
        tid = str(row["id"])
        print(f"  Created {CORP_SLUG} ({tid[:8]}...)")

    # Soft-migrate mistaken earlier demos
    for legacy_slug in ("chaganti-demo", "chennai-vidya"):
        legacy = db.get_tenant_by_slug(legacy_slug)
        if legacy and str(legacy["id"]) != tid:
            print(
                f"  Note: leftover tenant `{legacy_slug}` - "
                f"use `{CHAGANTI_SLUG}` for Chaganti, `{CORP_SLUG}` for weld"
            )

    db.update_tenant_prefs(tid, preferred_state="", preferred_language="en-IN")

    existing_m = [
        m
        for m in manuals_mod.list_manuals(tid, include_unpublished=True)
        if str(m.get("title") or "") == WELDING_TITLE
    ]
    if existing_m:
        mid = str(existing_m[0]["id"])
        print(f"  Welding manual exists ({mid[:8]}...)")
    else:
        try:
            from scripts.seed_content_pack_welding import HANDBOOK
        except Exception:
            HANDBOOK = (
                "## Safety first\n\nWear PPE. Keep flammables away from the arc.\n"
            )
        manual = manuals_mod.create_manual(
            tenant_id=tid,
            title=WELDING_TITLE,
            description="Corporate welding L&D handbook (demo)",
            body_md=HANDBOOK,
            subject="welding-corp",
            publish=True,
            source_language="en-IN",
        )
        mid = str(manual["id"])
        print(f"  Created welding manual {mid[:8]}...")

    try:
        sme.add_manual_source(
            tid, manual_id=mid, pin_version=1, label=WELDING_TITLE
        )
    except Exception as exc:  # noqa: BLE001
        print(f"  SME skip: {exc}")

    try:
        skill_rows = skills.ensure_default_skills(tid)
        target = next(
            (
                s
                for s in skill_rows
                if "weld" in str(s.get("skill_code") or "").lower()
                or "ppe" in str(s.get("skill_code") or "").lower()
                or "safety" in str(s.get("label") or "").lower()
            ),
            skill_rows[0] if skill_rows else None,
        )
        if target:
            demo_clip = (
                "https://storage.googleapis.com/gtv-videos-bucket/sample/"
                "ForBiggerEscapes.mp4"
            )
            adaptive.publish_skill_reel(
                tid,
                str(target["id"]),
                video_url=demo_clip,
                caption="Welding demo reel - corporate library",
            )
            print(
                f"  Micro reel: {target.get('label') or target.get('skill_code')}"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"  Micro reel skip: {exc}")

    klass = _ensure_client_class(
        tid,
        code="WELD-LD-01",
        name="Welding L&D cohort",
        subject="Welding",
    )
    _link_manual_to_class(
        tid, mid, str(klass["id"]), klass.get("class_name") or "WELD-LD-01"
    )
    return tid


def main() -> None:
    print("Seeding three clients: Riverside / Chaganti / welding...")
    _seed_riverside_only()
    ch_id = _seed_telugu_chaganti_school()
    corp_id = _seed_corporate_welding()
    key = (os.getenv("ADMIN_API_KEY") or "dev-admin-change-me").strip()
    base = (os.getenv("APP_BASE_URL") or "http://127.0.0.1:8000").rstrip("/")
    if "host.docker.internal" in base:
        base = base.replace("host.docker.internal", "127.0.0.1")
    print()
    print("Done.")
    print("  Riverside          -> Class 8 school demo (existing content)")
    print(
        f"  {CHAGANTI_SLUG} ({ch_id[:8]}...) -> Telugu school Chaganti sa->te-IN"
    )
    print(
        f"  {CORP_SLUG} ({corp_id[:8]}...)     -> corporate welding, no exams"
    )
    print()
    print("No Moodle needed (local admin launch):")
    print(
        f"  Chaganti student: {base}/dev/client-launch"
        f"?slug={CHAGANTI_SLUG}&role=student&key={key}"
    )
    print(
        f"  Welding student:  {base}/dev/client-launch"
        f"?slug={CORP_SLUG}&role=student&key={key}"
    )
    print(
        f"  (teacher: add &role=teacher)"
    )


if __name__ == "__main__":
    main()
