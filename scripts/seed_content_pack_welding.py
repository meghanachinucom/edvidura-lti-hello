"""Seed a demo Welding content pack (original teaching text — not AWS copyrighted pubs).

Usage (Postgres up, Riverside exists):
  python scripts/seed_content_pack_welding.py

Safe to re-run: skips if manual title already exists for the tenant.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.modules import adaptive, content, manuals as manuals_mod, skills, sme
from app.modules.school import list_classes_with_roster
from app.tenancy import TENANT_A_ID

PACK_TITLE = "Welding fundamentals (demo pack)"

HANDBOOK = """## Safety first

Wear PPE: helmet, gloves, leather apron, and closed shoes. Keep flammables away from the arc.
Never look at the arc without a filter lens. Report damaged cables before striking an arc.

## Joint types

- **Butt** — edges meet in the same plane.
- **Lap** — plates overlap.
- **Tee** — one plate meets the face of another at 90°.
- **Corner** — outer edges form an L.

Match joint type to load and access before choosing a process.

## SMAW basics (stick)

Shielded Metal Arc Welding uses a consumable electrode with flux.
Set polarity and amperage for the electrode diameter. Strike the arc, keep a short arc length,
and travel at a steady speed so the bead is even without undercut.

## GMAW basics (MIG)

Wire feeds continuously with shielding gas. Good for production on clean steel.
Watch for porosity from poor gas coverage or dirty base metal.

## Inspection cues

Look for: incomplete fusion, undercut, porosity, and cracks.
When in doubt, stop and ask a qualified inspector — do not guess on structural work.

## Practice checklist

1. Set up booth and PPE.
2. Name the joint on the sample.
3. Run a straight bead; cool and inspect.
4. Log defects and retry once.
"""


def main() -> None:
    tid = TENANT_A_ID
    existing = [
        m
        for m in manuals_mod.list_manuals(tid, include_unpublished=True)
        if str(m.get("title") or "") == PACK_TITLE
    ]
    if existing:
        mid = str(existing[0]["id"])
        print(f"Already present: {PACK_TITLE} ({mid[:8]}…)")
        pub = manuals_mod.latest_published_version(tid, mid)
        pin_v = int(pub["version"]) if pub else 1
    else:
        manual = manuals_mod.create_manual(
            tenant_id=tid,
            title=PACK_TITLE,
            body_md=HANDBOOK,
            subject="welding-demo",
            publish=True,
        )
        mid = str(manual["id"])
        pin_v = 1
        print(f"Created manual {mid[:8]}…")

    sme.add_manual_source(
        tid, manual_id=mid, pin_version=pin_v, label=PACK_TITLE
    )
    print(f"SME pinned: {PACK_TITLE} v{pin_v}")

    # Class scope: link only to welding-ish classes (not every class)
    classes = list_classes_with_roster(tid)
    linked = 0
    for c in classes:
        blob = " ".join(
            [
                str(c.get("class_name") or ""),
                str(c.get("class_code") or ""),
                str(c.get("subject") or ""),
            ]
        ).lower()
        if "weld" in blob:
            manuals_mod.link_manual_to_class(
                tid, manual_id=mid, class_id=c["id"]
            )
            linked += 1
            print(f"Linked to class: {c.get('class_name') or c.get('class_code')}")
    if not linked and classes:
        # Demo fallback: first class only (keeps other classes empty)
        manuals_mod.link_manual_to_class(
            tid, manual_id=mid, class_id=classes[0]["id"]
        )
        print(
            f"Linked to first class only: "
            f"{classes[0].get('class_name') or classes[0].get('class_code')}"
        )

    course = content.get_primary_course(tid)
    cid = course["id"] if course else None
    if cid:
        lessons = content.list_lessons(tid, course_id=cid)
        titles = {str(l.get("title") or "") for l in lessons}
        if "Welding · Safety & joints" not in titles:
            content.create_lesson(
                tenant_id=tid,
                course_id=cid,
                title="Welding · Safety & joints",
                body_md=(
                    "## Safety & joints\n\n"
                    "Read the Welding fundamentals handbook sections "
                    "**Safety first** and **Joint types**, then ask Ask Vidura "
                    "one question about PPE or joint choice."
                ),
                lesson_type="article",
            )
            print("Added lesson: Welding · Safety & joints")
        if "Welding · SMAW practice note" not in titles:
            content.create_lesson(
                tenant_id=tid,
                course_id=cid,
                title="Welding · SMAW practice note",
                body_md=(
                    "## SMAW practice\n\n"
                    "Review **SMAW basics** in the handbook. "
                    "List three setup checks before striking an arc."
                ),
                lesson_type="article",
            )
            print("Added lesson: Welding · SMAW practice note")

    # Micro-learning: ensure a skill reel so /learn/micro is demoable
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
        try:
            adaptive.publish_skill_reel(
                tid,
                str(target["id"]),
                video_url=demo_clip,
                caption="Watch · then Practice from Micro-learning",
                course_id=cid,
            )
            print(
                f"Micro reel linked: {target.get('label') or target.get('skill_code')}"
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Micro reel skip: {exc}")

    print("Done. Open Manuals → Welding fundamentals; Ask Vidura cites SME.")


if __name__ == "__main__":
    main()
