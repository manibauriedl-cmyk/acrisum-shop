(function () {
  var LIST = "bewertungen.json";
  var MAIL = "manibauriedl@gmail.com";

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function laden() {
    var box = document.getElementById("stimmen-liste");
    if (!box) return;
    fetch(LIST + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { stimmen: [] }; })
      .then(function (d) {
        var list = (d && d.stimmen) || [];
        if (!list.length) {
          box.innerHTML =
            '<p class="stimmen-leer">Noch keine veröffentlichten Stimmen — Bekannte können unten kurz schreiben. ' +
            "Nach kurzer Prüfung erscheint der Text hier.</p>";
          return;
        }
        box.innerHTML = list.map(function (s) {
          var name = esc(s.name || "Anonym");
          var text = esc(s.text || "");
          var meta = esc([s.ort, s.datum].filter(Boolean).join(" · "));
          return (
            '<blockquote class="stimme">' +
            "<p>" + text + "</p>" +
            '<footer><strong>' + name + "</strong>" +
            (meta ? '<span class="stimme-meta"> · ' + meta + "</span>" : "") +
            "</footer></blockquote>"
          );
        }).join("");
      })
      .catch(function () {
        box.innerHTML =
          '<p class="stimmen-leer">Stimmen konnten gerade nicht geladen werden.</p>';
      });
  }

  function absenden(ev) {
    if (ev) ev.preventDefault();
    var nameEl = document.getElementById("stimme-name");
    var textEl = document.getElementById("stimme-text");
    var ortEl = document.getElementById("stimme-ort");
    var name = (nameEl && nameEl.value || "").trim();
    var text = (textEl && textEl.value || "").trim();
    var ort = (ortEl && ortEl.value || "").trim();
    var status = document.getElementById("stimme-status");
    if (name.length < 2) {
      if (status) status.textContent = "Bitte einen Namen angeben.";
      if (nameEl) nameEl.focus();
      return;
    }
    if (text.length < 12) {
      if (status) status.textContent = "Bitte etwas ausführlicher schreiben (mind. ein Satz).";
      if (textEl) textEl.focus();
      return;
    }
    var body =
      "Name: " + name + "\n" +
      (ort ? "Ort/Bezug: " + ort + "\n" : "") +
      "\nBewertung:\n" + text + "\n";
    var href =
      "mailto:" + MAIL +
      "?subject=" + encodeURIComponent("Acrisum Bewertung — " + name) +
      "&body=" + encodeURIComponent(body);
    if (status) {
      status.textContent =
        "Mailprogramm öffnet sich — Absenden, dann erscheint die Stimme nach Prüfung auf der Seite.";
    }
    window.location.href = href;
  }

  document.addEventListener("DOMContentLoaded", function () {
    laden();
    var form = document.getElementById("stimme-form");
    if (form) form.addEventListener("submit", absenden);
  });
})();
