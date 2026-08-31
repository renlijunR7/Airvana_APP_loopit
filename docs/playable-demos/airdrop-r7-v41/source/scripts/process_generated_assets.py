#!/usr/bin/env python3
"""Trim and resize generated transparent PNG assets for browser use."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "generated_v1"

TARGETS = {
    "wanzi-full-v2.png": 960,
    "wanzi-face-v2.png": 512,
    "coin-rim-v1.png": 256,
    "parachute-v1.png": 320,
    "wallet-catcher-v1.png": 384,
    "moon-medallion-v1.png": 384,
    "settlement-crystals-v1.png": 384,
}


def trim_and_resize(path: Path, max_edge: int) -> None:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 4 else 0).getbbox()
    if bbox:
        left, top, right, bottom = bbox
        padding = max(8, round(max(right - left, bottom - top) * 0.025))
        left = max(0, left - padding)
        top = max(0, top - padding)
        right = min(image.width, right + padding)
        bottom = min(image.height, bottom + padding)
        image = image.crop((left, top, right, bottom))

    scale = min(1.0, max_edge / max(image.size))
    if scale < 1:
        size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        image = image.resize(size, Image.Resampling.LANCZOS)

    image.save(path, optimize=True)
    print(f"{path.name}: {image.width}x{image.height}")


def main() -> None:
    for filename, max_edge in TARGETS.items():
        trim_and_resize(ASSETS / filename, max_edge)


if __name__ == "__main__":
    main()
