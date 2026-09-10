/* Acrisum — Zähler-API (zaehler-api.json → HTTPS-Tunnel, sonst :6019) */
(function () {
  var _wurzel = null;
  var _ready = null;

  function fallbackWurzel() {
    var z = window.ACRISUM_ZAHLUNG || {};
    if (z.api_base) return String(z.api_base).replace(/\/$/, "");
    if (location.port === "6019" || /127\.0\.0\.1|localhost/i.test(location.hostname)) {
      return location.origin;
    }
    return "http://127.0.0.1:6019";
  }

  function wurzelSync() {
    return _wurzel || fallbackWurzel();
  }

  function apiBaseLaden() {
    if (_ready) return _ready;
    _ready = fetch("zaehler-api.json", { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        var ausJson = d && d.api_base ? String(d.api_base).replace(/\/$/, "") : "";
        _wurzel = ausJson || fallbackWurzel();
        return _wurzel;
      })
      .catch(function () {
        _wurzel = fallbackWurzel();
        return _wurzel;
      });
    return _ready;
  }

  function istLokal() {
    return location.port === "6019" || /127\.0\.0\.1|localhost/i.test(location.hostname);
  }

  function istTestcode() {
    try {
      if (sessionStorage.getItem("acrisum_testcode") === "1") return true;
    } catch (e) {}
    return /(?:^|[?&])test=1(?:&|$)/.test(String(location.search || ""));
  }

  function testcodeMerken() {
    try {
      sessionStorage.setItem("acrisum_testcode", "1");
    } catch (e) {}
  }

  function zaehlen(payload) {
    return apiBaseLaden().then(function (base) {
      return fetch(base + "/api/acrisum-downloads", {
        method: "POST",
        credentials: istLokal() ? "same-origin" : "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      })
        .then(function (r) {
          return r.json();
        })
        .catch(function () {
          return null;
        });
    });
  }

  window.ACRISUM_API = {
    wurzel: wurzelSync,
    apiBaseLaden: apiBaseLaden,
    istLokal: istLokal,
    istTestcode: istTestcode,
    testcodeMerken: testcodeMerken,
    zaehlen: zaehlen,
    zaehleTestcode: function (quelle) {
      testcodeMerken();
      return zaehlen({
        typ: "testcode",
        quelle: quelle || "testcode",
        testcode: true,
      });
    },
    zaehleSetup: function (quelle) {
      if (istTestcode()) {
        return zaehlen({
          typ: "testcode",
          quelle: quelle || "testcode",
          testcode: true,
        });
      }
      return zaehlen({
        typ: "setup",
        quelle: quelle || "setup-btn",
        testcode: false,
      });
    },
  };

  apiBaseLaden();
})();
