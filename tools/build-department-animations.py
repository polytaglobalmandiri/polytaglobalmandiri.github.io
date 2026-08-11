"""Build lightweight looping WebP animations for department cards."""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "img" / "departments"
WIDTH = 420
HEIGHT = 236
FRAME_COUNT = 48
FRAME_DURATION_MS = 84


def ease_in_out(value: float) -> float:
    return 0.5 - 0.5 * math.cos(value * math.tau)


def cover_frame(source: Image.Image, scale: float, offset_x: float, offset_y: float) -> Image.Image:
    cover_scale = max(WIDTH / source.width, HEIGHT / source.height) * scale
    size = (math.ceil(source.width * cover_scale), math.ceil(source.height * cover_scale))
    resized = source.resize(size, Image.Resampling.LANCZOS)
    left = round((resized.width - WIDTH) / 2 + offset_x)
    top = round((resized.height - HEIGHT) / 2 + offset_y)
    return resized.crop((left, top, left + WIDTH, top + HEIGHT))


def atmospheric_overlay(seed: int, progress: float) -> Image.Image:
    rng = random.Random(seed)
    particles = []
    for _ in range(16):
        particles.append((rng.random(), rng.random(), rng.uniform(1.2, 3.1), rng.uniform(.35, .85)))

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    for start_x, start_y, radius, speed in particles:
        x = ((start_x + math.sin((progress + start_y) * math.tau) * .025) % 1) * WIDTH
        y = ((start_y - progress * speed) % 1) * HEIGHT
        pulse = .45 + .55 * math.sin((progress + start_x) * math.tau) ** 2
        alpha = round(34 * pulse)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 232, 207, alpha))
    return glow.filter(ImageFilter.GaussianBlur(1.25))


def moving_light(progress: float, phase: float) -> Image.Image:
    layer = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    pixels = layer.load()
    light_x = WIDTH * (-.18 + 1.36 * ((progress + phase) % 1))
    light_y = HEIGHT * (.28 + .08 * math.sin((progress + phase) * math.tau))
    for y in range(HEIGHT):
        for x in range(WIDTH):
            dx = (x - light_x) / (WIDTH * .34)
            dy = (y - light_y) / (HEIGHT * .7)
            strength = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy)) ** 2
            pixels[x, y] = (
                round(34 * strength),
                round(25 * strength),
                round(19 * strength),
            )
    return layer.filter(ImageFilter.GaussianBlur(7))


def vignette() -> Image.Image:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pixels = layer.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            dx = (x - WIDTH / 2) / (WIDTH / 2)
            dy = (y - HEIGHT / 2) / (HEIGHT / 2)
            distance = min(1.0, math.sqrt(dx * dx + dy * dy))
            pixels[x, y] = (5, 7, 10, round(58 * distance ** 1.8))
    return layer


def build_animation(source_path: Path) -> Path:
    source = Image.open(source_path).convert("RGB")
    seed = sum(ord(char) for char in source_path.stem)
    phase = (seed % FRAME_COUNT) / FRAME_COUNT
    dark_edges = vignette()
    frames = []

    for index in range(FRAME_COUNT):
        progress = index / FRAME_COUNT
        smooth = ease_in_out(progress)
        scale = 1.035 + .035 * smooth
        offset_x = math.sin((progress + phase) * math.tau) * 8.5
        offset_y = math.cos((progress + phase * .7) * math.tau) * 5.5
        frame = cover_frame(source, scale, offset_x, offset_y)
        frame = ImageEnhance.Color(frame).enhance(1.04)
        frame = ImageEnhance.Contrast(frame).enhance(1.035)
        frame = ImageChops.screen(frame, moving_light(progress, phase))
        frame = Image.alpha_composite(frame.convert("RGBA"), atmospheric_overlay(seed, progress))
        frame = Image.alpha_composite(frame, dark_edges).convert("RGB")
        frames.append(frame)

    output = source_path.with_name(source_path.stem + "-animated.webp")
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        quality=72,
        method=6,
        minimize_size=True,
    )
    return output


def main() -> None:
    requested = {name.lower().removesuffix(".webp") for name in sys.argv[1:]}
    sources = sorted(
        path for path in SOURCE_DIR.glob("*.webp")
        if not path.stem.endswith("-animated") and (not requested or path.stem.lower() in requested)
    )
    if not sources:
        raise SystemExit("Tidak ada gambar departemen yang ditemukan.")
    for source in sources:
        output = build_animation(source)
        print(f"Dibuat: {output.relative_to(ROOT)} ({output.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
