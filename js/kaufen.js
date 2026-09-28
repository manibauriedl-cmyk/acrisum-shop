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

  /* Relative /api/...-Pfade gegen aktuelle Tunnel-Basis auflösen
     (zaehler-api.json wird vom Wächter bei jeder neuen Tunnel-URL gepusht). */
  function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) return Promise.resolve(path);
    var api = window.ACRISUM_API;
    if (api && api.apiBaseLaden) {
      return api.apiBaseLaden().then(function (base) {
        return base + path;
      });
    }
    return Promise.resolve(path);
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
    var cent =
      Number(cfg.start_cent || 100) + tage * Number(cfg.plus_cent_pro_tag || 5);
    if (cfg.deckel_cent != null && cfg.deckel_cent !== "") {
      cent = Math.min(cent, Number(cfg.deckel_cent));
    }
    return { cent: cent, tage: tage, plus: Number(cfg.plus_cent_pro_tag || 5) };
  }

  /** Eine Quelle: shop/preis.json (Spiegel im Deploy). Kein zweites Preis-Objekt in zahlung.js. */
  function preisCfgLaden(root) {
    var path = String((root && root.preis_json) || "preis.json").trim();
    if (!path) {
      return Promise.resolve((root && root.preis) || {});
    }
    return fetch(path, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("preis.json");
        return r.json();
      })
      .catch(function () {
        return (root && root.preis) || {};
      });
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
        (t ? t.plus : Number(preisCfg.plus_cent_pro_tag || 5)) +
        " Cent" +
        (preisCfg.deckel_cent
          ? ", max. " + euro(Number(preisCfg.deckel_cent))
          : "") +
        ".";
    }
    var faq = document.getElementById("faq-preis");
    if (faq && (preisCfg.steigerung_aktiv || (t && t.plus))) {
      var plus = t ? t.plus : Number(preisCfg.plus_cent_pro_tag || 5);
      var deckel = preisCfg.deckel_cent
        ? euro(Number(preisCfg.deckel_cent))
        : "";
      faq.innerHTML =
        "Heute <strong>" +
        labelPreis +
        "</strong>. Wer früher kauft, zahlt weniger: täglich +" +
        plus +
        " Cent" +
        (deckel ? ", maximal <strong>" + deckel + "</strong>" : "") +
        ". Der angezeigte Tagespreis gilt beim Checkout.";
    }
  }

  function testCodeZeile(root) {
    var row = document.getElementById("test-code-row");
    if (!row) return;
    var erwartet = String(root.test_code || "").trim();
    row.hidden = !erwartet;
  }

  function stripeLinkPfad(root) {
    return String(root.stripe_link_json || "stripe-payment-link.json").trim();
  }

  function stripeLinkLaden(root) {
    var urls = [];
    var pfad = stripeLinkPfad(root);
    if (pfad) urls.push(pfad);
    var live = String(root.stripe_link_live || "https://acrisum.com/stripe-payment-link.json").trim();
    if (live) urls.push(live);
    var gh = String(
      root.stripe_link_github ||
        "https://raw.githubusercontent.com/manibauriedl-cmyk/acrisum-shop/main/stripe-payment-link.json"
    ).trim();
    if (gh) urls.push(gh);

    function versuch(i) {
      if (i >= urls.length) return Promise.resolve(null);
      return fetch(urls[i], { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) return versuch(i + 1);
          return r.json().then(function (j) {
            if (j && j.ok && j.checkout_url) return j;
            return versuch(i + 1);
          });
        })
        .catch(function () {
          return versuch(i + 1);
        });
    }
    return versuch(0);
  }

  /** Kauf/Stripe: neues Fenster (Shop bleibt offen). Testcode: neues Fenster → Shop bleibt offen. */
  function checkoutNeuesFenster(url) {
    var neu = window.open(url, "_blank", "noopener,noreferrer");
    if (!neu) {
      window.location.assign(url);
    }
  }

  function testcodeNeuesFenster(url) {
    var neu = window.open(url, "_blank", "noopener,noreferrer");
    if (!neu) {
      window.location.assign(url);
    }
  }

  /** GitHub Pages: Stripe-URL vorab ins href — Klick = neues Fenster, Shop bleibt offen. */
  function checkoutLinkVorbereiten(root, btn, note, preisCfg) {
    if (!btn || root.checkout_dynamisch !== false) return;
    var fallback = String(root.checkout_url || "").trim();
    var lokal = tagespreis(preisCfg || root.preis || {});

    function linkOk(url) {
      return url && /^https:\/\//i.test(url);
    }

    stripeLinkLaden(root).then(function (j) {
      var url = ((j && j.checkout_url) || fallback || "").trim();
      if (j && j.ok && j.cent != null && Number(j.cent) !== lokal.cent) {
        btn.href = "#kaufen";
        if (note) {
          note.textContent =
            "Stripe noch nicht auf " +
            euro(lokal.cent) +
            " — bitte kurz warten und erneut klicken (neues Fenster, Shop bleibt offen).";
        }
        return;
      }
      if (!linkOk(url)) return;
      btn.href = url;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      root._checkout_href = url;
    });
  }

  function buttonPreisAktualisieren(btn, root, labelPreis) {
    if (!btn) return;
    var label = (root.button_bereit || "Jetzt kaufen") + " — <strong>" + labelPreis + "</strong>";
    if (!btn.getAttribute("aria-disabled")) {
      btn.innerHTML = label;
    } else {
      btn.innerHTML =
        (root.button_warten || "Bald kaufen") + " — <strong>" + labelPreis + "</strong>";
    }
  }

  function kaufenStarten(root, btn, note) {
    var api = String(root.checkout_api || "/api/acrisum-checkout").trim();
    var fallback = (root.checkout_url || "").trim();
    var dynamisch = root.checkout_dynamisch !== false;

    function zuFallback(grund) {
      /* Dynamischer Weg fehlgeschlagen → fester Payment-Link statt Sackgasse */
      if (dynamisch && fallback && /^https:\/\//i.test(fallback)) {
        if (note) {
          note.textContent =
            "Tagespreis-Server kurz nicht erreichbar — weiter zum Zahlungslink …";
        }
        checkoutNeuesFenster(fallback);
        return;
      }
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
      var lokal = tagespreis(root.preis || {});
      btn.setAttribute("aria-busy", "true");
      btn.classList.add("is-loading");
      if (note) {
        note.textContent = "Checkout wird vorbereitet …";
      }
      stripeLinkLaden(root).then(function (j) {
        var url = ((j && j.checkout_url) || fallback || "").trim();
        if (j && j.ok && j.cent != null && Number(j.cent) !== lokal.cent) {
          zuFallback(
            "Zahlungslink noch nicht auf heutigen Preis (" +
              euro(lokal.cent) +
              ") aktualisiert — bitte später erneut oder Mail an manibauriedl@gmail.com."
          );
          return;
        }
        if (url && /^https:\/\//i.test(url)) {
          checkoutNeuesFenster(url);
          return;
        }
        zuFallback("kein Stripe-Link");
      });
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

    apiUrl(api).then(function (apiFull) {
      fetch(apiFull, {
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
            checkoutNeuesFenster(j.url);
            return;
          }
          var hilfe = j.hilfe || j.error || "unbekannt";
          zuFallback(hilfe);
        })
        .catch(function (err) {
          zuFallback(String((err && err.message) || err || "Netzwerk"));
        });
    });
  }

  function kaufButtonSofortAktiv(root, btn) {
    if (!btn) return;
    var url = String((root && root.checkout_url) || "").trim();
    if (!/^https:\/\//i.test(url)) return;
    btn.href = url;
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.removeAttribute("aria-disabled");
    btn.removeAttribute("title");
  }

  ready(function () {
    var root = window.ACRISUM_ZAHLUNG || {};
    testCodeZeile(root);
    var btn = document.getElementById("cta-kaufen");
    var note = document.getElementById("kaufen");
    kaufButtonSofortAktiv(root, btn);

    preisCfgLaden(root).then(function (preisCfg) {
      root.preis = preisCfg;
      startKaufenMitPreis(root, btn, note, preisCfg);
    });
  });

  function startKaufenMitPreis(root, btn, note, preisCfg) {
    var labelPreis = "…";
    var tLokal = null;
    if (preisCfg.steigerung_aktiv) {
      tLokal = tagespreis(preisCfg);
      labelPreis = euro(tLokal.cent);
      preisAnzeigen(root, labelPreis, tLokal);
    } else {
      var chip = document.getElementById("preis-chip");
      if (chip) {
        chip.innerHTML = "einmalig <strong>" + labelPreis + "</strong> · Download";
      }
    }

    /* :6019 — Server-Preis (gleiche Formel, gleiche preis.json-Quelle) */
    var preisApi = String(root.preis_api || "/api/acrisum-preis").trim();
    if (preisApi) {
      apiUrl(preisApi).then(function (preisFull) {
        fetch(preisFull, { credentials: "same-origin", headers: { Accept: "application/json" } })
          .then(function (r) {
            return r.json();
          })
          .then(function (j) {
            if (!j || !j.ok || j.cent == null) return;
            labelPreis = euro(Number(j.cent));
            preisAnzeigen(root, labelPreis, {
              plus: Number(j.plus_cent_pro_tag || preisCfg.plus_cent_pro_tag || 5),
              tage: j.tage
            });
            buttonPreisAktualisieren(btn, root, labelPreis);
          })
          .catch(function () {
            /* lokal berechneter Preis bleibt */
          });
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
      buttonPreisAktualisieren(btn, root, labelPreis);
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      checkoutLinkVorbereiten(root, btn, note, preisCfg);
      btn.addEventListener("click", function (e) {
        var href = String(btn.getAttribute("href") || "");
        if (/^https:\/\//i.test(href)) {
          return;
        }
        e.preventDefault();
        if (btn.getAttribute("aria-busy") === "true") return;
        kaufenStarten(root, btn, note);
      });
      if (note) {
        note.innerHTML = dynamisch
          ? 'Zahlung über Stripe (PayPal, Karte u. a.) — Betrag = heutiger Tagespreis. Es gelten <a href="agb.html">AGB</a> und <a href="widerruf.html">Widerrufsbelehrung</a>. Nach dem Bezahlen kommst du zur Download-Seite.'
          : 'Zahlung über Stripe (PayPal, Karte u. a.) in neuem Fenster — Shop bleibt offen. Es gelten <a href="agb.html">AGB</a> und <a href="widerruf.html">Widerrufsbelehrung</a>. Nach dem Bezahlen kommst du automatisch zur Download-Seite.';
      }
    } else {
      btn.href = "#kaufen";
      btn.setAttribute("aria-disabled", "true");
      btn.title = "Checkout noch nicht eingerichtet";
      buttonPreisAktualisieren(btn, root, labelPreis);
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
          if (!/[?&]test=1(?:&|$)/.test(ziel)) {
            ziel += (ziel.indexOf("?") >= 0 ? "&" : "?") + "test=1";
          }
          if (window.ACRISUM_API && window.ACRISUM_API.zaehleTestcode) {
            window.ACRISUM_API.zaehleTestcode("test-code-feld");
          }
          testSpinner(true);
          window.setTimeout(function () {
            testSpinner(false);
            testcodeNeuesFenster(ziel);
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
  }
})();
