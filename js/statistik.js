/* Acrisum — anonymer Seitenaufruf (1× pro Sitzung/Seite), kein Tracking-Cookie */
(function () {
  var API = "/api/acrisum-downloads";

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
    var seite = seitenName();
    var key = "acrisum_aufruf_" + seite;
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch (e) {}

    fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typ: "seite", seite: seite }),
    }).catch(function () {});
  });
})();
