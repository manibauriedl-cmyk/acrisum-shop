/* Acrisum — GitHub Pages (statisch, kein :6019) */
window.ACRISUM_ZAHLUNG = {
  anbieter: "stripe",
  checkout_dynamisch: false,
  checkout_url: "https://buy.stripe.com/3cI7sK96Pbps7Df3z5fIs00",
  preis_api: "",
  danke_url: "https://manibauriedl-cmyk.github.io/acrisum-shop/danke.html",
  danke_path: "danke.html",
  download_url: "download/Acrisum-Launcher-Setup-1.2.0.exe",
  button_bereit: "Jetzt kaufen",
  button_warten: "Bald kaufen",
  paypal_pflicht: true,
  zahlungsmethoden: ["PayPal", "Google Pay", "Karte", "Klarna", "weitere"],
  test_code: "2233",
  test_danke_url: "danke.html",
  preis: {
    /* GitHub Pages: fester Payment Link 1,00 € — Anzeige = Abbuchung */
    steigerung_aktiv: false,
    start_datum: "2026-08-04",
    start_cent: 100,
    plus_cent_pro_tag: 10,
    deckel_cent: 500,
    hinweis_sparen: "Einführungspreis 1,00 € über Stripe."
  }
};
