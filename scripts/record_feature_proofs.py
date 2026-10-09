"""
Detailed per-feature proof recordings with:
  - stable full-viewport frames (less messy cropping)
  - animated mouse cursor overlays
  - spoken TTS narration (edge-tts) muxed into MP4

Catalog: docs/management-proof/features.yaml

  python scripts/record_feature_proofs.py --refresh-session
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import textwrap
import wave
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault(
    "PLAYWRIGHT_BROWSERS_PATH",
    str(Path.home() / "AppData" / "Local" / "ms-playwright"),
)
PROOF = ROOT / "docs" / "management-proof"
CATALOG = PROOF / "features.yaml"
OUT_DIR = PROOF / "videos" / "by-feature"
FRAMES_ROOT = OUT_DIR / "_frames"
AUDIO_ROOT = OUT_DIR / "_audio"
DEFAULT_STUDENT_STATE = PROOF / "videos" / "storage_state.json"
DEFAULT_TEACHER_STATE = PROOF / "videos" / "storage_state_teacher.json"

TTS_VOICE = os.getenv("EDVIDURA_PROOF_VOICE", "en-IN-NeerjaNeural")

# App is captured in this viewport; captions sit in a reserved strip BELOW (never over UI).
CONTENT_W = 1280
CONTENT_H = 640
CAPTION_H = 128
FRAME_W = CONTENT_W
FRAME_H = CONTENT_H + CAPTION_H  # 760


def _load_catalog() -> dict[str, Any]:
    import yaml

    data = yaml.safe_load(CATALOG.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not data.get("features"):
        raise SystemExit(f"Invalid catalog: {CATALOG}")
    return data


def _fonts():
    from PIL import ImageFont

    try:
        return (
            ImageFont.truetype("arialbd.ttf", 20),
            ImageFont.truetype("arial.ttf", 15),
            ImageFont.truetype("arial.ttf", 13),
        )
    except OSError:
        try:
            return (
                ImageFont.truetype("arial.ttf", 20),
                ImageFont.truetype("arial.ttf", 15),
                ImageFont.truetype("arial.ttf", 13),
            )
        except OSError:
            f = ImageFont.load_default()
            return f, f, f


def _wrap(text: str, width: int = 96) -> list[str]:
    return textwrap.wrap(text or "", width=width) or [""]


def _cursor_rgba():
    """Large high-contrast pointer (hotspot at tip = 4,4)."""
    from PIL import Image, ImageDraw

    s = 2
    w, h = 44 * s, 52 * s
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # soft outer glow
    d.ellipse([0, 0, 36 * s, 36 * s], fill=(255, 140, 0, 55))
    pts = [
        (4, 4),
        (4, 40 * s),
        (14 * s, 32 * s),
        (20 * s, 48 * s),
        (28 * s, 45 * s),
        (20 * s, 28 * s),
        (36 * s, 28 * s),
    ]
    d.polygon(pts, fill=(255, 220, 40, 255), outline=(10, 10, 10, 255))
    # dark inner edge for contrast on light UI
    d.line(pts + [pts[0]], fill=(0, 0, 0, 220), width=2)
    return img


def _draw_cursor_stack(
    content_rgba,
    *,
    cursor_xy: tuple[float, float] | None,
    trail: list[tuple[float, float]],
    cursor_img,
    pulse_r: int = 0,
):
    """Draw trail dots, optional click pulse, then big cursor."""
    from PIL import Image, ImageDraw

    out = content_rgba.copy()
    layer = Image.new("RGBA", out.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # trail (oldest → newest)
    n = len(trail)
    for i, (tx, ty) in enumerate(trail):
        alpha = int(40 + 160 * (i + 1) / max(1, n))
        r = 4 + int(4 * (i + 1) / max(1, n))
        d.ellipse(
            [tx - r, ty - r, tx + r, ty + r],
            fill=(255, 120, 0, alpha),
            outline=(255, 220, 80, min(255, alpha + 40)),
        )
    if cursor_xy is not None and pulse_r > 0:
        x, y = cursor_xy
        d.ellipse(
            [x - pulse_r, y - pulse_r, x + pulse_r, y + pulse_r],
            outline=(255, 60, 0, 220),
            width=4,
        )
        d.ellipse(
            [x - pulse_r // 2, y - pulse_r // 2, x + pulse_r // 2, y + pulse_r // 2],
            outline=(255, 220, 80, 180),
            width=3,
        )
    out = Image.alpha_composite(out, layer)
    if cursor_xy is not None:
        # hotspot near tip
        hx, hy = 6, 6
        out.alpha_composite(
            cursor_img, (int(cursor_xy[0] - hx), int(cursor_xy[1] - hy))
        )
    return out


def _compose_frame(
    shot_rgb,
    *,
    sheet: str,
    caption: str,
    do: str,
    cursor_xy: tuple[float, float] | None,
    trail: list[tuple[float, float]],
    cursor_img,
    is_output: bool,
    pulse_r: int = 0,
):
    """App screenshot untouched on top; narration panel reserved underneath."""
    from PIL import Image, ImageDraw

    font, font_sm, font_tiny = _fonts()
    content = shot_rgb.resize((CONTENT_W, CONTENT_H), Image.Resampling.LANCZOS)
    content = content.convert("RGBA")
    content = _draw_cursor_stack(
        content,
        cursor_xy=cursor_xy,
        trail=trail,
        cursor_img=cursor_img,
        pulse_r=pulse_r,
    )

    frame = Image.new("RGB", (FRAME_W, FRAME_H), (12, 36, 30))
    frame.paste(content.convert("RGB"), (0, 0))

    panel = Image.new("RGB", (FRAME_W, CAPTION_H), (8, 26, 22))
    d = ImageDraw.Draw(panel)
    d.rectangle([0, 0, FRAME_W, 3], fill=(255, 160, 40))
    d.text((16, 10), (sheet or "")[:100], fill=(160, 200, 180), font=font_tiny)
    if is_output:
        d.rounded_rectangle([FRAME_W - 118, 8, FRAME_W - 16, 30], radius=8, fill=(20, 140, 100))
        d.text((FRAME_W - 102, 11), "OUTPUT", fill=(245, 255, 250), font=font_tiny)
    y = 34
    for line in _wrap(caption, 92)[:1]:
        d.text((16, y), line, fill=(255, 220, 100), font=font)
        y += 24
    for line in _wrap(do, 100)[:2]:
        d.text((16, y), line, fill=(230, 245, 238), font=font_sm)
        y += 18
    frame.paste(panel, (0, CONTENT_H))
    return frame


def _intro_card(feature: dict[str, Any]):
    from PIL import Image, ImageDraw

    font, font_sm, font_tiny = _fonts()
    img = Image.new("RGB", (FRAME_W, FRAME_H), (12, 40, 32))
    d = ImageDraw.Draw(img)
    d.text((48, 220), feature["title"], fill=(230, 245, 238), font=font)
    d.text((48, 260), feature.get("sheet", ""), fill=(160, 200, 180), font=font_sm)
    y = 310
    for line in _wrap(feature.get("intro") or "", 78):
        d.text((48, y), line, fill=(210, 230, 220), font=font_tiny)
        y += 22
    d.text(
        (48, y + 28),
        "Large orange cursor · trail · click pulse · captions below the UI",
        fill=(180, 200, 190),
        font=font_tiny,
    )
    return img


def _wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def _tts_sync(text: str, out_wav: Path, voice: str) -> float:
    """Generate narration WAV via edge-tts CLI (avoids asyncio loop conflicts)."""
    import array

    import imageio_ffmpeg

    clean = " ".join((text or "").split())
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    if not clean:
        with wave.open(str(out_wav), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(array.array("h", [0] * int(24000 * 0.4)).tobytes())
        return 0.4

    mp3 = out_wav.with_suffix(".mp3")
    # Prefer module CLI so we don't nest event loops under Playwright
    cmd = [
        sys.executable,
        "-m",
        "edge_tts",
        "--voice",
        voice,
        "--text",
        clean,
        "--write-media",
        str(mp3),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not mp3.is_file():
        # Fallback: short silence rather than failing the whole pack
        with wave.open(str(out_wav), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(array.array("h", [0] * int(24000 * 1.2)).tobytes())
        return 1.2

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ff,
            "-y",
            "-i",
            str(mp3),
            "-acodec",
            "pcm_s16le",
            "-ar",
            "24000",
            "-ac",
            "1",
            str(out_wav),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        mp3.unlink()
    except OSError:
        pass
    return _wav_duration(out_wav)


def _silence_wav(path: Path, seconds: float) -> None:
    import array

    n = max(1, int(24000 * seconds))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(array.array("h", [0] * n).tobytes())


def _concat_wavs(parts: list[Path], out: Path) -> float:
    """Concatenate PCM wavs with matching format."""
    frames = []
    params = None
    for p in parts:
        with wave.open(str(p), "rb") as wf:
            if params is None:
                params = wf.getparams()
            frames.append(wf.readframes(wf.getnframes()))
    assert params is not None
    with wave.open(str(out), "wb") as wf:
        wf.setparams(params)
        for f in frames:
            wf.writeframes(f)
    return _wav_duration(out)


def _mux_av(frames: list, fps: int, audio_wav: Path, out_mp4: Path) -> None:
    """Write silent mp4 then mux narration with ffmpeg."""
    import imageio.v2 as imageio
    import imageio_ffmpeg

    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    silent = out_mp4.with_suffix(".silent.mp4")
    imageio.mimsave(
        str(silent),
        frames,
        fps=fps,
        codec="libx264",
        quality=7,
        pixelformat="yuv420p",
    )
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    # shortest keeps A/V aligned if lengths differ slightly
    cmd = [
        ff,
        "-y",
        "-i",
        str(silent),
        "-i",
        str(audio_wav),
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        silent.unlink()
    except OSError:
        pass


def _first_locator(page, selector: str):
    for part in [s.strip() for s in selector.split(",") if s.strip()]:
        try:
            loc = page.locator(part)
            if loc.count() > 0:
                return loc.first
        except Exception:
            continue
    return page.locator(selector.split(",")[0].strip()).first


def _stabilize(page) -> None:
    try:
        page.evaluate(
            """() => {
              document.documentElement.style.scrollBehavior = 'auto';
              const s = document.createElement('style');
              s.id = 'ev-proof-clean';
              s.textContent = `
                * {
                  scroll-behavior: auto !important;
                  animation: none !important;
                  transition: none !important;
                }
                ::-webkit-scrollbar { width: 10px; height: 10px; }
                body { overflow-x: hidden !important; }
              `;
              if (!document.getElementById('ev-proof-clean')) document.head.appendChild(s);
            }"""
        )
    except Exception:
        pass
    try:
        page.wait_for_load_state("networkidle", timeout=7000)
    except Exception:
        pass
    page.wait_for_timeout(450)


def _element_center(page, selector: str | None) -> tuple[float, float] | None:
    if not selector:
        return None
    try:
        loc = _first_locator(page, selector)
        try:
            loc.scroll_into_view_if_needed(timeout=2500)
        except Exception:
            pass
        box = loc.bounding_box(timeout=2500)
        if not box:
            return None
        return (box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    except Exception:
        return None


def _clamp_xy(x: float, y: float) -> tuple[float, float]:
    return (
        max(8.0, min(CONTENT_W - 24.0, x)),
        max(8.0, min(CONTENT_H - 24.0, y)),
    )


def _interp(a: tuple[float, float], b: tuple[float, float], n: int) -> list[tuple[float, float]]:
    if n <= 1:
        return [b]
    out = []
    for i in range(1, n + 1):
        t = i / n
        e = t * t * (3 - 2 * t)
        out.append((a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e))
    return out


def _run_action(page, step: dict[str, Any], base_url: str) -> None:
    action = (step.get("action") or "goto").lower()
    wait_ms = int(step.get("wait_ms") or 700)
    optional = bool(step.get("optional"))
    try:
        if action == "goto":
            url = step.get("url") or "/"
            full = url if str(url).startswith("http") else base_url.rstrip("/") + url
            page.goto(full, wait_until="domcontentloaded", timeout=60000)
            _stabilize(page)
        elif action == "click":
            loc = _first_locator(page, step["selector"])
            loc.scroll_into_view_if_needed(timeout=3000)
            loc.click(timeout=8000)
            _stabilize(page)
        elif action == "fill":
            loc = _first_locator(page, step["selector"])
            loc.scroll_into_view_if_needed(timeout=3000)
            loc.click(timeout=5000)
            loc.fill(step.get("text") or "", timeout=8000)
        elif action == "select":
            loc = _first_locator(page, step["selector"])
            loc.scroll_into_view_if_needed(timeout=3000)
            loc.select_option(step.get("value"), timeout=8000)
        elif action in ("scroll", "scroll_into"):
            sel = step.get("selector")
            if sel:
                loc = _first_locator(page, sel)
                loc.scroll_into_view_if_needed(timeout=4000)
                page.wait_for_timeout(350)
            else:
                y = int(step.get("y") or 400)
                page.evaluate(
                    """(y) => { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }""",
                    y,
                )
                page.wait_for_timeout(400)
        elif action == "shot":
            pass
        else:
            raise ValueError(f"Unknown action {action}")
        page.wait_for_timeout(wait_ms)
        _stabilize(page)
    except Exception:
        if optional:
            page.wait_for_timeout(250)
            return
        raise


def _target_selector(step: dict[str, Any]) -> str | None:
    action = (step.get("action") or "").lower()
    if action in ("click", "fill", "select"):
        return step.get("selector")
    if action in ("scroll", "scroll_into") and step.get("selector"):
        return step.get("selector")
    return None


def _append_move_frames(
    video_frames: list,
    *,
    shot,
    sheet: str,
    caption: str,
    do: str,
    path: list[tuple[float, float]],
    trail: list[tuple[float, float]],
    cursor_img,
    is_output: bool,
    page=None,
) -> tuple[float, float]:
    mouse = path[-1] if path else (CONTENT_W * 0.2, CONTENT_H * 0.2)
    for pt in path:
        trail.append(pt)
        if len(trail) > 14:
            del trail[0 : len(trail) - 14]
        if page is not None:
            try:
                page.mouse.move(pt[0], pt[1])
            except Exception:
                pass
        video_frames.append(
            _compose_frame(
                shot,
                sheet=sheet,
                caption=caption,
                do=do,
                cursor_xy=pt,
                trail=list(trail),
                cursor_img=cursor_img,
                is_output=is_output,
            )
        )
        mouse = pt
    return mouse


def _append_click_pulse(
    video_frames: list,
    *,
    shot,
    sheet: str,
    caption: str,
    do: str,
    mouse: tuple[float, float],
    trail: list[tuple[float, float]],
    cursor_img,
) -> None:
    for r in (18, 30, 44, 58, 40, 22):
        video_frames.append(
            _compose_frame(
                shot,
                sheet=sheet,
                caption=caption,
                do=do,
                cursor_xy=mouse,
                trail=list(trail),
                cursor_img=cursor_img,
                is_output=False,
                pulse_r=r,
            )
        )


def _session_path_for_role(role: str | None, args_storage: str | None) -> str | None:
    if args_storage and Path(args_storage).is_file():
        return args_storage
    env = os.getenv("EDVIDURA_PROOF_STORAGE_STATE", "").strip()
    if env and Path(env).is_file():
        return env
    if role == "teacher" and DEFAULT_TEACHER_STATE.is_file():
        return str(DEFAULT_TEACHER_STATE)
    if DEFAULT_STUDENT_STATE.is_file():
        return str(DEFAULT_STUDENT_STATE)
    return None


def _capture_feature(
    browser,
    *,
    base_url: str,
    feature: dict[str, Any],
    storage_state: str | None,
    fps: int,
    voice: str,
    with_audio: bool,
) -> dict[str, Any]:
    from PIL import Image

    fid = feature["id"]
    title = feature["title"]
    sheet = feature.get("sheet") or title
    frame_dir = FRAMES_ROOT / fid
    audio_dir = AUDIO_ROOT / fid
    frame_dir.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)
    out_mp4 = OUT_DIR / f"{fid}.mp4"
    needs = bool(feature.get("requires_session"))
    cursor = _cursor_rgba()
    mouse = (CONTENT_W * 0.12, CONTENT_H * 0.22)
    trail: list[tuple[float, float]] = []

    context_kwargs: dict[str, Any] = {
        "viewport": {"width": CONTENT_W, "height": CONTENT_H},
        "device_scale_factor": 1,
    }
    if storage_state and Path(storage_state).is_file():
        context_kwargs["storage_state"] = storage_state

    if needs and not context_kwargs.get("storage_state"):
        frames = [_intro_card(feature)] * (fps * 3)
        if with_audio:
            wav = audio_dir / "intro.wav"
            _tts_sync(
                f"{title}. {feature.get('intro') or 'Needs a Moodle launch session.'}",
                wav,
                voice,
            )
            _mux_av(frames, fps, wav, out_mp4)
        else:
            import imageio.v2 as imageio

            imageio.mimsave(
                str(out_mp4),
                frames,
                fps=fps,
                codec="libx264",
                quality=7,
                pixelformat="yuv420p",
            )
        return {
            "id": fid,
            "title": title,
            "status": "fallback_no_session",
            "mp4": out_mp4.relative_to(PROOF).as_posix(),
            "sheet": sheet,
        }

    context = browser.new_context(**context_kwargs)
    page = context.new_page()
    video_frames: list = []
    audio_parts: list[Path] = []
    status = "ok"

    intro = _intro_card(feature)
    intro_text = f"{title}. {feature.get('intro') or ''}".strip()
    if with_audio:
        intro_wav = audio_dir / "00_intro.wav"
        intro_dur = _tts_sync(intro_text, intro_wav, voice)
        audio_parts.append(intro_wav)
        n = max(fps * 2, int(math.ceil(intro_dur * fps)))
    else:
        n = fps * 3
    video_frames.extend([intro] * n)

    try:
        for i, step in enumerate(feature.get("steps") or [], 1):
            action = (step.get("action") or "goto").lower()
            caption = step.get("caption") or action
            do = step.get("do") or ""
            is_output = bool(step.get("result"))

            narr = f"{caption}. {do}".strip()
            step_wav = audio_dir / f"{i:02d}.wav"
            if with_audio:
                dur = _tts_sync(narr, step_wav, voice)
                audio_parts.append(step_wav)
            else:
                dur = 2.2 if is_output else 1.6

            target_sel = _target_selector(step)

            if action in ("goto", "scroll", "scroll_into", "shot"):
                try:
                    _run_action(page, step, base_url)
                except Exception:
                    if step.get("optional"):
                        continue
                    status = "error_partial"
                    break
                raw = page.screenshot(type="png", full_page=False)
                shot = Image.open(__import__("io").BytesIO(raw)).convert("RGB")
                dest = _element_center(page, target_sel) if target_sel else None
                if dest is None:
                    dest = _clamp_xy(CONTENT_W * 0.55, CONTENT_H * 0.42)
                else:
                    dest = _clamp_xy(*dest)
                path = _interp(mouse, dest, max(10, fps))
                mouse = _append_move_frames(
                    video_frames,
                    shot=shot,
                    sheet=sheet,
                    caption=caption,
                    do=do,
                    path=path,
                    trail=trail,
                    cursor_img=cursor,
                    is_output=is_output,
                    page=page,
                )
                hold_n = max(fps, int(math.ceil(dur * fps)) - len(path))
                still = _compose_frame(
                    shot,
                    sheet=sheet,
                    caption=caption,
                    do=do,
                    cursor_xy=mouse,
                    trail=[],
                    cursor_img=cursor,
                    is_output=is_output,
                )
                video_frames.extend([still] * max(1, hold_n))
                still.save(frame_dir / f"step_{i:02d}.png")
                trail.clear()
                continue

            _stabilize(page)
            raw_before = page.screenshot(type="png", full_page=False)
            before = Image.open(__import__("io").BytesIO(raw_before)).convert("RGB")
            dest = _element_center(page, target_sel) or (CONTENT_W * 0.5, CONTENT_H * 0.5)
            dest = _clamp_xy(*dest)
            path = _interp(mouse, dest, max(12, int(fps * 1.2)))
            mouse = _append_move_frames(
                video_frames,
                shot=before,
                sheet=sheet,
                caption=caption,
                do=do,
                path=path,
                trail=trail,
                cursor_img=cursor,
                is_output=False,
                page=page,
            )
            _append_click_pulse(
                video_frames,
                shot=before,
                sheet=sheet,
                caption=caption,
                do=do,
                mouse=mouse,
                trail=trail,
                cursor_img=cursor,
            )
            try:
                _run_action(page, step, base_url)
            except Exception:
                if step.get("optional"):
                    continue
                status = "error_partial"
                break
            raw_after = page.screenshot(type="png", full_page=False)
            after = Image.open(__import__("io").BytesIO(raw_after)).convert("RGB")
            still = _compose_frame(
                after,
                sheet=sheet,
                caption=caption,
                do=do,
                cursor_xy=mouse,
                trail=[],
                cursor_img=cursor,
                is_output=is_output,
            )
            still.save(frame_dir / f"step_{i:02d}.png")
            hold_n = max(fps, int(math.ceil(dur * fps)) - len(path) - 6)
            video_frames.extend([still] * max(1, hold_n))
            trail.clear()

        try:
            textb = page.inner_text("body")[:2000].lower()
            if needs and (
                "session expired" in textb
                or "no lti session" in textb
                or "launch edvidura from moodle" in textb
            ):
                status = "fallback_session_invalid"
        except Exception:
            pass

        context.close()

        if with_audio and audio_parts:
            master = audio_dir / "master.wav"
            audio_dur = _concat_wavs(audio_parts, master)
            video_dur = len(video_frames) / float(fps)
            if video_dur > audio_dur + 0.15:
                pad = audio_dir / "pad.wav"
                _silence_wav(pad, video_dur - audio_dur)
                master2 = audio_dir / "master_pad.wav"
                _concat_wavs([master, pad], master2)
                master = master2
            elif audio_dur > video_dur + 0.2:
                extra = int(math.ceil((audio_dur - video_dur) * fps))
                if video_frames:
                    video_frames.extend([video_frames[-1]] * extra)
            _mux_av(video_frames, fps, master, out_mp4)
        else:
            import imageio.v2 as imageio

            imageio.mimsave(
                str(out_mp4),
                video_frames,
                fps=fps,
                codec="libx264",
                quality=7,
                pixelformat="yuv420p",
            )

        return {
            "id": fid,
            "title": title,
            "status": status,
            "mp4": out_mp4.relative_to(PROOF).as_posix(),
            "frames": len(video_frames),
            "sheet": sheet,
            "audio": with_audio,
        }
    except Exception as exc:
        try:
            context.close()
        except Exception:
            pass
        return {
            "id": fid,
            "title": title,
            "status": "error_fallback",
            "mp4": out_mp4.relative_to(PROOF).as_posix(),
            "note": str(exc)[:300],
            "sheet": sheet,
        }


def _write_index(results: list[dict[str, Any]], base_url: str) -> Path:
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(
            {
                "base_url": base_url,
                "generated_by": "scripts/record_feature_proofs.py (cursor+audio)",
                "features": results,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    rows = []
    for r in results:
        st = r.get("status", "")
        badge = "ok" if st == "ok" else "fallback"
        audio = "yes" if r.get("audio") else "no"
        rows.append(
            "<tr>"
            f"<td><code>{r['id']}</code></td>"
            f"<td>{r.get('sheet') or r['title']}</td>"
            f"<td><span class='badge {badge}'>{st}</span></td>"
            f"<td>{audio}</td>"
            f"<td><a href='{Path(r['mp4']).name}'>{Path(r['mp4']).name}</a></td>"
            "</tr>"
        )
    html = (
        "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/>"
        "<title>Narrated feature recordings</title>"
        "<style>"
        "body{font-family:Segoe UI,system-ui,sans-serif;margin:24px;background:#f4f7f5;color:#0e2b24}"
        "table{border-collapse:collapse;width:100%;background:#fff}"
        "th,td{border-bottom:1px solid #ddd;padding:10px;text-align:left;font-size:.9rem}"
        ".badge{padding:2px 8px;border-radius:999px;font-size:.75rem;font-weight:700}"
        ".badge.ok{background:#d1fae5;color:#065f46}"
        ".badge.fallback{background:#ffedd5;color:#9a3412}"
        "video{max-width:100%;margin:8px 0 20px;background:#000}"
        "</style></head><body>"
        "<h1>EdVidura — narrated sheet feature recordings</h1>"
        "<p>Mouse path + spoken narration for each click and result. Turn sound on.</p>"
        f"<p>Base: <a href='{base_url}'>{base_url}</a></p>"
        "<table><thead><tr><th>ID</th><th>Sheet row</th><th>Status</th><th>Audio</th><th>Video</th></tr></thead><tbody>"
        + "".join(rows)
        + "</tbody></table>"
    )
    for r in results:
        name = Path(r["mp4"]).name
        html += f"<h2>{r['title']}</h2><p class='meta'>{r.get('sheet','')}</p><video controls src='{name}'></video>"
    html += "</body></html>"
    index = OUT_DIR / "index.html"
    index.write_text(html, encoding="utf-8")
    return index


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url",
        default=os.getenv(
            "APP_BASE_URL", "https://edvidura-app-production.up.railway.app"
        ),
    )
    parser.add_argument("--public-only", action="store_true")
    parser.add_argument("--session-only", action="store_true")
    parser.add_argument("--feature", action="append", dest="features")
    parser.add_argument("--storage-state", default="")
    parser.add_argument("--refresh-session", action="store_true")
    parser.add_argument("--no-audio", action="store_true")
    parser.add_argument("--voice", default=TTS_VOICE)
    parser.add_argument("--detailed", action="store_true")
    args = parser.parse_args()

    if args.refresh_session:
        for cmd in (
            [
                sys.executable,
                str(ROOT / "scripts" / "auto_lti_storage_state.py"),
                "--user",
                "riverside_alice",
                "--password",
                "Demo@12345",
            ],
            [
                sys.executable,
                str(ROOT / "scripts" / "auto_lti_storage_state.py"),
                "--user",
                "riverside_priya",
                "--password",
                "Demo@12345",
                "--out",
                str(DEFAULT_TEACHER_STATE),
            ],
        ):
            print("refresh session…", flush=True)
            subprocess.call(cmd)

    catalog = _load_catalog()
    features = list(catalog["features"])
    if args.public_only:
        features = [f for f in features if not f.get("requires_session")]
    if args.session_only:
        features = [f for f in features if f.get("requires_session")]
    if args.features:
        want = set(args.features)
        features = [f for f in features if f["id"] in want]
    if not features:
        print("No features selected", file=sys.stderr)
        return 1

    from playwright.sync_api import sync_playwright

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fps = int(catalog.get("fps") or 10)
    if fps < 10:
        fps = 10
    base = args.base_url.rstrip("/")
    forced = args.storage_state.strip() or None
    with_audio = not args.no_audio

    results: list[dict[str, Any]] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for feature in features:
            role = feature.get("role")
            state = _session_path_for_role(role, forced)
            print(
                f"recording {feature['id']} (audio={'on' if with_audio else 'off'}, cursor=on) …",
                flush=True,
            )
            result = _capture_feature(
                browser,
                base_url=base,
                feature=feature,
                storage_state=state,
                fps=fps,
                voice=args.voice,
                with_audio=with_audio,
            )
            print(f"  -> {result['status']}  {result['mp4']}", flush=True)
            results.append(result)
        browser.close()

    index = _write_index(results, base)
    ok = sum(1 for r in results if r.get("status") == "ok")
    print(f"\nWrote {len(results)} narrated videos under {OUT_DIR}")
    print(f"Index: {index}")
    print(f"OK: {ok}/{len(results)} · voice={args.voice}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
