# Acrisum — GitHub Secrets (Cloud-Betrieb)

Repository: `manibauriedl-cmyk/acrisum-shop` → Settings → Secrets and variables → Actions

| Secret | Pflicht | Inhalt |
|--------|---------|--------|
| `STRIPE_SECRET_KEY` | ja | `sk_live_…` wie `D:\winsu\projekte\winsu-vermarktung\zahlung\stripe.env` |
| `ACRISUM_GITHUB_TRAFFIC_PAT` | Aufrufe im Report | **Gleicher** `gh`-Token wie beim Stripe-Secret (`repo`-Scope) — GitHub erlaubt Traffic **nicht** mit dem Standard-Actions-Token |
| `CLOUDFLARE_API_TOKEN` | Setup/Download-Zähler | Cloudflare Dashboard → API Tokens → Workers KV + deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Setup/Download-Zähler | Cloudflare Dashboard → Account ID (rechts) |

Workflow: **Actions → Acrisum Cloud-Betrieb** (täglich 00:10 UTC + manuell „Run workflow“).

Optional (Mail aus Cloud, falls später ergänzt): `ACRISUM_SMTP_USER`, `ACRISUM_SMTP_PASSWORD`.
