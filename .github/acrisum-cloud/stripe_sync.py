"""Stripe Payment Link — Tagespreis (GitHub Actions, Repo-Root)."""
from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PREIS_FILE = REPO / "preis.json"
META_FILE = REPO / "stripe-payment-link.json"
DANKE_URL = "https://acrisum.com/danke.html"
PRODUCT_ID = "prod_V1c6hdAxNVcL53"


def _ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context()


def _laden_preis() -> dict:
    data = json.loads(PREIS_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("preis.json ungültig")
    return data


def _parse_start(iso: str) -> date:
    parts = str(iso or "").strip().split("-")
    if len(parts) != 3:
        return date.today()
    return date(int(parts[0]), int(parts[1]), int(parts[2]))


def tagespreis(heute: date | None = None) -> dict:
    cfg = _laden_preis()
    heute = heute or date.today()
    start = _parse_start(str(cfg.get("start_datum") or ""))
    tage = max(0, (heute - start).days)
    start_cent = int(cfg.get("start_cent") or 150)
    plus = int(cfg.get("plus_cent_pro_tag") or 25)
    deckel = cfg.get("deckel_cent")
    cent = start_cent + tage * plus
    if deckel is not None and str(deckel).strip() != "":
        cent = min(cent, int(deckel))
    if not cfg.get("steigerung_aktiv", True):
        cent = start_cent
    euro = f"{cent / 100:.2f}".replace(".", ",")
    return {"ok": True, "cent": cent, "euro": euro, "waehrung": str(cfg.get("waehrung") or "eur")}


def _stripe(method: str, path: str, form: dict[str, str] | None = None) -> dict:
    key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
    if not key:
        return {"ok": False, "error": "STRIPE_SECRET_KEY fehlt (GitHub Secret)"}
    body = urllib.parse.urlencode(form or {}).encode("utf-8") if form else None
    req = urllib.request.Request(
        f"https://api.stripe.com/v1{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
            return {"ok": True, "data": json.loads(resp.read().decode("utf-8"))}
    except urllib.error.HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")
        try:
            msg = json.loads(err).get("error", {}).get("message", err[:200])
        except json.JSONDecodeError:
            msg = err[:200]
        return {"ok": False, "error": msg, "code": exc.code}


def _link_cent(pl_id: str) -> int | None:
    pack = _stripe("GET", f"/payment_links/{pl_id}/line_items")
    if not pack.get("ok"):
        return None
    items = (pack.get("data") or {}).get("data") or []
    if not items:
        return None
    ua = (items[0].get("price") or {}).get("unit_amount")
    return int(ua) if ua is not None else None


def _find_link_for_cent(cent: int) -> dict | None:
    starting_after = ""
    while True:
        q = "?limit=20&active=true"
        if starting_after:
            q += f"&starting_after={starting_after}"
        pack = _stripe("GET", f"/payment_links{q}")
        if not pack.get("ok"):
            return None
        data = pack["data"]
        for item in data.get("data") or []:
            pl_id = item.get("id") or ""
            if _link_cent(pl_id) == cent:
                ac = item.get("after_completion") or {}
                redirect = (ac.get("redirect") or {}).get("url") or ""
                if redirect == DANKE_URL or not redirect:
                    return item
        if not data.get("has_more"):
            break
        rows = data.get("data") or []
        if not rows:
            break
        starting_after = rows[-1].get("id") or ""
    return None


def _create_price(cent: int) -> dict:
    cfg = _laden_preis()
    return _stripe(
        "POST",
        "/prices",
        {
            "currency": str(cfg.get("waehrung") or "eur"),
            "unit_amount": str(cent),
            "product": PRODUCT_ID,
            "metadata[acrisum_cent]": str(cent),
            "metadata[acrisum_datum]": date.today().isoformat(),
        },
    )


def _create_payment_link(price_id: str) -> dict:
    return _stripe(
        "POST",
        "/payment_links",
        {
            "line_items[0][price]": price_id,
            "line_items[0][quantity]": "1",
            "payment_method_types[0]": "card",
            "payment_method_types[1]": "paypal",
            "payment_method_types[2]": "klarna",
            "payment_method_types[3]": "eps",
            "after_completion[type]": "redirect",
            "after_completion[redirect][url]": DANKE_URL,
            "metadata[acrisum_tagespreis]": "1",
        },
    )


def _link_aktiv(url: str) -> bool:
    pack = _stripe("GET", "/payment_links?limit=30&active=true")
    for item in (pack.get("data") or {}).get("data") or []:
        if (item.get("url") or "") == url:
            return True
    return False


def sync_tagespreis(heute: date | None = None) -> dict:
    preis = tagespreis(heute=heute)
    cent = int(preis["cent"])

    if META_FILE.is_file():
        try:
            meta = json.loads(META_FILE.read_text(encoding="utf-8"))
            if (
                int(meta.get("cent", -1)) == cent
                and meta.get("checkout_url")
                and _link_aktiv(str(meta["checkout_url"]))
            ):
                return {"ok": True, "unchanged": True, **meta}
        except (OSError, json.JSONDecodeError, ValueError):
            pass

    pl = _find_link_for_cent(cent)
    if pl:
        url = (pl.get("url") or "").strip()
    else:
        cp = _create_price(cent)
        if not cp.get("ok"):
            return cp
        price_id = (cp.get("data") or {}).get("id") or ""
        cl = _create_payment_link(price_id)
        if not cl.get("ok"):
            return cl
        url = ((cl.get("data") or {}).get("url") or "").strip()

    meta = {
        "ok": True,
        "cent": cent,
        "euro": preis["euro"],
        "checkout_url": url,
        "danke_url": DANKE_URL,
        "datum": date.today().isoformat(),
        "hinweis": "Tagespreis — Cloud sync (GitHub Actions)",
    }
    META_FILE.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return meta


def patch_zahlung_js(meta: dict) -> None:
    zahlung = REPO / "js" / "zahlung.js"
    if not zahlung.is_file():
        return
    text = zahlung.read_text(encoding="utf-8")
    url = str(meta.get("checkout_url") or "")
    cent = int(meta.get("cent") or 0)
    import re

    text, n1 = re.subn(
        r'checkout_url:\s*"[^"]*"',
        f'checkout_url: "{url}"',
        text,
        count=1,
    )
    text, n2 = re.subn(
        r"checkout_cent:\s*\d+",
        f"checkout_cent: {cent}",
        text,
        count=1,
    )
    if n1 or n2:
        zahlung.write_text(text, encoding="utf-8")


def main() -> int:
    result = sync_tagespreis()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result.get("ok"):
        return 1
    if not result.get("unchanged"):
        patch_zahlung_js(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
