/* Acrisum — gemeinsame API-Hilfe für Zähler (:6019 oder api_base in zahlung.js) */
(function () {
  function wurzel() {
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
    return fetch(wurzel() + "/api/acrisum-downloads", {
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
  }

  window.ACRISUM_API = {
    wurzel: wurzel,
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
})();
