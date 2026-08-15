(function () {
  var JSON_FALLBACK = "bewertungen.json";
  var HONEYPOT = "stimme_website";

  function apiBase() {
    var z = window.ACRISUM_ZAHLUNG || {};
    if (z.api_base) return String(z.api_base).replace(/\/$/, "");
    if (location.port === "6019" || /127\.0\.0\.1|localhost/i.test(location.hostname)) {
      return location.origin;
    }
    /* Live acrisum.com: Versuch LAN-Dashboard (nur wenn PC erreichbar) */
    return "http://127.0.0.1:6019";
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function renderListe(list) {
    var box = document.getElementById("stimmen-liste");
    if (!box) return;
    if (!list || !list.length) {
      box.innerHTML =
        '<p class="stimmen-leer">Noch keine Stimmen — schreiben Sie unten, dann erscheinen sie für alle Besucher ' +
        "(nach Speichern / Live-Push).</p>";
      return;
    }
    box.innerHTML = list.map(function (s) {
      var name = esc(s.name || "Anonym");
      var text = esc(s.text || "");
      var meta = esc([s.ort, s.datum || s.datum_anzeige].filter(Boolean).join(" · "));
      return (
        '<blockquote class="stimme">' +
        "<p>" + text + "</p>" +
        "<footer><strong>" + name + "</strong>" +
        (meta ? '<span class="stimme-meta"> · ' + meta + "</span>" : "") +
        "</footer></blockquote>"
      );
    }).join("");
  }

  function ladenApi() {
    return fetch(apiBase() + "/api/acrisum-stimmen", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error("api");
        renderListe(d.stimmen || []);
        return true;
      });
  }

  function ladenJson() {
    return fetch(JSON_FALLBACK + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { stimmen: [] }; })
      .then(function (d) {
        renderListe((d && d.stimmen) || []);
      });
  }

  function laden() {
    ladenApi().catch(function () { return ladenJson(); });
  }

  function absenden(ev) {
    if (ev) ev.preventDefault();
    var hp = document.getElementById(HONEYPOT);
    if (hp && hp.value) return;
    var nameEl = document.getElementById("stimme-name");
    var textEl = document.getElementById("stimme-text");
    var ortEl = document.getElementById("stimme-ort");
    var status = document.getElementById("stimme-status");
    var name = (nameEl && nameEl.value || "").trim();
    var text = (textEl && textEl.value || "").trim();
    var ort = (ortEl && ortEl.value || "").trim();
    if (name.length < 2) {
      if (status) status.textContent = "Bitte einen Namen angeben.";
      return;
    }
    if (text.length < 12) {
      if (status) status.textContent = "Bitte etwas ausführlicher schreiben (mind. ein Satz).";
      return;
    }
    if (status) status.textContent = "Speichert …";
    fetch(apiBase() + "/api/acrisum-stimmen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, text: text, ort: ort, von: "shop" }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d || !res.d.ok) {
          throw new Error((res.d && res.d.fehler) || "Speichern fehlgeschlagen");
        }
        if (status) {
          status.textContent =
            "Gespeichert — sichtbar für Besucher. Chef: unter Homepage verwalten „Live-Push“, damit acrisum.com nachzieht.";
        }
        if (textEl) textEl.value = "";
        laden();
      })
      .catch(function (e) {
        if (status) {
          status.textContent =
            (e && e.message ? e.message + " — " : "") +
            "Server (:6019) nicht erreichbar. Bitte später erneut oder Chef unter Homepage verwalten eintragen.";
        }
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    laden();
    var form = document.getElementById("stimme-form");
    if (form) form.addEventListener("submit", absenden);
  });
})();
