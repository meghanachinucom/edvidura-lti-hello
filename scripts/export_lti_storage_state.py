"""
Open Chromium so you can LTI-launch from Moodle, then save Playwright storage_state.

Usage:
  python scripts/export_lti_storage_state.py
  # Browser opens Moodle. Launch EdVidura from a course.
  # Return to the terminal and press Enter to save storage_state.json

Then:
  set EDVIDURA_PROOF_STORAGE_STATE=docs/management-proof/videos/storage_state.json
  python scripts/record_feature_proofs.py
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "docs" / "management-proof" / "videos" / "storage_state.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--moodle-url",
        default=os.getenv(
            "MOODLE_ISSUER", "https://moodle-production-1516.up.railway.app"
        ),
    )
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise SystemExit(
            "pip install playwright && playwright install chromium"
        ) from exc

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        page.goto(args.moodle_url.rstrip("/") + "/login/index.php")
        print("1) Log into Moodle")
        print("2) Open a course and launch EdVidura")
        print("3) Wait until launch-hub / quiz / coach loads")
        input("Press Enter here to save storage_state … ")
        context.storage_state(path=str(args.out))
        browser.close()
    print(f"Saved {args.out}")
    print(
        "Next:\n"
        f"  set EDVIDURA_PROOF_STORAGE_STATE={args.out}\n"
        "  python scripts/record_feature_proofs.py"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
