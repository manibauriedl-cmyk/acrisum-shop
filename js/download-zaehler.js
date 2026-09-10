(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function api() {
    return window.ACRISUM_API || null;
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
    var a = api();
    if (!a) return;
    var start = a.apiBaseLaden ? a.apiBaseLaden() : Promise.resolve(a.wurzel());
    start.then(function (base) {
      return fetch(base + "/api/acrisum-downloads", {
        credentials: a.istLokal() ? "same-origin" : "omit",
      });
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.ok) setText(d.setup_clicks, d.testcode_clicks);
      })
      .catch(function () {});
  }

  ready(function () {
    laden();
    var btn = document.getElementById("btn-download");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var apiObj = api();
      if (!apiObj) return;
      apiObj.zaehleSetup("setup-btn").then(function (d) {
        if (d && d.ok) setText(d.setup_clicks, d.testcode_clicks);
      });
    });
  });
})();
