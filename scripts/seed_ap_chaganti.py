"""Seed the AP government Chaganti pravachana tenant (not a school).

  ap-chaganti  → segment=government · Telugu-first video library
  Riverside    → untouched (Class 8 school)
  welding-corp → untouched

Demo stream URLs are public sample clips, labelled as placeholders.
Official Chaganti Gari files are used only after a government/trust licence.

  python scripts/apply_migrations.py
  python scripts/seed_ap_chaganti.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import db
from app.modules import manuals as manuals_mod
from app.modules import pravachana, sme
from app.modules.school import create_class, list_classes_with_roster

SLUG = "ap-chaganti"
NAME = "AP Government · Chaganti Pravachanalu"
BUCKET = "https://storage.googleapis.com/gtv-videos-bucket/sample"

# Public-domain / traditional lines — not a transcript of any licensed pravachanam.
EPISODES = [
    {
        "series": "dharma",
        "slug": "dharma-rakshati",
        "title_te": "ధర్మం రక్షించబడినవారిని రక్షిస్తుంది",
        "title_en": "Dharma protects those who protect it",
        "pack": "public",
        "featured": True,
        "clip": "ForBiggerEscapes.mp4",
        "cover": "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80",
        "sa": "धर्मो रक्षति रक्षितः।",
        "te": "ధర్మాన్ని రక్షించేవారిని ధర్మమే రక్షిస్తుంది. నిజాయితీ, కర్తవ్యం, పరుల పట్ల గౌరవం — ఇవి ఇంటి నుండి మొదలవుతాయి.",
        "en": "Dharma protects those who uphold it. Honesty, duty, and respect begin at home.",
    },
    {
        "series": "dharma",
        "slug": "satyam",
        "title_te": "సత్యం కంటే గొప్ప ధర్మం లేదు",
        "title_en": "There is no dharma greater than truth",
        "pack": "public",
        "featured": False,
        "clip": "ForBiggerJoyrides.mp4",
        "cover": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
        "sa": "सत्यात् नास्ति परो धर्मः।",
        "te": "సత్యం మాటల్లోనే కాదు — నడవడికలో కనిపించాలి. పిల్లలు ఇంట్లో చూసినదే నేర్చుకుంటారు.",
        "en": "Truth is not only spoken; it is lived. Children learn what they see at home.",
    },
    {
        "series": "ramayana",
        "slug": "mata-pita",
        "title_te": "తల్లిదండ్రుల పట్ల గౌరవం",
        "title_en": "Respect for parents",
        "pack": "no_bag_day",
        "featured": False,
        "clip": "ForBiggerBlazes.mp4",
        "cover": "https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=1200&q=80",
        "sa": "मातृदेवो भव। पितृदेवो भव।",
        "te": "తల్లి దేవత, తండ్రి దేవత. గౌరవం అనేది పెద్దల మాట వినడం మాత్రమే కాదు — వారి శ్రమను గుర్తించడం.",
        "en": "Honour your mother and father. Respect is seeing their labour, not only obeying words.",
    },
    {
        "series": "ramayana",
        "slug": "guru",
        "title_te": "గురువు పట్ల వినయం",
        "title_en": "Humility toward the teacher",
        "pack": "no_bag_day",
        "featured": False,
        "clip": "ForBiggerMeltdowns.mp4",
        "cover": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
        "sa": "आचार्यदेवो भव।",
        "te": "విద్య వినయాన్ని ఇస్తుంది. గురువును గౌరవించడం అంటే నేర్చుకునే తలుపు తెరవడం.",
        "en": "Learning gives humility. Honouring the teacher is opening the door to knowledge.",
    },
    {
        "series": "values",
        "slug": "parisubhrata",
        "title_te": "పరిశుభ్రత మరియు క్రమశిక్షణ",
        "title_en": "Cleanliness and discipline",
        "pack": "library_hour",
        "featured": False,
        "clip": "SubaruOutbackOnStreetAndDirt.mp4",
        "cover": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
        "sa": "शौचम्।",
        "te": "శుభ్రత శరీరానికి మాత్రమే కాదు — మనసుకు, వీధికి, పాఠశాలకు. క్రమశిక్షణ స్వేచ్ఛను కాపాడుతుంది.",
        "en": "Cleanliness is of body, mind, street, and school. Discipline protects freedom.",
    },
    {
        "series": "values",
        "slug": "prakriti",
        "title_te": "పర్యావరణ పరిరక్షణ",
        "title_en": "Care for the living world",
        "pack": "library_hour",
        "featured": False,
        "clip": "ElephantsDream.mp4",
        "cover": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
        "sa": "वसुधैव कुटुम्बकम्।",
        "te": "భూమి ఒకే కుటుంబం. చెట్టు, నీరు, జంతువు — వీటిని కాపాడితే తరువాతి తరం బ్రతుకుతుంది.",
        "en": "The earth is one family. Protect trees, water, and animals so the next generation can live.",
    },
    {
        "series": "values",
        "slug": "daya",
        "title_te": "దయ మరియు సహానుభూతి",
        "title_en": "Kindness and empathy",
        "pack": "public",
        "featured": False,
        "clip": "ForBiggerFun.mp4",
        "cover": "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80",
        "sa": "अहिंसा परमो धर्मः।",
        "te": "బలహీనుల పట్ల దయే గొప్ప ధర్మం. మాటతో గాయపరచకపోవడం కూడా అహింస.",
        "en": "Kindness to the vulnerable is the highest dharma. Not wounding with words is also non-harm.",
    },
    {
        "series": "dharma",
        "slug": "nitya-abhyasa",
        "title_te": "ఈ రోజు అభ్యాసం",
        "title_en": "Today's practice",
        "pack": "public",
        "featured": False,
        "clip": "ForBiggerEscapes.mp4",
        "cover": "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80",
        "sa": "अभ्यासात् प्राप्यते।",
        "te": "ఒక మంచి అలవాటు రోజూ చిన్నగా. ఈ రోజు ఒక సత్యం మాట, ఒక సహాయం, ఒక కృతజ్ఞత.",
        "en": "A good habit is small and daily. Today: one true word, one help, one thanks.",
    },
]

SERIES = {
    "dharma": {
        "title_te": "ధర్మం",
        "title_en": "Dharma",
        "description_te": "నిజం, కర్తవ్యం, ఇంటి నుండి మొదలయ్యే విలువలు.",
        "description_en": "Truth, duty, and values that begin at home.",
        "scripture": "Dharma",
        "cover": "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1400&q=80",
        "position": 1,
    },
    "ramayana": {
        "title_te": "రామాయణ విలువలు",
        "title_en": "Ramayana values",
        "description_te": "తల్లిదండ్రులు, గురువు, కుటుంబ ధర్మం.",
        "description_en": "Parents, teacher, and family dharma.",
        "scripture": "Ramayana",
        "cover": "https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=1400&q=80",
        "position": 2,
    },
    "values": {
        "title_te": "విలువల విద్య",
        "title_en": "Value education",
        "description_te": "పరిశుభ్రత, పర్యావరణం, దయ — లైబ్రరీ / నో బ్యాగ్ డే ప్యాక్.",
        "description_en": "Cleanliness, nature, kindness — library / No Bag Day pack.",
        "scripture": "Value education",
        "cover": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=80",
        "position": 3,
    },
}


def _ensure_tenant() -> str:
    existing = db.get_tenant_by_slug(SLUG)
    if existing:
        tid = str(existing["id"])
        db.update_tenant_segment(tid, segment="government", reset_capabilities=True)
        print(f"  Updated {SLUG} ({tid[:8]}...) segment=government")
    else:
        row = db.create_tenant(
            slug=SLUG, name=NAME, status="active", segment="government"
        )
        tid = str(row["id"])
        print(f"  Created {SLUG} ({tid[:8]}...)")
    db.update_tenant_prefs(tid, preferred_state="AP", preferred_language="te-IN")
    legacy = db.get_tenant_by_slug("telugu-chaganti")
    if legacy:
        db.update_tenant_segment(
            str(legacy["id"]), segment="government", reset_capabilities=True
        )
        db.update_tenant_prefs(
            str(legacy["id"]), preferred_state="AP", preferred_language="te-IN"
        )
        print("  telugu-chaganti moved to government (no longer a school)")
    return tid


def _ensure_audience(tid: str) -> None:
    existing = list_classes_with_roster(tid)
    for c in existing:
        if str(c.get("class_code") or "") == "AP-CH-01":
            return
    create_class(
        tid,
        class_code="AP-CH-01",
        class_name="AP Pravachanalu · public",
        subject="Pravachanam",
        term="Public",
    )


def _seed_videos(tid: str) -> list[str]:
    series_ids: dict[str, str] = {}
    for slug, meta in SERIES.items():
        row = pravachana.upsert_series(
            tid,
            slug=slug,
            title_te=meta["title_te"],
            title_en=meta["title_en"],
            description_te=meta["description_te"],
            description_en=meta["description_en"],
            scripture=meta["scripture"],
            cover_url=meta["cover"],
            position=meta["position"],
        )
        series_ids[slug] = row["id"]
        print(f"  Series {slug}")

    ids = []
    for i, ep in enumerate(EPISODES, start=1):
        row = pravachana.upsert_episode(
            tid,
            series_id=series_ids[ep["series"]],
            slug=ep["slug"],
            title_te=ep["title_te"],
            title_en=ep["title_en"],
            stream_url=f"{BUCKET}/{ep['clip']}",
            position=i,
            duration_sec=15,
            source="file",
            language="te-IN",
            pack=ep["pack"],
            featured=bool(ep["featured"]),
            cover_url=ep["cover"],
            transcript_sa=ep["sa"],
            transcript_te=ep["te"],
            meaning_en=ep["en"],
            demo=True,
        )
        ids.append(row["id"])
        print(f"  Episode {ep['slug']}")
    return ids


def _seed_meaning_manual(tid: str) -> None:
    body = ["# చాగంటి ప్రవచనాలు — అర్థం (ప్రదర్శన)\n"]
    body.append(
        "_Official pravachana audio/video is used only with a government or "
        "trust licence. The lines below are traditional public-domain verses "
        "with a Telugu meaning for the demo._\n"
    )
    for ep in EPISODES:
        body.append(f"## {ep['title_te']}\n")
        body.append(f"**{ep['sa']}**\n\n{ep['te']}\n\n*{ep['en']}*\n")
    md = "\n".join(body)
    title = "చాగంటి ప్రవచనాలు — అర్థం (ప్రదర్శన)"
    existing = [
        m
        for m in manuals_mod.list_manuals(tid, include_unpublished=True)
        if str(m.get("title") or "") == title
    ]
    if existing:
        mid = str(existing[0]["id"])
        manuals_mod.set_source_language(
            tenant_id=tid, manual_id=mid, source_language="sa-IN"
        )
        pub = manuals_mod.latest_published_version(tid, mid)
        pin = int(pub["version"]) if pub else 1
    else:
        manual = manuals_mod.create_manual(
            tenant_id=tid,
            title=title,
            description="Sanskrit line + Telugu meaning for the government video pack",
            body_md=md,
            subject="pravachanam",
            publish=True,
            source_language="sa-IN",
        )
        mid = str(manual["id"])
        pin = 1
    manuals_mod.upsert_locale(
        tenant_id=tid,
        manual_id=mid,
        language_code="te-IN",
        title=title,
        body_md=md,
    )
    sme.add_manual_source(
        tid, manual_id=mid, pin_version=pin, label="Chaganti meaning (demo)"
    )
    print(f"  Meaning manual + SME {mid[:8]}...")


def _unlink_riverside() -> None:
    from app.tenancy import TENANT_A_ID

    try:
        manuals = manuals_mod.list_manuals(TENANT_A_ID, include_unpublished=True)
    except Exception as exc:  # noqa: BLE001
        print(f"  Riverside skip: {exc}")
        return
    for m in manuals:
        title = str(m.get("title") or "")
        if "chaganti" in title.lower() or "pravachan" in title.lower():
            try:
                manuals_mod.set_manual_classes(
                    TENANT_A_ID, manual_id=m["id"], class_ids=[]
                )
                print("  Unlinked Chaganti manual from Riverside classes")
            except Exception as exc:  # noqa: BLE001
                print(f"  Riverside unlink skip: {exc}")


def main() -> None:
    print("=== AP Chaganti (government, no Moodle, not school) ===")
    tid = _ensure_tenant()
    _ensure_audience(tid)
    _seed_videos(tid)
    _seed_meaning_manual(tid)
    _unlink_riverside()
    key = (os.getenv("ADMIN_API_KEY") or "dev-admin-change-me").strip()
    base = (os.getenv("APP_BASE_URL") or "http://127.0.0.1:8000").rstrip("/")
    if "host.docker.internal" in base:
        base = base.replace("host.docker.internal", "127.0.0.1")
    print()
    print("Done. Local (no Moodle):")
    print(
        f"  Citizen: {base}/dev/client-launch"
        f"?slug={SLUG}&role=student&key={key}"
    )
    print(
        f"  Officer: {base}/dev/client-launch"
        f"?slug={SLUG}&role=teacher&key={key}"
    )


if __name__ == "__main__":
    main()
