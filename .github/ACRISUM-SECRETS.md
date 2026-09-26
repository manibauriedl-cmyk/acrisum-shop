# Acrisum — GitHub Secrets (Cloud-Betrieb)

Repository: `manibauriedl-cmyk/acrisum-shop` → Settings → Secrets and variables → Actions

| Secret | Pflicht | Inhalt |
|--------|---------|--------|
| `STRIPE_SECRET_KEY` | ja | `sk_live_…` wie `D:\winsu\projekte\winsu-vermarktung\zahlung\stripe.env` |

Workflow: **Actions → Acrisum Cloud-Betrieb** (täglich 00:10 UTC + manuell „Run workflow“).

Optional (Mail aus Cloud, falls später ergänzt): `ACRISUM_SMTP_USER`, `ACRISUM_SMTP_PASSWORD`.
