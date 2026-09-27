/* Acrisum — Seitenaufruf nur an Cloud-Worker (Setup/Download bleiben dort).
   Öffentliche Aufrufe zählt GitHub Pages Traffic (Server, ohne Büro-PC). */
(function () {
  function seitenName() {
    var el = document.body && document.body.getAttribute("data-seite");
    if (el) return String(el).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    var p = (location.pathname || "").split("/").pop() || "index";
    p = p.replace(/\.html?$/i, "") || "index";
    return p.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "index";
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var api = window.ACRISUM_API;
    if (!api) return;
    var seite = seitenName();
    var start = api.apiBaseLaden ? api.apiBaseLaden() : Promise.resolve();
    start.then(function (base) {
      if (!base || !/\.workers\.dev$/i.test(String(base))) return;
      var body = JSON.stringify({ typ: "seite", seite: seite });
      var url = String(base).replace(/\/$/, "") + "/api/acrisum-downloads";
      if (navigator.sendBeacon) {
        try {
          navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
          return;
        } catch (e) {}
      }
      api.zaehlen({ typ: "seite", seite: seite });
    });
  });
})();
