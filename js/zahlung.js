/* Acrisum Zahlung — ohne Büro-Tunnel (Stripe Payment Link, PC kann aus sein).
 * Tagespreis sync: python C:\zzz-winsu-entwickler\scripts\acrisum_stripe_sync_preis.py
 * dann GITHUB-PAGES-BAUEN + git push. Siehe docs/PREIS-KONZEPT.md
 */
window.ACRISUM_ZAHLUNG = {
  anbieter: "stripe",
  checkout_dynamisch: false,
  stripe_link_json: "stripe-payment-link.json",
  stripe_link_live: "https://acrisum.com/stripe-payment-link.json",
  stripe_link_github:
    "https://raw.githubusercontent.com/manibauriedl-cmyk/acrisum-shop/main/stripe-payment-link.json",
  checkout_url: "https://buy.stripe.com/aFaeVcaaT79c5v70mTfIs04",
  danke_url: "https://acrisum.com/danke.html",
  danke_path: "/dashboard/acrisum-shop/danke.html",
  download_url: "download/Acrisum-Launcher-Setup-1.2.13.exe",
  button_bereit: "Jetzt kaufen",
  button_warten: "Bald kaufen",

  paypal_pflicht: true,
  zahlungsmethoden: ["PayPal", "Google Pay", "Karte", "Klarna", "weitere"],
  paypal_stripe_url: "https://dashboard.stripe.com/settings/payment_methods",

  test_code: "2233",
  test_danke_url: "/dashboard/acrisum-shop/danke.html?test=1",

  preis: {
    steigerung_aktiv: true,
    start_datum: "2026-09-18",
    start_cent: 135,
    plus_cent_pro_tag: 25,
    deckel_cent: 1500,
    hinweis_sparen: "Wer früher kauft, zahlt weniger."
  }
};
