/* Acrisum — GitHub Pages (dynamisch via Tunnel :6030, Link = Fallback) */
window.ACRISUM_ZAHLUNG = {
  anbieter: "stripe",
  checkout_dynamisch: true,
  checkout_url: "https://buy.stripe.com/4gM3cudn59hkcXz4D9fIs0j",
  preis_api: "",
  api_base: "https://lucas-emacs-cet-van.trycloudflare.com",
  danke_url: "https://acrisum.com/danke.html",
  danke_path: "danke.html",
  download_url: "download/Acrisum-Launcher-Setup-1.2.13.exe",
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
