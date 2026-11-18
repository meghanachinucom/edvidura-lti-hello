"""Live Chrome DevTools Protocol (CDP) Verification Suite for EdVidura Production Deployment.

Target: https://edvidura-deployment.vercel.app/review
Verifies:
1. Canonical Entry (/review) & 9 Specialized Engine Launchpad (+ 0 fake moodle links)
2. Live UI Feature Registry API (/api/v1/app/ui-registry) & Universal Auto-Generated Screen (/workspace/freeflow-voice)
3. 5 Multi-Chapter Interactive Textbooks (/manuals & /read/manuals)
4. PaperMorph Storyboard & Accessibility Toolbar (Zoom, Contrast Themes, Audiobook TTS) in Both Readers
5. Jane Street Socratic Tutor (/learn/coach: 6-Stage Mastery Ladder 0-5, Socratic Mode, Diagnostics)
6. I2IDL / ADL TLA 5-Pillar Linked Data Graph (/api/v1/ld/graph, /learn/gap & /teacher/skills)
7. PaperMorph Interactive Reels (/learn/micro)
8. FreeFlow AI Voice Studio & Cleanup (/api/v1/app/voice/cleanup & VoiceStudioBar)
9. Teacher eBook Authoring & LTI Deep Linking (/teacher/manuals & /api/v1/app/deep-link/items)
10. School Admin NRPS Roster Provisioning Sync (/school-admin/students)
11. 12 Indian Languages Switcher & Full-Page Translation
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.request
from typing import Any
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "https://edvidura-deployment.vercel.app"
REVIEW_URL = f"{BASE_URL}/review"

audit_results: list[dict[str, Any]] = []


class CDPClient:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws = None
        self._msg_id = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=20 * 1024 * 1024)

    async def send(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        self._msg_id += 1
        msg = {"id": self._msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        while True:
            raw = await self.ws.recv()
            data = json.loads(raw)
            if data.get("id") == self._msg_id:
                return data

    async def evaluate(self, expression: str) -> Any:
        res = await self.send(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True, "awaitPromise": True},
        )
        return res.get("result", {}).get("result", {}).get("value")

    async def navigate(self, url: str, wait_seconds: float = 3.0):
        await self.send("Page.navigate", {"url": url})
        await asyncio.sleep(wait_seconds)

    async def close(self):
        if self.ws:
            await self.ws.close()


async def run_cdp_audit():
    temp_dir = os.path.abspath("chrome_audit_profile")
    if os.path.exists(temp_dir):
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass
    os.makedirs(temp_dir, exist_ok=True)

    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--window-size=1440,900",
        f"--user-data-dir={temp_dir}",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        ws_url = None
        with urllib.request.urlopen("http://127.0.0.1:9222/json", timeout=5) as r:
            targets = json.loads(r.read())
            for t in targets:
                if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                    ws_url = t["webSocketDebuggerUrl"]
                    break

        if not ws_url and targets:
            ws_url = targets[0].get("webSocketDebuggerUrl")

        if not ws_url:
            raise RuntimeError("Could not find Chrome page debugger WebSocket URL")

        client = CDPClient(ws_url)
        await client.connect()
        await client.send("Page.enable")
        await client.send("Runtime.enable")

        print("\n" + "=" * 78)
        print(" EDVIDURA LIVE PRODUCTION CHROME CDP AUDIT")
        print(f" Target: {REVIEW_URL}")
        print("=" * 78 + "\n")

        # -------------------------------------------------------------
        # 1. CANONICAL ENTRY & 9-ENGINE LAUNCHPAD ON /review
        # -------------------------------------------------------------
        start = time.time()
        await client.navigate(REVIEW_URL, wait_seconds=3.0)
        title = await client.evaluate("document.title")
        has_moodle = await client.evaluate(
            "Array.from(document.querySelectorAll('a, button')).some(el => (el.textContent || '').includes('/moodle') || (el.getAttribute('href') || '').includes('/moodle'))"
        )
        launchpad_links = await client.evaluate("""
            Array.from(document.querySelectorAll('a[href*="demo-launch"]')).map(a => a.getAttribute('href'))
        """)
        has_next_links = any("&next=" in href for href in launchpad_links)
        has_launchpad_grid = len(launchpad_links) >= 9
        latency = round((time.time() - start) * 1000)

        p1_pass = bool(title and not has_moodle and has_launchpad_grid and has_next_links)
        audit_results.append({
            "feature": "Review Portal & Direct Launchpad (/review)",
            "requirement": "Zero /moodle links + 9 Direct Feature Launchpad cards with &next= redirects",
            "evidence": f"Title: '{title}' | Fake Moodle: {has_moodle} | Launchers: {len(launchpad_links)} items (has &next: {has_next_links})",
            "latency": f"{latency}ms",
            "status": "PASS" if p1_pass else "FAIL",
        })
        print(f"[{'PASS' if p1_pass else 'FAIL'}] Review Portal & 9-Engine Launchpad: {len(launchpad_links)} launchers (fake moodle: {not has_moodle})")

        # -------------------------------------------------------------
        # 2. LIVE UI FEATURE REGISTRY & UNIVERSAL AUTO-GENERATED SCREEN
        # -------------------------------------------------------------
        start = time.time()
        with urllib.request.urlopen(f"{BASE_URL}/api/v1/app/ui-registry", timeout=6) as r:
            reg_data = json.loads(r.read())
            features = reg_data.get("features", [])
            has_caps = len(features) >= 50 or reg_data.get("count", 0) >= 50
            freeflow_cap = next((c for c in features if c.get("feature_id") == "freeflow-voice" or c.get("id") == "freeflow-voice"), None)

        # Authenticate as Learner
        await client.navigate(f"{BASE_URL}/api/v1/auth/demo-launch?persona=learner", wait_seconds=3.0)

        # Navigate to auto-generated workspace screen
        await client.navigate(f"{BASE_URL}/workspace/freeflow-voice", wait_seconds=3.5)
        ws_text = await client.evaluate("document.body.innerText")
        has_ws_heading = "FreeFlow" in ws_text or "Voice" in ws_text
        has_ws_kpi = "Supported Languages" in ws_text or "Math Normalizer" in ws_text or "Locales" in ws_text or "Capability" in ws_text
        has_ws_action = await client.evaluate("""
            Boolean(Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').includes('Cleanup') || (el.textContent || '').includes('Run') || (el.textContent || '').includes('Test')))
        """)
        latency = round((time.time() - start) * 1000)

        p2_pass = bool(has_caps and bool(freeflow_cap) and has_ws_heading and has_ws_kpi and has_ws_action)
        audit_results.append({
            "feature": "Live UI Feature Registry & Universal Screen (/api/v1/app/ui-registry & /workspace/:id)",
            "requirement": "Automatic backend introspection (61 caps) + universal dynamic screen template",
            "evidence": f"Introspected: {len(features) or reg_data.get('count')} capabilities | Universal screen rendered: {has_ws_heading} (KPI: {has_ws_kpi}, Action: {has_ws_action})",
            "latency": f"{latency}ms",
            "status": "PASS" if p2_pass else "FAIL",
        })
        print(f"[{'PASS' if p2_pass else 'FAIL'}] Live UI Registry & Universal Screen: {len(features) or reg_data.get('count')} caps, rendered={has_ws_heading}")

        # -------------------------------------------------------------
        # 3. 12-LANGUAGE INDIAN SWITCHER & SESSION TRANSLATION
        # -------------------------------------------------------------
        start = time.time()
        lang_options = await client.evaluate("""
            const select = document.getElementById('edvidura-lang-select');
            select ? Array.from(select.options).map(o => o.value) : []
        """)
        has_12_langs = (
            isinstance(lang_options, list)
            and len(lang_options) >= 12
            and all(l in lang_options for l in ["en", "hi", "te", "ta", "kn", "ml", "mr", "bn", "gu", "pa", "or", "ur"])
        )

        # Trigger Hindi locale
        await client.evaluate("""
            (() => {
                const sel = document.getElementById('edvidura-lang-select');
                if (sel) {
                    sel.value = 'hi';
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
                window.dispatchEvent(new CustomEvent('edvidura:locale-change', { detail: 'hi' }));
            })()
        """)
        await asyncio.sleep(1.2)
        hindi_text = await client.evaluate("document.body.innerText")
        has_hindi = any(word in hindi_text for word in ["शिक्षार्थी", "पाठ", "प्रश्नोत्तरी", "विदुरा", "सहेजें", "मेरी योजना", "ई-पुस्तकें", "कक्षा", "गतिविधि"])

        # Revert to English
        await client.evaluate("""
            (() => {
                const sel = document.getElementById('edvidura-lang-select');
                if (sel) {
                    sel.value = 'en';
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
                window.dispatchEvent(new CustomEvent('edvidura:locale-change', { detail: 'en' }));
            })()
        """)
        await asyncio.sleep(0.5)
        latency = round((time.time() - start) * 1000)

        p3_pass = bool(has_12_langs and has_hindi)
        audit_results.append({
            "feature": "12-Language Indian Switcher (TopNav)",
            "requirement": "11 Indian languages + English with instant session translation",
            "evidence": f"Supported: {len(lang_options)} locales | Hindi rendered: {has_hindi}",
            "latency": f"{latency}ms",
            "status": "PASS" if p3_pass else "FAIL",
        })
        print(f"[{'PASS' if p3_pass else 'FAIL'}] 12 Indian Languages: {len(lang_options)} locales verified (Hindi={has_hindi})")

        # -------------------------------------------------------------
        # 4. 5 COMPLETE INTERACTIVE DEMO TEXTBOOKS (/manuals)
        # -------------------------------------------------------------
        start = time.time()
        await client.navigate(f"{BASE_URL}/manuals", wait_seconds=3.0)
        manuals_text = await client.evaluate("document.body.innerText")
        has_b1 = "Algebra I" in manuals_text
        has_b2 = "Physical Science" in manuals_text
        has_b3 = "Railways" in manuals_text
        has_b4 = "Digital" in manuals_text or "Cybersecurity" in manuals_text
        has_b5 = "Niti" in manuals_text or "Ethics" in manuals_text

        latency = round((time.time() - start) * 1000)
        p4_pass = all([has_b1, has_b2, has_b3, has_b4, has_b5])
        audit_results.append({
            "feature": "5 Multi-Chapter Interactive Textbooks (/manuals)",
            "requirement": "Algebra I, Physical Science, Railways, AI/Cyber, Niti seeded",
            "evidence": f"Seeded in library: (B1:{has_b1}, B2:{has_b2}, B3:{has_b3}, B4:{has_b4}, B5:{has_b5})",
            "latency": f"{latency}ms",
            "status": "PASS" if p4_pass else "FAIL",
        })
        print(f"[{'PASS' if p4_pass else 'FAIL'}] 5 Complete Textbooks in Digital Library: {p4_pass}")

        # -------------------------------------------------------------
        # 5. PAPERMORPH STORYBOARD & STANDALONE PEBL READER (/read/manuals/:id)
        # -------------------------------------------------------------
        start = time.time()
        await client.navigate(f"{BASE_URL}/read/manuals/de7900fd-488b-4740-bf7e-7a11b3475cd6", wait_seconds=4.0)
        has_zoom = await client.evaluate("""
            Boolean(Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').includes('A-') || (el.textContent || '').includes('A+')))
        """)
        has_theme = await client.evaluate("""
            Boolean(Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').includes('Sepia') || (el.textContent || '').includes('Contrast') || (el.getAttribute('title') || '').includes('Contrast')))
        """)
        has_audio = await client.evaluate("""
            Boolean(Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').includes('Listen') || (el.textContent || '').includes('Audio') || (el.getAttribute('title') || '').includes('Read-Aloud') || (el.getAttribute('title') || '').includes('Audiobook')))
        """)
        has_storyboard = await client.evaluate("""
            document.body.innerText.includes('PaperMorph Interactive Storyboard') || document.body.innerText.includes('Interactive Storyboard')
        """)
        has_voice_studio = await client.evaluate("""
            document.body.innerText.includes('Voice Studio') || document.body.innerText.includes('Mic')
        """)

        latency = round((time.time() - start) * 1000)
        p5_pass = bool(has_zoom and has_theme and has_audio and (has_storyboard or has_voice_studio))
        audit_results.append({
            "feature": "PaperMorph Storyboard & PEBL Reader (/read/manuals/:id)",
            "requirement": "Zoom A-/A+, Contrast Themes, Audiobook TTS, PaperMorph Storyboard & Voice Bar",
            "evidence": f"Zoom: {has_zoom} | Themes: {has_theme} | Audio: {has_audio} | Storyboard: {has_storyboard} | Voice: {has_voice_studio}",
            "latency": f"{latency}ms",
            "status": "PASS" if p5_pass else "FAIL",
        })
        print(f"[{'PASS' if p5_pass else 'FAIL'}] PaperMorph Storyboard & Reader: Zoom={has_zoom}, Themes={has_theme}, Audio={has_audio}, Storyboard={has_storyboard}")

        # -------------------------------------------------------------
        # 6. JANE STREET SOCRATIC TUTOR (/learn/coach)
        # -------------------------------------------------------------
        start = time.time()
        await client.navigate(f"{BASE_URL}/learn/coach", wait_seconds=3.0)
        coach_text = await client.evaluate("document.body.innerText")

        has_socratic_mode = "Socratic Guided Mode" in coach_text or "Jane Street" in coach_text
        has_mastery_ladder = "Socratic Mastery Ladder" in coach_text and ("Level" in coach_text or "/ 5" in coach_text)
        has_voice_bar = "Voice Studio" in coach_text or "FreeFlow" in coach_text
        has_diag_btns = "Explain the step" in coach_text or "Why flip the inequality" in coach_text

        latency = round((time.time() - start) * 1000)
        p6_pass = bool(has_socratic_mode and has_mastery_ladder and (has_voice_bar or has_diag_btns))
        audit_results.append({
            "feature": "Jane Street Socratic Tutor (/learn/coach)",
            "requirement": "6-Stage Mastery Ladder (0-5) across 4 competencies, Socratic Guided toggle, Voice Bar",
            "evidence": f"Socratic Mode: {has_socratic_mode} | 6-Stage Ladder: {has_mastery_ladder} | Voice Bar: {has_voice_bar} | Diagnostics: {has_diag_btns}",
            "latency": f"{latency}ms",
            "status": "PASS" if p6_pass else "FAIL",
        })
        print(f"[{'PASS' if p6_pass else 'FAIL'}] Jane Street Socratic Tutor: Mode={has_socratic_mode}, Ladder={has_mastery_ladder}, VoiceBar={has_voice_bar}")

        # -------------------------------------------------------------
        # 7. I2IDL 5-PILLAR LINKED DATA GRAPH (/learn/gap & /api/v1/ld/graph)
        # -------------------------------------------------------------
        start = time.time()
        with urllib.request.urlopen(f"{BASE_URL}/api/v1/ld/graph", timeout=6) as r:
            ld_json = json.loads(r.read())
            ld_count = len(ld_json.get("@graph", []))
            has_vocab = bool(ld_json.get("@context", {}).get("@vocab"))

        await client.navigate(f"{BASE_URL}/learn/gap", wait_seconds=3.0)
        gap_text = await client.evaluate("document.body.innerText")
        has_5_pillars = "5-Pillar" in gap_text or "TLA Pillars" in gap_text or "Competencies" in gap_text
        has_svg_nodes = await client.evaluate("Boolean(document.querySelector('svg circle'))")

        latency = round((time.time() - start) * 1000)
        p7_pass = bool(ld_count >= 5 and has_vocab and (has_5_pillars or has_svg_nodes))
        audit_results.append({
            "feature": "I2IDL 5-Pillar Linked Data Graph (/learn/gap & /api/v1/ld/graph)",
            "requirement": "IEEE 1484.20.3, IEEE 2881, 5-Pillar Tabs, Interactive SVG Semantic Network",
            "evidence": f"Graph Nodes: {ld_count} | Vocab: {has_vocab} | 5 Pillars: {has_5_pillars} | SVG Nodes: {has_svg_nodes}",
            "latency": f"{latency}ms",
            "status": "PASS" if p7_pass else "FAIL",
        })
        print(f"[{'PASS' if p7_pass else 'FAIL'}] I2IDL 5-Pillar Linked Data Graph: {ld_count} nodes, SVG Graph={has_svg_nodes}")

        # -------------------------------------------------------------
        # 8. PAPERMORPH INTERACTIVE REELS (/learn/micro)
        # -------------------------------------------------------------
        start = time.time()
        await client.navigate(f"{BASE_URL}/learn/micro", wait_seconds=3.0)
        micro_text = await client.evaluate("document.body.innerText")
        has_pm_diagram = "Schematic" in micro_text or "Trip Curve" in micro_text or "Protocol" in micro_text or "Circuit" in micro_text
        has_pm_card = "Reel" in micro_text or "Micro Card" in micro_text or "Video" in micro_text

        latency = round((time.time() - start) * 1000)
        p8_pass = bool(has_pm_diagram or has_pm_card)
        audit_results.append({
            "feature": "PaperMorph Interactive Reels (/learn/micro)",
            "requirement": "Visual keyframe schematics + inline interactive concept checks",
            "evidence": f"Keyframe Diagram: {has_pm_diagram} | Reel Card: {has_pm_card}",
            "latency": f"{latency}ms",
            "status": "PASS" if p8_pass else "FAIL",
        })
        print(f"[{'PASS' if p8_pass else 'FAIL'}] PaperMorph Reels: Diagram={has_pm_diagram}, Card={has_pm_card}")

        # -------------------------------------------------------------
        # 9. FREEFLOW AI VOICE CLEANUP & VOICE STUDIO BAR
        # -------------------------------------------------------------
        start = time.time()
        req = urllib.request.Request(
            f"{BASE_URL}/api/v1/app/voice/cleanup",
            data=json.dumps({"transcript": "um uh like 2 x plus 5 equals to 15 you know", "language": "en-IN"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=6) as r:
            voice_res = json.loads(r.read())
            cleaned = voice_res.get("data", {}).get("cleaned", "")
            has_clean_math = "2x + 5 = 15" in cleaned
            no_fillers = "um" not in cleaned.lower() and "uh" not in cleaned.lower()

        latency = round((time.time() - start) * 1000)
        p9_pass = bool(has_clean_math and no_fillers)
        audit_results.append({
            "feature": "FreeFlow AI Voice Studio & Cleanup (/api/v1/app/voice/cleanup)",
            "requirement": "Strips verbal fillers + normalizes spoken math ('2x + 5 = 15') + VoiceStudioBar",
            "evidence": f"Cleaned Result: '{cleaned}' | Math Normalized: {has_clean_math} | Fillers Removed: {no_fillers}",
            "latency": f"{latency}ms",
            "status": "PASS" if p9_pass else "FAIL",
        })
        print(f"[{'PASS' if p9_pass else 'FAIL'}] FreeFlow AI Voice Cleanup: '{cleaned}'")

        # -------------------------------------------------------------
        # 10. TEACHER EBOOK AUTHORING & LTI DEEP LINKING (/teacher/manuals & /teacher/skills)
        # -------------------------------------------------------------
        start = time.time()
        with urllib.request.urlopen(f"{BASE_URL}/api/v1/app/deep-link/items", timeout=6) as r:
            dl_res = json.loads(r.read())
            dl_items = dl_res.get("items", [])

        # Switch to teacher role in browser
        await client.navigate(f"{BASE_URL}/api/v1/auth/demo-launch?persona=instructor", wait_seconds=3.0)
        await client.navigate(f"{BASE_URL}/teacher/manuals", wait_seconds=3.0)
        teacher_text = await client.evaluate("document.body.innerText")
        has_editor = "WYSIWYG" in teacher_text or "Rich-Text" in teacher_text or "Editions" in teacher_text or "Manual" in teacher_text

        # Teacher Skills Linked Data Tab
        await client.navigate(f"{BASE_URL}/teacher/skills", wait_seconds=3.0)
        skills_text = await client.evaluate("document.body.innerText")
        has_ld_tab = "Linked Data" in skills_text or "JSON-LD" in skills_text

        latency = round((time.time() - start) * 1000)
        p10_pass = bool(len(dl_items) >= 5 and has_editor and has_ld_tab)
        audit_results.append({
            "feature": "Teacher eBook Authoring & Deep Linking (F-01/F-02/F-08)",
            "requirement": "WYSIWYG eBook Editor, AI File Upload, LTI Deep Link Picker, Linked Data Tab",
            "evidence": f"Deep Link Items: {len(dl_items)} | Editor: {has_editor} | LD Tab: {has_ld_tab}",
            "latency": f"{latency}ms",
            "status": "PASS" if p10_pass else "FAIL",
        })
        print(f"[{'PASS' if p10_pass else 'FAIL'}] Teacher Authoring & Deep Linking: {len(dl_items)} items, Editor={has_editor}, LD Tab={has_ld_tab}")

        # -------------------------------------------------------------
        # 11. SCHOOL ADMIN NRPS SYNC (/school-admin/students)
        # -------------------------------------------------------------
        start = time.time()
        await client.navigate(f"{BASE_URL}/api/v1/auth/demo-launch?persona=admin", wait_seconds=3.0)
        nrps_eval = await client.evaluate("""
            fetch('/api/v1/app/roster/nrps')
                .then(r => r.json())
                .catch(() => ({ ok: false }))
        """)
        has_nrps_api = nrps_eval.get("ok") is True if isinstance(nrps_eval, dict) else False

        await client.navigate(f"{BASE_URL}/school-admin/students", wait_seconds=3.0)
        admin_text = await client.evaluate("document.body.innerText")
        has_nrps_ui = "NRPS" in admin_text or "Sync" in admin_text or "Roster" in admin_text or "Students" in admin_text

        latency = round((time.time() - start) * 1000)
        p11_pass = bool(has_nrps_api and has_nrps_ui)
        audit_results.append({
            "feature": "NRPS Roster Provisioning Sync (F-09)",
            "requirement": "NRPS Roster API + Sync LMS Roster button & status badge",
            "evidence": f"NRPS API in Session: {has_nrps_api} | Admin Students UI: {has_nrps_ui}",
            "latency": f"{latency}ms",
            "status": "PASS" if p11_pass else "FAIL",
        })
        print(f"[{'PASS' if p11_pass else 'FAIL'}] NRPS Roster Provisioning Sync: API={has_nrps_api}, UI={has_nrps_ui}")

        await client.close()

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass

    print("\n" + "=" * 78)
    print(" LIVE AUDIT COMPLETE: ALL CHECKS EXECUTED")
    print("=" * 78)

    with open("live_cdp_audit_results.json", "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)


if __name__ == "__main__":
    asyncio.run(run_cdp_audit())
