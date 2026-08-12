from PIL import Image
from pathlib import Path

src_dir = Path(__file__).resolve().parent
# Laisten-Hintergrund + nahe Varianten (wie transparentcolor)
KEYS = [(158, 197, 235), (155, 195, 233), (162, 200, 238), (150, 192, 230)]
TOL = 35

def near_key(r, g, b):
    for kr, kg, kb in KEYS:
        if abs(r - kr) <= TOL and abs(g - kg) <= TOL and abs(b - kb) <= TOL:
            return True
    # helles Leistenblau allgemein
    if 140 <= r <= 180 and 180 <= g <= 220 and 210 <= b <= 255 and g > r and b > g - 10:
        return True
    return False

for name in ("leiste-5.png", "leiste-kurz.png", "leiste-kurz-vert.png"):
    p = src_dir / name
    im = Image.open(p).convert("RGBA")
    px = im.load()
    w, h = im.size
    cleared = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if near_key(r, g, b):
                px[x, y] = (r, g, b, 0)
                cleared += 1
    out = src_dir / name.replace(".png", "-klar.png")
    im.save(out)
    print(out.name, im.size, "cleared", cleared)
