/* Nur PC-Vorschau :6019/dashboard/acrisum-shop — nicht auf acrisum.com */
(function () {
  var path = String(location.pathname || "");
  if (path.indexOf("/dashboard/acrisum-shop") < 0) return;

  var style = document.createElement("style");
  style.textContent =
    ".intern-verwaltung-leiste{position:sticky;top:0;z-index:9999;background:#152a42;color:#e7ecf3;" +
    "padding:0.4rem 1rem;font-size:0.84rem;font-family:Segoe UI,system-ui,sans-serif;" +
    "display:flex;flex-wrap:wrap;gap:0.65rem 1.25rem;align-items:center;border-bottom:2px solid #3d8bfd}" +
    ".intern-verwaltung-leiste a{color:#9ecfff;font-weight:700;text-decoration:none}" +
    ".intern-verwaltung-leiste a:hover{text-decoration:underline}" +
    ".intern-verwaltung-leiste .iv-hint{color:#8b9cb3;font-size:0.75rem}";
  document.head.appendChild(style);

  var bar = document.createElement("div");
  bar.className = "intern-verwaltung-leiste";
  bar.setAttribute("role", "navigation");
  bar.innerHTML =
    '<a href="http://127.0.0.1:6023/dashboard/winsu-vermarktung/homepage-verwaltung.html">Verwaltung Homepage</a>' +
    '<a href="http://127.0.0.1:6023/">Dev-Dashboard</a>' +
    '<span class="iv-hint">PC-Vorschau · Live: <a href="https://acrisum.com/" target="_blank" rel="noopener">acrisum.com</a></span>';

  if (document.body.firstChild) {
    document.body.insertBefore(bar, document.body.firstChild);
  } else {
    document.body.appendChild(bar);
  }
})();
