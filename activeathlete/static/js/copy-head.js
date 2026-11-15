/* The sun over a UK city — the same NOAA equations as app/sun.py (tests hold the two together). */
(function (g) {
  var R = Math.PI / 180, D = 180 / Math.PI;
  function jc(ms) { return (ms / 86400000 + 2440587.5 - 2451545.0) / 36525.0; }
  function solar(T) {
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * R) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * R) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * R) * 0.000289;
    var lam = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * R);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * T) * R);
    var decl = Math.asin(Math.sin(eps * R) * Math.sin(lam * R)) * D;
    var y = Math.pow(Math.tan(eps * R / 2), 2);
    var eqt = 4 * D * (y * Math.sin(2 * L0 * R) - 2 * e * Math.sin(M * R) + 4 * e * y * Math.sin(M * R) * Math.cos(2 * L0 * R)
      - 0.5 * y * y * Math.sin(4 * L0 * R) - 1.25 * e * e * Math.sin(2 * M * R));
    return [decl, eqt];
  }
  function elevation(ms, lat, lon) {
    var s = solar(jc(ms)), d = new Date(ms);
    var mins = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    var tst = ((mins + s[1] + 4 * lon) % 1440 + 1440) % 1440, ha = tst / 4 - 180;
    var cz = Math.sin(lat * R) * Math.sin(s[0] * R) + Math.cos(lat * R) * Math.cos(s[0] * R) * Math.cos(ha * R);
    return 90 - Math.acos(Math.max(-1, Math.min(1, cz))) * D;
  }
  function phase(ms, lat, lon) {
    var h = elevation(ms, lat, lon);
    if (h < -6) return "night";
    if (h < 6) { var s = solar(jc(ms)), d = new Date(ms); return (d.getUTCHours() * 60 + d.getUTCMinutes()) < (720 - 4 * lon - s[1]) ? "dawn" : "dusk"; }
    return "day";
  }
  function event(y, m, d, lat, lon, h0, rising) {
    var base = Date.UTC(y, m, d, 12), t = base;
    for (var i = 0; i < 3; i++) {
      var s = solar(jc(t));
      var c = (Math.sin(h0 * R) - Math.sin(lat * R) * Math.sin(s[0] * R)) / (Math.cos(lat * R) * Math.cos(s[0] * R));
      if (c < -1 || c > 1) return null;
      var ha = Math.acos(c) * D, noon = 720 - 4 * lon - s[1];
      t = Date.UTC(y, m, d) + (rising ? noon - 4 * ha : noon + 4 * ha) * 60000;
    }
    return t;
  }
  function day(y, m, d, lat, lon) {
    return { first_light: event(y, m, d, lat, lon, -6, true), sunrise: event(y, m, d, lat, lon, -0.833, true),
      sunset: event(y, m, d, lat, lon, -0.833, false), last_light: event(y, m, d, lat, lon, -6, false) };
  }
  /* the hero arc's height for an elevation — the same scale as app/sky.py: the horizon at 116 of 160 units,
     65 degrees above it 104 units, 60 below it 40 */
  function arcY(e) { return e >= 0 ? 116 - Math.min(e, 65) / 65 * 104 : 116 + Math.min(-e, 60) / 60 * 40; }
  g.AASun = { elevation: elevation, phase: phase, day: day, arcY: arcY };
  if (typeof module !== "undefined") module.exports = g.AASun;
})(typeof window !== "undefined" ? window : globalThis);

var AA_CITIES = {"London": [51.5074, -0.1278], "Birmingham": [52.4862, -1.8904], "Manchester": [53.4808, -2.2426], "Leeds": [53.8008, -1.5491], "Liverpool": [53.4084, -2.9916], "Newcastle": [54.9783, -1.6178], "Nottingham": [52.9548, -1.1581], "Bristol": [51.4545, -2.5879], "Brighton": [50.8225, -0.1372], "Cardiff": [51.4816, -3.1791], "Edinburgh": [55.9533, -3.1883], "Glasgow": [55.8642, -4.2518], "Aberdeen": [57.1497, -2.0943], "Belfast": [54.5973, -5.9301]};
/* The preview copy's first script, in <head> before anything is drawn. tools/static_copy.py writes it after sun.js
   and the cities (AA_CITIES), as one file. A static page cannot know the time it is opened at, so this sets the light
   for now (as the store's server does per request), and on the home page starts the hero photograph for the light
   outside — not the one that was outside when the copy was built. */
(function () {
  var r = document.documentElement;
  r.classList.add("js-copy");
  function ck(k) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
    try { return m ? decodeURIComponent(m[1]) : ""; } catch (e) { return ""; }
  }
  var city = ck("aa_city"); if (!AA_CITIES[city]) city = "London";
  var ov = ck("aa_light"); if (ov !== "day" && ov !== "night") ov = "auto";
  var c = AA_CITIES[city], ph = AASun.phase(Date.now(), c[0], c[1]);
  r.dataset.phase = ph; r.dataset.override = ov;
  r.dataset.theme = ov !== "auto" ? ov : (ph === "day" ? "day" : "night");
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = r.dataset.theme === "night" ? "#0B0B0A" : "#E8E6E2";
  if (r.dataset.copyPage !== "home") return;
  var H = r.dataset.base + "static/hero/" + ph;
  [["(min-width: 721px)", H + "-1920.webp", H + "-1280.webp 1280w, " + H + "-1920.webp 1920w, " + H + "-2880.webp 2880w"],
   ["(max-width: 720px)", H + "-tall.webp", ""]].forEach(function (x) {
    var l = document.createElement("link");
    l.rel = "preload"; l.as = "image"; l.href = x[1]; l.media = x[0]; l.setAttribute("fetchpriority", "high");
    if (x[2]) { l.setAttribute("imagesrcset", x[2]); l.setAttribute("imagesizes", "100vw"); }
    document.head.appendChild(l);
  });
  /* the photograph for now, switched on the moment the parser reaches it */
  function promote() {
    var pic = document.querySelector('#scene picture[data-phase="' + ph + '"]'), img = pic && pic.querySelector("img");
    if (!img) return false;
    Array.prototype.forEach.call(pic.querySelectorAll("[data-srcset]"), function (el) { el.srcset = el.dataset.srcset; });
    if (img.dataset.src) img.src = img.dataset.src;
    img.alt = img.dataset.alt || ""; img.setAttribute("fetchpriority", "high");
    pic.classList.add("on");
    return true;
  }
  var mo = new MutationObserver(function () { if (promote()) mo.disconnect(); });
  mo.observe(r, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", function () { mo.disconnect(); promote(); });
})();
