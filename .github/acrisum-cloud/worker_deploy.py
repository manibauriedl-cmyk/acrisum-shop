"""Cloudflare Worker acrisum-zaehler — Deploy + KV + zaehler-api.json (Cloud, ohne Büro-PC)."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKER = ROOT / "cloudflare-worker"
KV_META = WORKER / "acrisum-kv-id.json"
WRANGLER = WORKER / "wrangler.toml"
ZAEHLER_JSON = ROOT / "zaehler-api.json"
_LOCAL_ENV = Path(r"D:\winsu\projekte\winsu-vermarktung\zaehler\cloudflare.env")
_LOCAL_DL = Path(r"C:\zzz-winsu-entwickler\data\acrisum_downloads.json")
_LOCAL_CFG = Path(r"C:\zzz-winsu-entwickler\data\acrisum_zaehler_config.json")


def _env_laden() -> tuple[str, str]:
    token = (os.environ.get("CLOUDFLARE_API_TOKEN") or "").strip()
    account = (os.environ.get("CLOUDFLARE_ACCOUNT_ID") or "").strip()
    if token and account:
        return token, account
    if _LOCAL_ENV.is_file():
        for line in _LOCAL_ENV.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("CLOUDFLARE_API_TOKEN="):
                token = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("CLOUDFLARE_ACCOUNT_ID="):
                account = line.split("=", 1)[1].strip().strip('"').strip("'")
    return token, account


def _run(cmd: list[str], *, cwd: Path, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    e = {**os.environ, **(env or {})}
    return subprocess.run(
        cmd,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=300,
        env=e,
    )


def _kv_id_lesen() -> str:
    if KV_META.is_file():
        try:
            d = json.loads(KV_META.read_text(encoding="utf-8"))
            kid = str(d.get("id") or "").strip()
            if re.fullmatch(r"[a-f0-9]{32}", kid):
                return kid
        except (OSError, json.JSONDecodeError):
            pass
    return ""


def _kv_id_speichern(kv_id: str) -> None:
    KV_META.write_text(
        json.dumps({"id": kv_id, "stand": datetime.now().isoformat(timespec="seconds")}, indent=2)
        + "\n",
        encoding="utf-8",
    )


def _wrangler_toml_kv(kv_id: str) -> None:
    text = WRANGLER.read_text(encoding="utf-8")
    neu, n = re.subn(r'id = "[a-f0-9]{32}"', f'id = "{kv_id}"', text, count=1)
    if n == 0:
        neu = text.replace(
            'id = "00000000000000000000000000000000"',
            f'id = "{kv_id}"',
        )
    WRANGLER.write_text(neu, encoding="utf-8")


def _namespace_erstellen(token: str, account: str) -> str:
    kid = _kv_id_lesen()
    if kid:
        return kid
    r = _run(
        ["npx", "wrangler@3", "kv", "namespace", "create", "ACRISUM_STATS"],
        cwd=WORKER,
        env={
            "CLOUDFLARE_API_TOKEN": token,
            "CLOUDFLARE_ACCOUNT_ID": account,
        },
    )
    out = (r.stdout or "") + (r.stderr or "")
    m = re.search(r'id\s*=\s*"([a-f0-9]{32})"', out) or re.search(r"([a-f0-9]{32})", out)
    if not m:
        raise RuntimeError(f"KV-Namespace fehlgeschlagen: {out[-500:]}")
    kid = m.group(1)
    _kv_id_speichern(kid)
    _wrangler_toml_kv(kid)
    return kid


def _deploy(token: str, account: str) -> str:
    _namespace_erstellen(token, account)
    r = _run(
        ["npx", "wrangler@3", "deploy"],
        cwd=WORKER,
        env={
            "CLOUDFLARE_API_TOKEN": token,
            "CLOUDFLARE_ACCOUNT_ID": account,
        },
    )
    out = (r.stdout or "") + (r.stderr or "")
    if r.returncode != 0:
        raise RuntimeError(f"wrangler deploy: {out[-800:]}")
    m = re.search(r"https://[a-zA-Z0-9.-]+\.workers\.dev", out)
    if not m:
        m = re.search(r"https://acrisum-zaehler\.[a-zA-Z0-9.-]+\.workers\.dev", out)
    url = (m.group(0) if m else "https://acrisum-zaehler.workers.dev").rstrip("/")
    return url


def _migrate_kv(token: str, account: str, kv_id: str) -> None:
    if not _LOCAL_DL.is_file():
        return
    try:
        data = json.loads(_LOCAL_DL.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    if not isinstance(data, dict):
        return
    payload = {
        "setup_clicks": int(data.get("setup_clicks") or 0),
        "testcode_clicks": int(data.get("testcode_clicks") or 0),
        "aufrufe_gesamt": int(data.get("aufrufe_gesamt") or 0),
        "seitenaufrufe": dict(data.get("seitenaufrufe") or {}),
        "ereignisse": list(data.get("ereignisse") or [])[:300],
        "stand": data.get("stand") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "hinweis": "Import aus Büro-Zähler (Migration Cloud)",
    }
    tmp = WORKER / "_migrate_data.json"
    tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    r = _run(
        [
            "npx",
            "wrangler@3",
            "kv",
            "key",
            "put",
            "data",
            "--namespace-id",
            kv_id,
            "--path",
            str(tmp),
        ],
        cwd=WORKER,
        env={
            "CLOUDFLARE_API_TOKEN": token,
            "CLOUDFLARE_ACCOUNT_ID": account,
        },
    )
    try:
        tmp.unlink()
    except OSError:
        pass
    if r.returncode != 0:
        raise RuntimeError(f"KV-Migration: {(r.stdout or '') + (r.stderr or '')[-400:]}")


def _zaehler_json_schreiben(worker_url: str) -> None:
    jetzt = datetime.now()
    ZAEHLER_JSON.write_text(
        json.dumps(
            {
                "api_base": worker_url,
                "stand": jetzt.strftime("%Y-%m-%d %H:%M:%S"),
                "stand_de": jetzt.strftime("Stand %d.%m.%Y, %H:%M"),
                "hinweis": "Cloud-Zähler (Worker, ohne Büro-PC).",
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )


def _lokal_cfg(worker_url: str) -> None:
    if not _LOCAL_CFG.parent.is_dir():
        return
    _LOCAL_CFG.write_text(
        json.dumps(
            {
                "cloud_api_base": worker_url,
                "stand": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "hinweis": "Worker live — acrisum.com zählt ohne Tunnel.",
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )


def deploy() -> dict:
    token, account = _env_laden()
    if not token or not account:
        return {
            "ok": False,
            "fehler": "cloudflare_credentials_fehlen",
            "hinweis": (
                "Datei anlegen: D:\\winsu\\projekte\\winsu-vermarktung\\zaehler\\cloudflare.env "
                "(Vorlage cloudflare.env.example). Dann ACRISUM-CLOUDFLARE-EINMAL.bat."
            ),
        }
    _run(["npm", "install", "wrangler@3", "--no-save"], cwd=WORKER)
    kv_id = _namespace_erstellen(token, account)
    url = _deploy(token, account)
    try:
        _migrate_kv(token, account, kv_id)
    except RuntimeError as exc:
        return {"ok": True, "worker_url": url, "warnung": str(exc), "kv_id": kv_id}
    _zaehler_json_schreiben(url)
    _lokal_cfg(url)
    return {"ok": True, "worker_url": url, "kv_id": kv_id}


def main() -> int:
    try:
        out = deploy()
    except RuntimeError as exc:
        print(json.dumps({"ok": False, "fehler": str(exc)}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
