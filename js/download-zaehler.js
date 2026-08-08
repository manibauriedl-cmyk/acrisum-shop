(function () {
  var API = "/api/acrisum-downloads";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function setText(n) {
    var el = document.getElementById("dl-zaehler");
    if (!el) return;
    var nInt = Number(n) || 0;
    el.hidden = false;
    el.textContent =
      nInt === 1
        ? "1 Download bisher"
        : nInt.toLocaleString("de-DE") + " Downloads bisher";
  }

  function laden() {
    fetch(API, { credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.ok) setText(d.setup_clicks);
      })
      .catch(function () {});
  }

  function zaehlen(quelle) {
    return fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quelle: quelle || "danke" }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.ok) setText(d.setup_clicks);
        return d;
      })
      .catch(function () {
        return null;
      });
  }

  ready(function () {
    laden();
    var a = document.getElementById("btn-download");
    if (!a) return;
    a.addEventListener("click", function () {
      zaehlen("setup-btn");
    });
  });
})();
