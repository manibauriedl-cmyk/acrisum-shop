(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function euro(cent) {
    return (cent / 100).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR"
    });
  }

  function startDate(cfg) {
    if (cfg.start_datum) {
      var p = String(cfg.start_datum).split("-");
      return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function daysSince(start) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var ms = today.getTime() - start.getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }

  function tagespreis(cfg) {
    var start = startDate(cfg);
    var tage = daysSince(start);
    var cent = Number(cfg.start_cent || 130) + tage * Number(cfg.plus_cent_pro_tag || 50);
    if (cfg.deckel_cent != null && cfg.deckel_cent !== "") {
      cent = Math.min(cent, Number(cfg.deckel_cent));
    }
    return { cent: cent, tage: tage, plus: Number(cfg.plus_cent_pro_tag || 10) };
  }

  function preisAnzeigen(root, labelPreis, t) {
    var chip = document.getElementById("preis-chip");
    var preisCfg = root.preis || {};
    if (chip) {
      chip.innerHTML =
        "heute <strong>" + labelPreis + "</strong> · Checkout";
    }
    var steigerBox = document.getElementById("preis-steigerung");
    if (!steigerBox) return;
    if (root.checkout_fest_hinweis && root.checkout_dynamisch === false) {
      steigerBox.hidden = false;
      steigerBox.textContent = String(root.checkout_fest_hinweis);
      return;
    }
    if (preisCfg.steigerung_aktiv || (t && t.plus)) {
      steigerBox.hidden = false;
      steigerBox.textContent =
        (preisCfg.hinweis_sparen || "Wer früher kauft, zahlt weniger.") +
        " Täglich +" +
        (t ? t.plus : Number(preisCfg.plus_cent_pro_tag || 50)) +
        " Cent" +
        (preisCfg.deckel_cent
          ? ", max. " + euro(Number(preisCfg.deckel_cent))
          : "") +
        ".";
    }
  }

  function testCodeZeile(root) {
    var row = document.getElementById("test-code-row");
    if (!row) return;
    var erwartet = String(root.test_code || "").trim();
    row.hidden = !erwartet;
  }

  function kaufenStarten(root, btn, note) {
    var api = String(root.checkout_api || "/api/acrisum-checkout").trim();
    var fallback = (root.checkout_url || "").trim();
    var dynamisch = root.checkout_dynamisch !== false;

    function zuFallback(grund) {
      if (!dynamisch) {
        if (note) {
          note.textContent =
            "Zahlungslink gerade nicht erreichbar. Bitte später erneut versuchen oder Testcode nutzen.";
        }
        window.alert(
          "Stripe-Zahlungslink nicht verfügbar.\n\n" + (grund || "") +
            "\n\nBitte später erneut oder Mail an manibauriedl@gmail.com."
        );
      } else {
        if (note) {
          note.textContent =
            "Kauf gerade nicht möglich: " +
            (grund || "kein Checkout") +
            ". Bitte STRIPE_SECRET_KEY in zahlung/stripe.env setzen und Dashboard :6019 neu starten.";
        }
        window.alert(
          "Dynamischer Stripe-Checkout nicht bereit.\n\n" +
            (grund || "") +
            "\n\nSecret-Key in:\nD:\\winsu\\projekte\\winsu-vermarktung\\zahlung\\stripe.env"
        );
      }
      btn.removeAttribute("aria-busy");
      btn.classList.remove("is-loading");
    }

    if (!dynamisch) {
      if (fallback && /^https:\/\//i.test(fallback)) {
        window.location.assign(fallback);
      } else {
        zuFallback("kein Link und dynamisch aus");
      }
      return;
    }

    btn.setAttribute("aria-busy", "true");
    btn.classList.add("is-loading");
    if (note) {
      note.textContent = "Checkout wird vorbereitet (Tagespreis)…";
    }

    var payload = {
      origin: window.location.origin,
      danke_path: String(root.danke_path || "/dashboard/acrisum-shop/danke.html")
    };

    fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin"
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { okHttp: r.ok, j: j };
        });
      })
      .then(function (pack) {
        var j = pack.j || {};
        if (j.ok && j.url) {
          window.location.assign(j.url);
          return;
        }
        var hilfe = j.hilfe || j.error || "unbekannt";
        zuFallback(hilfe);
      })
      .catch(function (err) {
        zuFallback(String((err && err.message) || err || "Netzwerk"));
      });
  }

  ready(function () {
    var root = window.ACRISUM_ZAHLUNG || {};
    testCodeZeile(root);
    var btn = document.getElementById("cta-kaufen");
    var note = document.getElementById("kaufen");
    var preisCfg = root.preis || {};

    var labelPreis = "1,30 €";
    var tLokal = null;
    if (
      root.checkout_dynamisch === false &&
      root.checkout_fest_cent != null &&
      root.checkout_fest_cent !== ""
    ) {
      labelPreis = euro(Number(root.checkout_fest_cent));
      preisAnzeigen(root, labelPreis, null);
    } else if (preisCfg.steigerung_aktiv) {
      tLokal = tagespreis(preisCfg);
      labelPreis = euro(tLokal.cent);
      preisAnzeigen(root, labelPreis, tLokal);
    } else {
      var chip = document.getElementById("preis-chip");
      if (chip) {
        chip.innerHTML = "einmalig <strong>1,30 €</strong> · Download";
      }
    }

    /* Server-Preis nachziehen (gleiche Formel / Quelle preis.json) */
    var preisApi = String(root.preis_api || "/api/acrisum-preis").trim();
    if (preisApi) {
      fetch(preisApi, { credentials: "same-origin", headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          if (!j || !j.ok || j.cent == null) return;
          labelPreis = euro(Number(j.cent));
          preisAnzeigen(root, labelPreis, {
            plus: Number(j.plus_cent_pro_tag || 50),
            tage: j.tage
          });
          if (btn && !btn.getAttribute("aria-disabled")) {
            btn.textContent = (root.button_bereit || "Jetzt kaufen") + " — " + labelPreis;
          }
        })
        .catch(function () {
          /* lokal berechneter Preis bleibt */
        });
    }

    if (!btn) return;
    var methoden = root.zahlungsmethoden;
    var zahlarten = document.getElementById("zahlarten");
    if (zahlarten && methoden && methoden.length) {
      zahlarten.innerHTML =
        "Zahlen mit <strong>" +
        String(methoden[0]) +
        "</strong>" +
        (methoden.length > 1
          ? ", " +
            methoden
              .slice(1)
              .map(function (m) {
                return String(m);
              })
              .join(", ")
          : "") +
        ".";
    }

    var dynamisch = root.checkout_dynamisch !== false;
    var fallback = (root.checkout_url || "").trim();
    var hatKauf = dynamisch || (fallback && /^https:\/\//i.test(fallback));

    if (hatKauf) {
      btn.href = "#kaufen";
      btn.removeAttribute("aria-disabled");
      btn.removeAttribute("title");
      btn.textContent = (root.button_bereit || "Jetzt kaufen") + " — " + labelPreis;
      btn.removeAttribute("target");
      btn.rel = "noopener noreferrer";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (btn.getAttribute("aria-busy") === "true") return;
        kaufenStarten(root, btn, note);
      });
      if (note) {
        note.innerHTML = dynamisch
          ? 'Zahlung über Stripe (PayPal, Karte u. a.) — Betrag = heutiger Tagespreis. Es gelten <a href="agb.html">AGB</a> und <a href="widerruf.html">Widerrufsbelehrung</a>. Nach dem Bezahlen kommst du zur Download-Seite.'
          : 'Zahlung über Stripe (PayPal, Karte u. a.) im gleichen Fenster. Es gelten <a href="agb.html">AGB</a> und <a href="widerruf.html">Widerrufsbelehrung</a>. Nach dem Bezahlen kommst du automatisch zur Download-Seite.';
      }
    } else {
      btn.href = "#kaufen";
      btn.setAttribute("aria-disabled", "true");
      btn.title = "Checkout noch nicht eingerichtet";
      btn.textContent = (root.button_warten || "Bald kaufen") + " — " + labelPreis;
    }

    /* Testcode: Zahlung umgehen → Dankeseite/Download (später entfernen). */
    var testInput = document.getElementById("test-code");
    var testGo = document.getElementById("test-code-go");
    var erwartet = String(root.test_code || "").trim();
    if (testInput && erwartet) {
      function testSpinner(an) {
        if (!testGo) return;
        var lab = testGo.querySelector(".test-code-go-label");
        var spin = testGo.querySelector(".test-code-spinner");
        testGo.disabled = !!an;
        testGo.setAttribute("aria-busy", an ? "true" : "false");
        if (lab) lab.hidden = !!an;
        if (spin) spin.hidden = !an;
      }
      function testFreigabe() {
        var eingabe = String(testInput.value || "").trim();
        if (eingabe === erwartet) {
          var ziel = String(root.test_danke_url || "danke.html").trim() || "danke.html";
          testSpinner(true);
          window.setTimeout(function () {
            window.location.assign(ziel);
          }, 280);
          return;
        }
        if (eingabe) {
          testSpinner(false);
          testInput.classList.add("test-code-falsch");
          testInput.setAttribute("title", "Code falsch");
        }
      }
      testInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          testFreigabe();
        }
      });
      testInput.addEventListener("input", function () {
        testInput.classList.remove("test-code-falsch");
        testInput.removeAttribute("title");
        if (String(testInput.value || "").trim() === erwartet) {
          testFreigabe();
        }
      });
      if (testGo) {
        testGo.addEventListener("click", function (e) {
          e.preventDefault();
          testFreigabe();
        });
      }
    }
  });
})();
