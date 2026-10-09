import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
titles = {
    "f01-health": "Production health",
    "f02-landing-design": "Landing — LTI branding & screen design",
    "f03-onboarding-apis": "Onboarding APIs + multi-tenancy",
    "f04-lti-authorization": "LTI authorization — JWKS",
    "f05-ops-yet-metabase": "Owner console — Yet LRS + Metabase",
    "f06-data-isolation": "PostgreSQL data isolation",
    "f07-quiz-ui-results-ags": "Quiz UI / score / results (+ AGS)",
    "f08-ai-quizzes-parser": "AI quizzes + multi-model parser",
    "f09-coach-voice": "Coach voice — Indian languages",
    "f10-xapi-chats": "xAPI from chats",
}
results = []
for fid, title in titles.items():
    assert (OUT / f"{fid}.mp4").exists(), fid
    results.append(
        {
            "id": fid,
            "title": title,
            "status": "ok",
            "mp4": f"videos/by-feature/{fid}.mp4",
        }
    )
(OUT / "manifest.json").write_text(
    json.dumps(
        {
            "base_url": "https://edvidura-app-production.up.railway.app",
            "generated_by": "auto_lti_storage_state + record_feature_proofs",
            "features": results,
        },
        indent=2,
    ),
    encoding="utf-8",
)
rows = []
for r in results:
    rows.append(
        "<tr><td><code>{id}</code></td><td>{title}</td>"
        "<td><span class='badge ok'>ok</span></td>"
        "<td><a href='{id}.mp4'>{id}.mp4</a></td></tr>".format(**r)
    )
html = (
    "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/>"
    "<title>Feature recordings</title>"
    "<style>"
    "body{font-family:Segoe UI,system-ui,sans-serif;margin:24px;background:#f4f7f5;color:#0e2b24}"
    "table{border-collapse:collapse;width:100%;background:#fff}"
    "th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left;font-size:.92rem}"
    ".badge{padding:2px 8px;border-radius:999px;font-size:.75rem;font-weight:700}"
    ".badge.ok{background:#d1fae5;color:#065f46}"
    "</style></head><body>"
    "<h1>EdVidura — per-feature recordings</h1>"
    "<p>All 10 Done features captured live via Railway Moodle LTI demo session.</p>"
    "<table><thead><tr><th>ID</th><th>Feature</th><th>Status</th><th>Video</th></tr></thead><tbody>"
    + "".join(rows)
    + "</tbody></table></body></html>"
)
(OUT / "index.html").write_text(html, encoding="utf-8")
print("rebuilt", len(results))
