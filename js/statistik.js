/* Acrisum — anonymer Seitenaufruf (1× pro Sitzung/Seite), kein Tracking-Cookie */
(function () {
  function apiWurzel() {
    var z = window.ACRISUM_ZAHLUNG || {};
    if (z.api_base) return String(z.api_base).replace(/\/$/, "");
    if (location.port === "6019" || /127\.0\.0\.1|localhost/i.test(location.hostname)) {
      return location.origin;
    }
    return "http://127.0.0.1:6019";
  }

  function istLokal() {
    return location.port === "6019" || /127\.0\.0\.1|localhost/i.test(location.hostname);
  }

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

    fetch(apiWurzel() + "/api/acrisum-downloads", {
      method: "POST",
      credentials: istLokal() ? "same-origin" : "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typ: "seite", seite: seite }),
    }).catch(function () {});
  });
})();
