# Acrisum — GitHub Secrets (Cloud-Betrieb)

Repository: `manibauriedl-cmyk/acrisum-shop` → Settings → Secrets and variables → Actions

| Secret | Pflicht | Inhalt |
|--------|---------|--------|
| `STRIPE_SECRET_KEY` | ja | `sk_live_…` wie `D:\winsu\projekte\winsu-vermarktung\zahlung\stripe.env` |
| `ACRISUM_GITHUB_TRAFFIC_PAT` | Aufrufe im Report | **Gleicher** `gh`-Token wie beim Stripe-Secret (`repo`-Scope) — GitHub erlaubt Traffic **nicht** mit dem Standard-Actions-Token |
| `CLOUDFLARE_API_TOKEN` | **Zähler ohne PC** | Wird von `ACRISUM-CLOUDFLARE-EINMAL.bat` gesetzt (aus `zaehler/cloudflare.env`) |
| `CLOUDFLARE_ACCOUNT_ID` | **Zähler ohne PC** | dieselbe BAT |

**Einmal auf dem PC:** `C:\zzz-winsu-entwickler\scripts\ACRISUM-CLOUDFLARE-EINMAL.bat`  
(Vorlage: `D:\winsu\projekte\winsu-vermarktung\zaehler\cloudflare.env.example`)

Workflow: **Actions → Acrisum Cloud-Betrieb** (täglich 00:10 UTC, alle 6 h Traffic, bei Push).

Optional (Mail aus Cloud, falls später ergänzt): `ACRISUM_SMTP_USER`, `ACRISUM_SMTP_PASSWORD`.
