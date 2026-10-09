"""
Non-interactive: log into Railway Moodle, launch EdVidura LTI, save Playwright storage_state.

Default demo users (from seed_presentation_railway.py):
  riverside_alice / Demo@12345  (student)
  riverside_priya / Demo@12345  (teacher)
  admin / Admin@12345           (Moodle admin)
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "docs" / "management-proof" / "videos" / "storage_state.json"

MOODLE = os.getenv(
    "MOODLE_ISSUER", "https://moodle-production-1516.up.railway.app"
).rstrip("/")
APP = os.getenv(
    "APP_BASE_URL", "https://edvidura-app-production.up.railway.app"
).rstrip("/")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", default=os.getenv("MOODLE_DEMO_USER", "riverside_alice"))
    parser.add_argument("--password", default=os.getenv("MOODLE_DEMO_PASSWORD", "Demo@12345"))
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--moodle-url", default=MOODLE)
    parser.add_argument("--app-url", default=APP)
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise SystemExit("pip install playwright && playwright install chromium") from exc

    moodle = args.moodle_url.rstrip("/")
    app = args.app_url.rstrip("/")
    args.out.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        print(f"login {args.user} @ {moodle}", flush=True)
        page.goto(f"{moodle}/login/index.php", wait_until="domcontentloaded", timeout=90000)
        page.fill("#username", args.user)
        page.fill("#password", args.password)
        page.click("#loginbtn")
        page.wait_for_load_state("domcontentloaded")
        page.wait_for_timeout(1500)

        if "login" in page.url and page.locator("#loginerrormessage, .loginerrors").count():
            print("LOGIN FAILED", page.url, file=sys.stderr)
            browser.close()
            return 2

        print(f"logged in → {page.url}", flush=True)

        # Prefer My courses / dashboard
        for path in ("/my/courses.php", "/my/", "/"):
            try:
                page.goto(moodle + path, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(1000)
                break
            except Exception:
                continue

        # Find a course link that looks like Algebra / Class / Riverside
        course_href = None
        links = page.locator("a[href*='/course/view.php']").all()
        for a in links:
            try:
                href = a.get_attribute("href") or ""
                text = (a.inner_text() or "").strip().lower()
                if not href:
                    continue
                if any(k in text for k in ("algebra", "class 8", "riverside", "edvidura")) or "id=" in href:
                    course_href = href
                    if any(k in text for k in ("algebra", "class 8")):
                        break
            except Exception:
                continue

        if not course_href:
            # Fallback: scrape HTML for course view links
            html = page.content()
            m = re.search(r'href="([^"]*/course/view\.php\?id=\d+)"', html)
            if m:
                course_href = m.group(1)

        if not course_href:
            print("No course link found — saving Moodle-only state", file=sys.stderr)
            context.storage_state(path=str(args.out))
            browser.close()
            return 3

        if course_href.startswith("/"):
            course_href = moodle + course_href
        print(f"open course {course_href}", flush=True)
        page.goto(course_href, wait_until="domcontentloaded", timeout=90000)
        page.wait_for_timeout(1500)

        # Find EdVidura / LTI activity
        launch = None
        for sel in (
            "a:has-text('EdVidura')",
            "a:has-text('Open EdVidura')",
            "a:has-text('edvidura')",
            "a[href*='/mod/lti/view.php']",
            ".activityinstance a",
        ):
            loc = page.locator(sel)
            if loc.count():
                try:
                    launch = loc.first
                    break
                except Exception:
                    continue

        if launch is None:
            print("No LTI/EdVidura activity on course page", file=sys.stderr)
            print(page.content()[:2000], file=sys.stderr)
            context.storage_state(path=str(args.out))
            browser.close()
            return 4

        print("click LTI activity…", flush=True)
        with context.expect_page(timeout=120000) as popup_info:
            try:
                launch.click(timeout=15000)
            except Exception:
                # same-tab navigation
                pass

        # Prefer popup if opened; else current page after redirects
        try:
            tool = popup_info.value
            tool.wait_for_load_state("domcontentloaded", timeout=120000)
            target = tool
        except Exception:
            page.wait_for_timeout(3000)
            target = page

        # Follow redirects until we land on app
        deadline = time.time() + 90
        while time.time() < deadline:
            url = target.url
            print(f"  at {url}", flush=True)
            if app in url and "/lti/" not in url:
                break
            if "launch-hub" in url or "/quiz" in url or "/learn/" in url:
                break
            target.wait_for_timeout(1500)
            # click through intermediate confirm if present
            for btn in ("button:has-text('Continue')", "input[type=submit]", "button[type=submit]"):
                if target.locator(btn).count():
                    try:
                        target.locator(btn).first.click(timeout=2000)
                    except Exception:
                        pass
            try:
                target.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass

        print(f"session page: {target.url}", flush=True)
        # Touch a few app routes so cookies stick
        for path in ("/launch-hub", "/quiz", "/learn/coach"):
            try:
                target.goto(app + path, wait_until="domcontentloaded", timeout=45000)
                target.wait_for_timeout(800)
                print(f"  probe {path} → {target.url}", flush=True)
            except Exception as exc:
                print(f"  probe {path} failed: {exc}", flush=True)

        context.storage_state(path=str(args.out))
        browser.close()

    print(f"Saved {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
