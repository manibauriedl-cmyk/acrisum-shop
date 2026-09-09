#!/usr/bin/env python3
"""Aus Einblick-Kandidat → Merchant 1500² (Tip-Leiste unten abgeschnitten)."""
from pathlib import Path

from PIL import Image

SRC = Path(__file__).parent / "19-fenster-stoppt-am-rand.png"
OUT = Path(__file__).parent.parent / "acrisum-launcher-google.png"
SIZE = 1500
TIP_CROP = 72  # grüne/braune Demo-Erklärzeile unten — nicht ins Merchant-Bild


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    im = im.crop((0, 0, w, max(1, h - TIP_CROP)))
    w, h = im.size
    scale = min(0.94 * SIZE / w, 0.94 * SIZE / h)
    nw, nh = int(w * scale), int(h * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
    canvas.paste(im, ((SIZE - nw) // 2, (SIZE - nh) // 2), im)
    tmp = OUT.with_suffix(".v8.tmp.png")
    canvas.save(tmp, "PNG", optimize=True)
    tmp.replace(OUT)
    print("OK", OUT, SIZE, f"{OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
