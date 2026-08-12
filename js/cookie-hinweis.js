/* Acrisum — Cookie-/Datenschutz-Hinweis (kein Tracker-Consent) + optional Reset */
(function () {
  var KEY = "acrisum_cookie_hinweis_ok";
  var CSS_HREF = "css/site.css";

  function ensureCss() {
    if (document.querySelector('link[href*="site.css"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = CSS_HREF;
    document.head.appendChild(l);
  }

  function buildAside() {
    var aside = document.createElement("aside");
    aside.id = "cookie-hinweis";
    aside.className = "cookie-hinweis";
    aside.setAttribute("role", "status");
    aside.setAttribute("aria-live", "polite");
    aside.innerHTML =
      "<p>Keine Tracking-Cookies. Technisch: Hinweis „OK“ und kurz die Sitzung für anonyme Zählung. " +
      '<a href="datenschutz.html#cookies">Datenschutz</a></p>' +
      '<button type="button" class="cookie-hinweis-ok" id="cookie-hinweis-ok">OK</button>';
    document.body.appendChild(aside);
    return aside;
  }

  function resetOk() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function bindOk(el) {
    var btn = document.getElementById("cookie-hinweis-ok");
    if (!btn) return;
    btn.addEventListener("click", function () {
      try {
        localStorage.setItem(KEY, "1");
      } catch (e) {}
      el.hidden = true;
      document.body.classList.remove("has-cookie-hinweis");
    });
  }

  function show(el) {
    el.hidden = false;
    document.body.classList.add("has-cookie-hinweis");
    bindOk(el);
  }

  function hide(el) {
    el.hidden = true;
    document.body.classList.remove("has-cookie-hinweis");
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var wantReset =
      /(?:\?|&)cookies=reset(?:&|$)/.test(location.search) ||
      location.hash === "#cookies-zuruecksetzen";

    var resetBtn = document.getElementById("btn-cookie-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        resetOk();
        var el = document.getElementById("cookie-hinweis") || buildAside();
        show(el);
        if (location.hash.indexOf("cookies") === 1) {
          /* bleiben auf #cookies */
        }
        try {
          history.replaceState(null, "", location.pathname + "#cookies");
        } catch (e) {}
      });
    }

    if (wantReset) {
      resetOk();
      try {
        history.replaceState(null, "", location.pathname + "#cookies");
      } catch (e) {}
    }

    ensureCss();
    var el = document.getElementById("cookie-hinweis");
    if (!el) el = buildAside();

    try {
      if (!wantReset && localStorage.getItem(KEY) === "1") {
        hide(el);
        return;
      }
    } catch (e) {}

    show(el);
  });
})();
