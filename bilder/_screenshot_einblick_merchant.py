#!/usr/bin/env python3
"""Screenshots aus einblick-demo.html — beste Story-Frames für Merchant."""
from __future__ import annotations

import asyncio
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

HTML = Path(r"D:\winsu\projekte\winsu-vermarktung\shop\einblick-demo.html")
OUT_DIR = Path(__file__).resolve().parent / "_merchant_kandidaten"
MERCHANT = Path(__file__).resolve().parent / "acrisum-launcher-google.png"
SIZE = 1500

# phase_index → Kurzname (siehe einblick-demo.html phases[])
FRAMES = {
    2: "03-acrisum-leiste",
    18: "19-fenster-stoppt-am-rand",
    22: "23-anheften-links",
    10: "11-mega-menue",
    27: "28-fazit-leiste",
    1: "02-win11-leiste-voll",
}


def to_merchant_square(src: Path, dest: Path) -> None:
    """Demo-Stage auf weißes 1500×1500 — Produkt groß, Google-tauglich."""
    im = Image.open(src).convert("RGBA")
    # Leichten Rand abschneiden (Demo-Rahmen)
    w, h = im.size
    margin = max(1, int(min(w, h) * 0.01))
    im = im.crop((margin, margin, w - margin, h - margin))
    w, h = im.size
    scale = min(0.92 * SIZE / w, 0.92 * SIZE / h)
    nw, nh = int(w * scale), int(h * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
    ox, oy = (SIZE - nw) // 2, (SIZE - nh) // 2
    canvas.paste(im, (ox, oy), im)
    canvas.save(dest, "PNG", optimize=True)
    print("MERCHANT", dest, f"{dest.stat().st_size // 1024} KB")


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    url = HTML.as_uri()

    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge")
        page = await browser.new_page(viewport={"width": 980, "height": 720}, device_scale_factor=2)
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_timeout(400)

        for idx, name in FRAMES.items():
            sel = f'#timeline span[data-i="{idx}"]'
            await page.click(sel)
            await page.wait_for_timeout(900)
            stage = page.locator(".demo-stage")
            raw = OUT_DIR / f"{name}.png"
            await stage.screenshot(path=str(raw))
            print("OK", raw.name, raw.stat().st_size // 1024, "KB")

        await browser.close()

    # Beste Story: Fenster stoppt am Launcher-Rand
    best = OUT_DIR / "19-fenster-stoppt-am-rand.png"
    if best.exists():
        to_merchant_square(best, MERCHANT)


if __name__ == "__main__":
    asyncio.run(main())
