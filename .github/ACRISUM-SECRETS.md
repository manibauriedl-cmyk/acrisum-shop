# Acrisum — GitHub Secrets (Cloud-Betrieb)

Repository: `manibauriedl-cmyk/acrisum-shop` → Settings → Secrets and variables → Actions

| Secret | Pflicht | Inhalt |
|--------|---------|--------|
| `STRIPE_SECRET_KEY` | ja | `sk_live_…` wie `D:\winsu\projekte\winsu-vermarktung\zahlung\stripe.env` |
| `CLOUDFLARE_API_TOKEN` | Zähler immer an | Cloudflare Dashboard → API Tokens → Workers KV + deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Zähler immer an | Cloudflare Dashboard → Account ID (rechts) |

Workflow: **Actions → Acrisum Cloud-Betrieb** (täglich 00:10 UTC + manuell „Run workflow“).

Optional (Mail aus Cloud, falls später ergänzt): `ACRISUM_SMTP_USER`, `ACRISUM_SMTP_PASSWORD`.
