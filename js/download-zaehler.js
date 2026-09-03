(function () {
  function apiWurzel() {
    var z = window.ACRISUM_ZAHLUNG || {};
    if (z.api_base) return String(z.api_base).replace(/\/$/, "");
    if (location.port === "6019" || /127\.0\.0\.1|localhost/i.test(location.hostname)) {
      return location.origin;
    }
    return "http://127.0.0.1:6019";
  }

  function apiDownloads() {
    return apiWurzel() + "/api/acrisum-downloads";
  }

  function istLokal() {
    return location.port === "6019" || /127\.0\.0\.1|localhost/i.test(location.hostname);
  }

  function istTestcode() {
    return /(?:^|[?&])test=1(?:&|$)/.test(String(location.search || ""));
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function setText(setupN, testN) {
    var el = document.getElementById("dl-zaehler");
    if (!el) return;
    var nInt = Number(setupN) || 0;
    var tInt = Number(testN) || 0;
    el.hidden = false;
    var setupTxt =
      nInt === 1
        ? "1 Download bisher"
        : nInt.toLocaleString("de-DE") + " Downloads bisher";
    el.textContent =
      tInt > 0
        ? setupTxt + " · Testcode: " + tInt.toLocaleString("de-DE")
        : setupTxt;
  }

  function laden() {
    fetch(apiDownloads(), {
      credentials: istLokal() ? "same-origin" : "omit",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.ok) setText(d.setup_clicks, d.testcode_clicks);
      })
      .catch(function () {});
  }

  function zaehlen(quelle) {
    var test = istTestcode();
    return fetch(apiDownloads(), {
      method: "POST",
      credentials: istLokal() ? "same-origin" : "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typ: test ? "testcode" : "setup",
        quelle: test ? "testcode" : quelle || "setup-btn",
        testcode: test,
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.ok) setText(d.setup_clicks, d.testcode_clicks);
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
