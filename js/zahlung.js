/* Acrisum — GitHub Pages (Stripe Payment Link, kein Büro-Tunnel) */
window.ACRISUM_ZAHLUNG = {
  anbieter: "stripe",
  checkout_dynamisch: false,
  stripe_link_json: "stripe-payment-link.json",
  stripe_link_live: "https://acrisum.com/stripe-payment-link.json",
  stripe_link_github: "https://raw.githubusercontent.com/manibauriedl-cmyk/acrisum-shop/main/stripe-payment-link.json",
  checkout_url: "https://buy.stripe.com/3cI9ASdn51OSaPr2v1fIs0m",
  danke_url: "https://acrisum.com/danke.html",
  danke_path: "danke.html",
  download_url: "download/Acrisum-Launcher-Setup-1.2.16.exe",
  button_bereit: "Jetzt kaufen",
  button_warten: "Bald kaufen",
  paypal_pflicht: true,
  zahlungsmethoden: ["PayPal", "Google Pay", "Karte", "Klarna", "weitere"],
  test_code: "2233",
  test_danke_url: "danke.html?test=1",
  preis: {
    steigerung_aktiv: true,
    start_datum: "2026-09-18",
    start_cent: 135,
    plus_cent_pro_tag: 25,
    deckel_cent: 1500,
    hinweis_sparen: "Wer früher kauft, zahlt weniger."
  }
};
