"""Stitch captured public-surface frames into a silent MP4 walkthrough."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import imageio.v2 as imageio

root = Path(__file__).resolve().parent
frames_dir = root / "frames"
out = root / "edvidura-done-public-walkthrough.mp4"

slides = [
    ("frame_01_landing.png", "Landing — LTI / branding / design"),
    ("frame_02_health.png", "Production /health — live + DB + LRS"),
    ("frame_03_onboard.png", "Onboard — schools, LTI URLs, multi-tenancy"),
    ("frame_04_ops.png", "Owner console — Yet + Metabase gate"),
    ("frame_05_jwks.png", "LTI JWKS — public authorization keys"),
    ("frame_07_proof_index.png", "Proof pack index — Done checklist"),
]

W, H = 1280, 720
hold_sec = 3.2
fps = 5
n_hold = max(1, int(hold_sec * fps))

try:
    font = ImageFont.truetype("arial.ttf", 28)
    font_sm = ImageFont.truetype("arial.ttf", 18)
except OSError:
    font = ImageFont.load_default()
    font_sm = font

writer_frames = []
for name, caption in slides:
    src = Image.open(frames_dir / name).convert("RGB")
    src.thumbnail((W, H - 64), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (W, H), (12, 40, 32))
    x = (W - src.width) // 2
    y = (H - 64 - src.height) // 2
    canvas.paste(src, (x, y))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, H - 64, W, H], fill=(8, 28, 22))
    draw.text((24, H - 48), caption, fill=(230, 245, 238), font=font)
    draw.text(
        (24, 16),
        "EdVidura · live walkthrough (public surfaces)",
        fill=(160, 200, 180),
        font=font_sm,
    )
    for _ in range(n_hold):
        writer_frames.append(canvas.copy())

end = Image.new("RGB", (W, H), (12, 40, 32))
d = ImageDraw.Draw(end)
d.text(
    (80, 280),
    "Moodle-gated Done items (quiz / AI / coach)",
    fill=(230, 245, 238),
    font=font,
)
d.text(
    (80, 330),
    "need an LTI launch — see proof pack §A–C scripts",
    fill=(180, 210, 195),
    font=font_sm,
)
for _ in range(n_hold):
    writer_frames.append(end)

print(f"encoding {len(writer_frames)} frames @ {fps}fps …")
imageio.mimsave(
    str(out),
    writer_frames,
    fps=fps,
    codec="libx264",
    quality=7,
    pixelformat="yuv420p",
)
print("wrote", out, "size_mb", round(out.stat().st_size / 1e6, 2))
