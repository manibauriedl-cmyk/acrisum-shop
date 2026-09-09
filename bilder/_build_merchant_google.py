#!/usr/bin/env python3
"""Google-Merchant-Bild v7 — Story: zweite Leiste, Platz reserviert, Büro-Fenster."""
from __future__ import annotations

import ctypes
from ctypes import wintypes
from pathlib import Path

import win32gui
import win32ui
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "acrisum-launcher-google.png"
W = H = 1500

SHGFI_ICON = 0x100
SHGFI_LARGEICON = 0

# Farben Acrisum / Windows
BAR_BLUE = (158, 197, 235)
GOLD = (212, 175, 55)
GOLD_DARK = (180, 145, 40)
DESKTOP = (32, 56, 92)
TASKBAR = (32, 32, 36)
TASKBAR_EDGE = (60, 60, 66)
WIN_BODY = (252, 252, 252)
WIN_TITLE = (243, 243, 243)
WIN_BORDER = (210, 210, 210)
ACCENT_WRITER = (43, 87, 154)
ACCENT_MAIL = (0, 120, 212)

APPS = [
    (r"C:\Program Files (x86)\OpenOffice 4\program\swriter.exe", "Writer"),
    (r"C:\Program Files (x86)\OpenOffice 4\program\scalc.exe", "Calc"),
    (r"C:\Program Files (x86)\OpenOffice 4\program\simpress.exe", "Präsent."),
    (r"C:\Program Files\Google\Chrome\Application\chrome.exe", "Chrome"),
    (r"C:\Program Files\Mozilla Thunderbird\thunderbird.exe", "Mail"),
    (r"C:\Windows\explorer.exe", "Ordner"),
]


class SHFILEINFO(ctypes.Structure):
    _fields_ = [
        ("hIcon", ctypes.c_void_p),
        ("iIcon", ctypes.c_int),
        ("dwAttributes", wintypes.DWORD),
        ("szDisplayName", ctypes.c_wchar * 260),
        ("szTypeName", ctypes.c_wchar * 80),
    ]


def fnt(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        try:
            return ImageFont.truetype("arial.ttf", size)
        except OSError:
            return ImageFont.load_default()


def _hicon(pfad: str) -> int | None:
    shfi = SHFILEINFO()
    if not ctypes.windll.shell32.SHGetFileInfoW(
        pfad, 0, ctypes.byref(shfi), ctypes.sizeof(shfi), SHGFI_ICON | SHGFI_LARGEICON
    ):
        return None
    return int(shfi.hIcon or 0) or None


def extract_icon(exe: str, px: int = 256) -> Image.Image:
    hicon = _hicon(exe)
    if not hicon:
        raise RuntimeError(exe)
    try:
        hdc = win32gui.GetDC(0)
        mem = win32ui.CreateDCFromHandle(hdc)
        bmp = win32ui.CreateBitmap()
        bmp.CreateCompatibleBitmap(mem, px, px)
        dc = mem.CreateCompatibleDC()
        dc.SelectObject(bmp)
        win32gui.DrawIconEx(dc.GetHandleOutput(), 0, 0, hicon, px, px, 0, 0, 0x0003)
        win32gui.ReleaseDC(0, hdc)
        info = bmp.GetInfo()
        return Image.frombuffer(
            "RGBA", (info["bmWidth"], info["bmHeight"]), bmp.GetBitmapBits(True), "raw", "BGRA", 0, 1
        )
    finally:
        win32gui.DestroyIcon(hicon)


def draw_pin(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    """Grüne Anheften-Nadel."""
    draw.ellipse((cx - r, cy - r - 4, cx + r, cy + r - 4), fill=(72, 168, 78), outline=(40, 120, 48))
    draw.polygon([(cx, cy + r + 10), (cx - 6, cy + r - 2), (cx + 6, cy + r - 2)], fill=(180, 180, 180))


def draw_handle(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    for row in range(2):
        for col in range(3):
            dx = x + col * 10
            dy = y + row * 10
            draw.ellipse((dx, dy, dx + 5, dy + 5), fill=(100, 120, 140))


def draw_window(
    base: Image.Image,
    box: tuple[int, int, int, int],
    title: str,
    accent: tuple[int, int, int],
    lines: list[str],
) -> None:
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Schatten
    d.rounded_rectangle((x0 + 8, y0 + 10, x1 + 8, y1 + 10), radius=10, fill=(0, 0, 0, 55))
    d.rounded_rectangle((x0, y0, x1, y1), radius=10, fill=WIN_BODY, outline=WIN_BORDER, width=2)
    th = 44
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y0 + th), fill=WIN_TITLE)
    d.rectangle((x0 + 1, y0 + th - 3, x1 - 1, y0 + th), fill=accent)
    tf = fnt(20)
    d.text((x0 + 16, y0 + 11), title, fill=(25, 25, 25), font=tf)
    # Schließen-Kreuz
    cx, cy = x1 - 22, y0 + 22
    d.ellipse((cx - 11, cy - 11, cx + 11, cy + 11), fill=(232, 17, 35))
    d.line((cx - 4, cy - 4, cx + 4, cy + 4), fill=(255, 255, 255), width=2)
    d.line((cx + 4, cy - 4, cx - 4, cy + 4), fill=(255, 255, 255), width=2)
    # Inhalt — Dokumentzeilen
    lf = fnt(18)
    ly = y0 + th + 28
    for line in lines:
        d.text((x0 + 24, ly), line, fill=(55, 55, 55), font=lf)
        ly += 34
    base.alpha_composite(layer)


def draw_taskbar(base: Image.Image, y0: int) -> None:
    d = ImageDraw.Draw(base)
    d.rectangle((0, y0, W, H), fill=TASKBAR)
    d.line((0, y0, W, y0), fill=TASKBAR_EDGE, width=2)
    # Start
    d.rounded_rectangle((18, y0 + 14, 58, y0 + 58), radius=6, fill=(55, 55, 60))
    for i, c in enumerate([(0, 120, 212), (126, 186, 0), (255, 185, 0), (232, 17, 35)]):
        ox = 26 + (i % 2) * 14
        oy = y0 + 22 + (i // 2) * 14
        d.rectangle((ox, oy, ox + 10, oy + 10), fill=c)
    # Suche
    d.rounded_rectangle((72, y0 + 16, 340, y0 + 56), radius=18, fill=(48, 48, 52))
    d.text((92, y0 + 24), "Suchen", fill=(170, 170, 175), font=fnt(20))
    # Uhr
    d.text((W - 110, y0 + 24), "14:30", fill=(220, 220, 225), font=fnt(20))


def build_launcher_strip(icons: list[tuple[Image.Image, str]], width: int) -> Image.Image:
    icon_px = 72
    pad = 20
    gap = 14
    label_h = 28
    bar_h = 168
    strip = Image.new("RGBA", (width, bar_h), BAR_BLUE + (255,))
    d = ImageDraw.Draw(strip)
    d.rectangle((0, bar_h - 8, width, bar_h), fill=GOLD_DARK)
    x = pad
    draw_handle(d, x, 28)
    x += 44
    draw_pin(d, x + icon_px // 2, 52, 18)
    d.text((x + 4, 98), "Anheften", fill=(25, 25, 25), font=fnt(16))
    x += icon_px + gap + 8
    lf = fnt(16)
    for ic, label in icons:
        s = ic.resize((icon_px, icon_px), Image.Resampling.LANCZOS)
        strip.paste(s, (x, 18), s)
        tw = d.textlength(label, font=lf)
        d.text((x + (icon_px - tw) / 2, 98), label, fill=(25, 25, 25), font=lf)
        x += icon_px + gap
    # Overflow
    d.text((width - pad - 52, 42), "» 12", fill=(25, 25, 25), font=fnt(26, bold=True))
    return strip


def build() -> None:
    icons: list[tuple[Image.Image, str]] = []
    for exe, label in APPS:
        if Path(exe).exists():
            icons.append((extract_icon(exe, 256), label))
    if len(icons) < 4:
        raise SystemExit("Zu wenige Icons")

    bar_h = 168
    gold_h = 36
    task_h = 72
    desk_top = bar_h + gold_h
    desk_bot = H - task_h

    canvas = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(canvas)

    # Desktop-Hintergrund
    d.rectangle((0, desk_top, W, desk_bot), fill=DESKTOP)

    # Fenster — enden oberhalb Goldband (= Platz reserviert)
    win_bottom = desk_top + 20  # sichtbarer Abstand zur Goldzone
    draw_window(
        canvas,
        (70, desk_top + 50, 700, win_bottom + 420),
        "Writer — Angebot.docx",
        ACCENT_WRITER,
        ["Sehr geehrte Damen und Herren,", "anbei unser Angebot …", "", "Mit freundlichen Grüßen"],
    )
    draw_window(
        canvas,
        (480, desk_top + 130, 1080, win_bottom + 380),
        "Thunderbird — Posteingang",
        ACCENT_MAIL,
        ["▪ Kunde Müller — Rückfrage", "▪ Rechnung #2026-041", "▪ Terminbestätigung"],
    )

    # Gold — reservierter Desktop-Platz (Story-Kern)
    d.rectangle((0, bar_h, W, bar_h + gold_h), fill=GOLD)
    d.line((0, bar_h, W, bar_h), fill=GOLD_DARK, width=2)
    gf = fnt(22, bold=True)
    msg = "Desktop-Platz reserviert — Fenster enden an der Leiste"
    tw = d.textlength(msg, font=gf)
    d.text(((W - tw) / 2, bar_h + 7), msg, fill=(45, 38, 10), font=gf)

    # Acrisum-Leiste oben
    strip = build_launcher_strip(icons, W)
    canvas.paste(strip, (0, 0), strip)

    # Windows-Taskleiste unten (= zweite Leiste neben Windows)
    draw_taskbar(canvas, H - task_h)

    # Dezente Story-Zeile unten im Desktop (kein Werbebanner — Kontext)
    sf = fnt(24, bold=True)
    story = "Zweite Taskleiste fürs Büro — Programme anheften, Fenster finden"
    sw = d.textlength(story, font=sf)
    d.text(((W - sw) / 2, desk_bot - 52), story, fill=(200, 210, 225), font=sf)

    out = canvas.convert("RGB")
    out.save(OUT, "PNG", optimize=True)
    print("OK v7", OUT, out.size, f"{OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    build()
