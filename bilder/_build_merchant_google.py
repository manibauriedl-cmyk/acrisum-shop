#!/usr/bin/env python3
"""Google-Merchant-Bild: saubere Leiste, echte Icons, weißer Hintergrund (v6)."""
from __future__ import annotations

import ctypes
from ctypes import wintypes
from pathlib import Path

import win32gui
import win32ui
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "acrisum-launcher-google.png"
SIZE = 1500
SHGFI_ICON = 0x100
SHGFI_LARGEICON = 0


class SHFILEINFO(ctypes.Structure):
    _fields_ = [
        ("hIcon", ctypes.c_void_p),
        ("iIcon", ctypes.c_int),
        ("dwAttributes", wintypes.DWORD),
        ("szDisplayName", ctypes.c_wchar * 260),
        ("szTypeName", ctypes.c_wchar * 80),
    ]


# Büro-Icons — keine Dev-Leiste (Regel: kein Dev-Dashb / PKV / Cursor)
APPS = [
    (r"C:\Program Files (x86)\OpenOffice 4\program\swriter.exe", "Writer"),
    (r"C:\Program Files (x86)\OpenOffice 4\program\scalc.exe", "Calc"),
    (r"C:\Program Files (x86)\OpenOffice 4\program\simpress.exe", "Präsent."),
    (r"C:\Program Files\Google\Chrome\Application\chrome.exe", "Chrome"),
    (r"C:\Program Files\Mozilla Thunderbird\thunderbird.exe", "Mail"),
    (r"C:\Windows\explorer.exe", "Explorer"),
]


def _hicon_von_pfad(pfad: str) -> int | None:
    shfi = SHFILEINFO()
    flags = SHGFI_ICON | SHGFI_LARGEICON
    if not ctypes.windll.shell32.SHGetFileInfoW(
        pfad, 0, ctypes.byref(shfi), ctypes.sizeof(shfi), flags
    ):
        return None
    return int(shfi.hIcon or 0) or None


def extract_icon(exe_path: str, px: int = 256) -> Image.Image:
    hicon = _hicon_von_pfad(exe_path)
    if not hicon:
        raise RuntimeError(f"Kein Icon: {exe_path}")
    try:
        hdc = win32gui.GetDC(0)
        hdc_mem = win32ui.CreateDCFromHandle(hdc)
        hbmp = win32ui.CreateBitmap()
        hbmp.CreateCompatibleBitmap(hdc_mem, px, px)
        hdc_bmp = hdc_mem.CreateCompatibleDC()
        hdc_bmp.SelectObject(hbmp)
        win32gui.DrawIconEx(hdc_bmp.GetHandleOutput(), 0, 0, hicon, px, px, 0, 0, 0x0003)
        win32gui.ReleaseDC(0, hdc)
        info = hbmp.GetInfo()
        bits = hbmp.GetBitmapBits(True)
        return Image.frombuffer("RGBA", (info["bmWidth"], info["bmHeight"]), bits, "raw", "BGRA", 0, 1)
    finally:
        win32gui.DestroyIcon(hicon)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("segoeui.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def build() -> None:
    icon_px = 128
    icons: list[tuple[Image.Image, str]] = []
    for exe, label in APPS:
        if not Path(exe).exists():
            print("WARN fehlt:", exe)
            continue
        icons.append((extract_icon(exe, 256), label))
    if len(icons) < 4:
        raise SystemExit("Zu wenige Icons gefunden")

    n = len(icons)
    pad_x = 28
    gap = 18
    label_h = 34
    bar_h = icon_px + label_h + 36
    bar_w = pad_x * 2 + n * icon_px + (n - 1) * gap

    # Leisten-Farben (Acrisum-Stil)
    bar_blue = (158, 197, 235)
    gold = (201, 162, 39)
    taskbar = (45, 45, 48)

    bar = Image.new("RGBA", (bar_w, bar_h + 8), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bar)
    draw.rounded_rectangle((0, 0, bar_w, bar_h), radius=14, fill=bar_blue)
    draw.rectangle((0, bar_h - 6, bar_w, bar_h), fill=gold)
    draw.rectangle((0, bar_h, bar_w, bar_h + 6), fill=taskbar)

    fnt = font(22)
    for i, (ic, label) in enumerate(icons):
        ic_s = ic.resize((icon_px, icon_px), Image.Resampling.LANCZOS)
        x = pad_x + i * (icon_px + gap)
        y = 16
        bar.paste(ic_s, (x, y), ic_s)
        tw = draw.textlength(label, font=fnt)
        draw.text((x + (icon_px - tw) / 2, y + icon_px + 6), label, fill=(30, 30, 30), font=fnt)

    # Auf weißes Quadrat — Leiste groß, zentriert (~82 % Breite)
    canvas = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
    scale = min(0.82 * SIZE / bar_w, 0.38 * SIZE / (bar_h + 6))
    new_w = int(bar_w * scale)
    new_h = int((bar_h + 6) * scale)
    bar_big = bar.resize((new_w, new_h), Image.Resampling.LANCZOS)
    ox = (SIZE - new_w) // 2
    oy = (SIZE - new_h) // 2
    canvas.paste(bar_big, (ox, oy), bar_big)

    canvas.save(OUT, "PNG", optimize=True)
    print("OK", OUT, canvas.size, f"{OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    build()
