/* Active Athlete — the preview copy's stand-in for the store's server.

   middlewaresy.com/activeathlete/ is a static copy of the store, served from GitHub's worldwide network so a client
   feels the real speed of browsing. A static copy has no server, so this script answers, in the browser, the calls the
   store's own script makes — /api/bag, /bag/add, /bag/add-kit, /bag/set, /api/search, /api/sky, /api/quote,
   /api/notify — with the answers the server would give, and fills the pages whose content depends on the shopper: the
   bag, search, checkout, payment, the bank check and the confirmation. Each part follows the Python it stands in for
   (app/cart.py, ukdates.py, postcode.py, money.py, catalogue.search, sky.py, orders.validate, payments.test_charge,
   and the templates partials/bag.html, arc.html, pay.html, order.html); tests/copy_parity.py holds the two together.

   The bag lives in this browser (localStorage). Nothing leaves it: no order is placed, no card is charged, no email
   is sent, and every page that would do one of those says so. Only the copy loads this file (tools/static_copy.py
   writes it into each page); the store itself never runs it. */
(function (g) {
  "use strict";
  var HAS_DOM = typeof document !== "undefined";
  var root = HAS_DOM ? document.documentElement : null;
  var BASE = (root && root.dataset.base) || "/";
  var S = {};          // the shop's settings, inline in every page (#copy-settings)
  var D = null;        // the catalogue: static/copy-data.json, fetched the first time it is needed
  var MAX_LINES = 30, MAX_QTY = 10, HOLD = 30 * 60;

  /* ------------------------------------------------------------ money (app/money.py) */
  function gbp(p, whole) {
    var neg = p < 0; p = Math.abs(Math.trunc(p));
    var pounds = String(Math.floor(p / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ","), pence = p % 100;
    var s = whole && pence === 0 ? "£" + pounds : "£" + pounds + "." + (pence < 10 ? "0" : "") + pence;
    return neg ? "−" + s : s;
  }
  function vatIncluded(gross, rate) {          // the inclusive fraction rate / (100 + rate), rounded half-up
    var r = Math.round((rate == null ? 20 : rate) * 1000), num = gross * r, den = 100000 + r;
    return Math.floor((2 * num + den) / (2 * den));
  }
  function esc(s) {                             // as Jinja's autoescape (markupsafe) writes it
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#34;", "'": "&#39;" }[c]; });
  }
  function toInt(v) { var s = String(v == null ? "" : v); return /^\s*[+-]?\d+\s*$/.test(s) ? parseInt(s, 10) : NaN; }

  /* ------------------------------------------------------------ the UK calendar (app/ukdates.py) */
  var DAY = 86400000;
  var WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dn(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / DAY); }          // a calendar day as a number
  function ymd(n) { var t = new Date(n * DAY); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; }
  function wd(n) { return (new Date(n * DAY).getUTCDay() + 6) % 7; }                // Monday is 0, as in Python
  function fromIso(s) { var a = String(s).split("-"); return dn(+a[0], +a[1], +a[2]); }
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var gg = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - gg + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), x = h + l - 7 * m + 114;
    return dn(y, Math.floor(x / 31), x % 31 + 1);
  }
  function firstMonday(y, m) { var d = dn(y, m, 1); return d + (7 - wd(d)) % 7; }
  function lastMonday(y, m) { var d = dn(y + (m === 12 ? 1 : 0), m % 12 + 1, 1) - 1; return d - wd(d); }
  function bankHolidays(y) {                    // England and Wales
    var out = {}, ny = dn(y, 1, 1), e = easter(y), xmas = dn(y, 12, 25), boxing = dn(y, 12, 26);
    out[ny + ({ 5: 2, 6: 1 }[wd(ny)] || 0)] = "New Year's Day";
    out[e - 2] = "Good Friday"; out[e + 1] = "Easter Monday";
    out[firstMonday(y, 5)] = "Early May bank holiday"; out[lastMonday(y, 5)] = "Spring bank holiday";
    out[lastMonday(y, 8)] = "Summer bank holiday";
    if (wd(xmas) === 5) { out[dn(y, 12, 27)] = "Christmas Day (substitute day)"; out[dn(y, 12, 28)] = "Boxing Day (substitute day)"; }
    else if (wd(xmas) === 6) { out[dn(y, 12, 27)] = "Christmas Day (substitute day)"; out[boxing] = "Boxing Day"; }
    else { out[xmas] = "Christmas Day"; if (wd(boxing) === 5) out[dn(y, 12, 28)] = "Boxing Day (substitute day)"; else out[boxing] = "Boxing Day"; }
    return out;
  }
  function Cal(closed) {
    var self = this; this.extra = {}; this.cache = {};
    (closed || []).forEach(function (s) { self.extra[fromIso(s)] = 1; });
  }
  Cal.prototype.holiday = function (n) {
    if (this.extra[n]) return "Closed";
    var y = ymd(n)[0]; if (!this.cache[y]) this.cache[y] = bankHolidays(y);
    return this.cache[y][n] || null;
  };
  Cal.prototype.working = function (n) { return wd(n) < 5 && !this.holiday(n); };
  Cal.prototype.nextWorking = function (n, k) {
    if (k == null) k = 1;
    if (k === 0) { while (!this.working(n)) n++; return n; }
    while (k) { n++; if (this.working(n)) k--; }
    return n;
  };
  var LF = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "numeric",
    day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }) : null;
  var HMF = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : null;
  function london(ms) {                          // the UK day and the seconds since its midnight, at an instant
    var p = {}; LF.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return { day: dn(+p.year, +p.month, +p.day), secs: (+p.hour % 24) * 3600 + (+p.minute) * 60 + (+p.second), ms: ((ms % 1000) + 1000) % 1000 };
  }
  function hm(ms) { return ms == null ? "—" : HMF.format(new Date(ms)); }
  /* the day an order placed now leaves, and, if that is today, the instant the cut-off passes */
  Cal.prototype.dispatch = function (nowMs, cutoff) {
    var L = london(nowMs), c = String(cutoff || "13:00").split(":"), cut = (+c[0]) * 3600 + (+c[1]) * 60;
    if (this.working(L.day) && L.secs * 1000 + L.ms < cut * 1000) return [L.day, nowMs - L.secs * 1000 - L.ms + cut * 1000];
    return [this.nextWorking(L.day), null];
  };
  Cal.prototype.window = function (nowMs, cutoff, lo, hi, extra) {
    var sent = this.dispatch(nowMs, cutoff)[0]; extra = extra || 0;
    return [this.nextWorking(sent, lo + extra), this.nextWorking(sent, hi + extra)];
  };
  function fmtDay(n, today) {
    if (today != null) { if (n === today) return "today"; if (n === today + 1) return "tomorrow"; }
    var a = ymd(n); return WD[wd(n)] + " " + a[2] + " " + MON[a[1] - 1];
  }
  function fmtWindow(a, b, today) {
    if (a === b) return fmtDay(a, today);
    var A = ymd(a), B = ymd(b);
    if (A[1] === B[1] && today == null) return WD[wd(a)] + " " + A[2] + " – " + WD[wd(b)] + " " + B[2] + " " + MON[B[1] - 1];
    return fmtDay(a, today) + " – " + fmtDay(b, today);
  }
  function fmtWhen(ms) {                         // "14 Nov 2026, 18:05", as the |when filter
    var L = london(ms), a = ymd(L.day); return a[2] + " " + MON[a[1] - 1] + " " + a[0] + ", " + hm(ms);
  }

  /* ------------------------------------------------------------ UK postcodes (app/postcode.py) */
  var PC_RX = /^(GIR0AA|[A-PR-UWYZ](?:[0-9]{1,2}|[A-HK-Y][0-9]{1,2}|[0-9][A-HJKPSTUW]|[A-HK-Y][0-9][ABEHMNPRVWXY])[0-9][ABD-HJLNP-UW-Z]{2})$/;
  var NOT_UK_VAT = { GY: "Guernsey", JE: "Jersey" };
  var REMOTE_AREAS = { HS: 1, ZE: 1, KW: 1, IV: 1, BT: 1, IM: 1 }, REMOTE_DISTRICTS = { KA27: 1, KA28: 1, TR21: 1, TR22: 1, TR23: 1, TR24: 1, TR25: 1 };
  (function () {
    var add = function (p, a, b) { for (var n = a; n < b; n++) REMOTE_DISTRICTS[p + n] = 1; };
    add("PA", 20, 50); add("PA", 60, 79); add("PH", 17, 27); add("PH", 30, 45); REMOTE_DISTRICTS.PH49 = 1; REMOTE_DISTRICTS.PH50 = 1;
  })();
  function pcNormalise(raw) {
    var s = String(raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return PC_RX.test(s) ? s.slice(0, -3) + " " + s.slice(-3) : null;
  }
  function pcArea(pc) { var m = /^[A-Z]+/.exec(String(pc).replace(/ /g, "")); return m ? m[0] : ""; }
  function pcRemote(pc) { return !!(REMOTE_AREAS[pcArea(pc)] || REMOTE_DISTRICTS[String(pc).split(" ")[0]]); }

  /* ------------------------------------------------------------ the copy's own paths (tools/static_copy.py: link) */
  function u(path) {
    if (BASE === "/") return path;              // the store's own paths (how the tests compare the two)
    var m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(path), p = m[1], q = m[2] || "", h = m[3] || "";
    if (/^\/(static|media)\//.test(p)) return BASE + p.slice(1) + q + h;
    var pm = /^\/p\/([a-z0-9-]+)$/.exec(p), cm = /^\?colour=([a-z0-9-]+)$/.exec(q);
    if (pm && cm) return BASE + "p/" + pm[1] + "/" + cm[1] + "/" + h;
    return BASE + (p === "/" ? "" : p.slice(1) + "/") + q + h;
  }

  /* ------------------------------------------------------------ the bag, kept in this browser */
  var mem = {};
  function sget(k) { try { return g.localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } }
  function sset(k, v) {
    try { if (v == null) g.localStorage.removeItem(k); else g.localStorage.setItem(k, v); }
    catch (e) { if (v == null) delete mem[k]; else mem[k] = v; }
  }
  var BAG = "aa_copy_bag", ORDER = "aa_copy_order", PAYERR = "aa_copy_pay_error";
  function readBag() {
    var m = new Map();
    try {
      (JSON.parse(sget(BAG) || "[]") || []).forEach(function (x) {
        var v = toInt(x[0]), q = toInt(x[1]);
        if (v > 0 && q > 0 && m.size < MAX_LINES) m.set(v, Math.max(1, Math.min(MAX_QTY, q)));
      });
    } catch (e) {}
    return m;
  }
  function writeBag(m) {
    var a = []; m.forEach(function (q, v) { if (q > 0 && a.length < MAX_LINES) a.push([v, q]); });
    sset(BAG, a.length ? JSON.stringify(a) : null);
  }
  function bagCount() { var n = 0; readBag().forEach(function (q) { n += q; }); return n; }

  /* ------------------------------------------------------------ what the bag costs (app/cart.py) */
  function lines(bag) {
    var out = [];
    bag.forEach(function (qty, vid) {
      var v = D.variants[vid]; if (!v) return;
      var st = v.status === "live" ? v.stock : 0;
      out.push({ variant_id: vid, product_id: v.pid, slug: v.slug, name: v.name, colour: v.colour, size: v.size, sku: v.sku,
        price: v.price, qty: qty, stock: st, image: v.image || "", line_total: v.price * qty, short: Math.max(0, qty - st) });
    });
    return out;
  }
  function checkCode(code, subtotal, today) {
    code = String(code || "").trim();
    if (!code) return [null, null];
    var d = null;
    (D.discounts || []).forEach(function (x) { if (!d && x.code.toLowerCase() === code.toLowerCase()) d = x; });
    if (!d || !d.active) return [null, "“" + code + "” isn’t a valid code."];
    if (d.starts && today < fromIso(d.starts)) return [null, "“" + code + "” starts on " + fmtDay(fromIso(d.starts)) + "."];
    if (d.ends && today > fromIso(d.ends)) return [null, "“" + code + "” has ended."];
    if (d.max_uses && d.uses >= d.max_uses) return [null, "“" + code + "” has been used up."];
    if (subtotal < d.min_spend) return [null, "“" + code + "” needs a spend of " + gbp(d.min_spend, true) + " — add " + gbp(d.min_spend - subtotal) + " more."];
    return [d, null];
  }
  function deliveryOptions(subtotal, pc, nowMs) {
    var cal = new Cal(S.closed_days), extra = pc && pcRemote(pc) ? S.remote_extra_days : 0, today = london(nowMs).day, opts = [];
    var free = !!(S.free_delivery_over && subtotal >= S.free_delivery_over);
    var w = cal.window(nowMs, S.cutoff, S.standard_min, S.standard_max, extra);
    opts.push({ id: "standard", label: S.standard_label, price: free ? 0 : S.standard_price, from: w[0], to: w[1], when: fmtWindow(w[0], w[1], today), free: free });
    if (S.express_on) {
      w = cal.window(nowMs, S.cutoff, S.express_min, S.express_max, extra);
      opts.push({ id: "express", label: S.express_label, price: S.express_price, from: w[0], to: w[1], when: fmtWindow(w[0], w[1], today), free: false });
    }
    return opts;
  }
  function quote(bag, code, method, pc, nowMs) {
    nowMs = nowMs == null ? Date.now() : nowMs;
    var ls = lines(bag), subtotal = 0, count = 0;
    ls.forEach(function (l) { subtotal += l.line_total; count += l.qty; });
    var cc = checkCode(code, subtotal, london(nowMs).day), d = cc[0], discount = 0, freeDelivery = false;
    if (d) {
      if (d.kind === "percent") discount = Math.floor(subtotal * d.value / 100);
      else if (d.kind === "fixed") discount = Math.min(d.value, subtotal);
      else if (d.kind === "free_delivery") freeDelivery = true;
    }
    var opts = deliveryOptions(subtotal - discount, pc, nowMs);
    if (freeDelivery) opts.forEach(function (o) { if (o.id === "standard") { o.price = 0; o.free = true; } });
    var chosen = opts.filter(function (o) { return o.id === method; })[0] || opts[0];
    var total = subtotal - discount + chosen.price;
    return { lines: ls, count: count, subtotal: subtotal, discount: discount, code: d ? d.code : "", code_error: cc[1],
      free_delivery_code: freeDelivery, options: opts, delivery: chosen, total: total, vat: vatIncluded(total, S.vat_rate),
      to_free: S.free_delivery_over ? Math.max(0, S.free_delivery_over - (subtotal - discount)) : 0, free_over: S.free_delivery_over,
      short: ls.filter(function (l) { return l.short; }) };
  }

  /* ------------------------------------------------------------ the bag drawer (templates/partials/bag.html) */
  function drawer(q) {
    var h = '<div class="sheet-head"><h2>Your bag' + (q.count ? " · " + q.count : "") + '</h2><button class="icon-btn" data-close aria-label="Close bag"><svg><use href="#i-close"/></svg></button></div>';
    if (!q.lines.length) return h + '<div class="sheet-body"><div class="bag-empty"><svg><use href="#i-bag"/></svg><p>Your bag is empty.</p><a class="btn" href="' + esc(u("/shop/new")) + '">See what’s new</a></div></div>';
    h += '<div class="sheet-body">';
    if (q.free_over) {
      h += '<div class="freebar">' + (q.to_free > 0 ? "<p>You’re <b>" + gbp(q.to_free) + "</b> away from free UK delivery.</p>" : "<p><b>Free UK delivery</b> on this order.</p>") +
        '<div class="meter"><i style="width: ' + Math.min(100, Math.floor((q.subtotal - q.discount) * 100 / q.free_over)) + '%"></i></div></div>';
    }
    h += '<ul class="bag-lines">';
    q.lines.forEach(function (l) {
      h += '<li class="bag-line" data-line="' + l.variant_id + '" data-q="' + l.qty + '">' +
        (l.image ? '<img src="' + esc(u("/media/p/" + l.image + "-360.webp")) + '" alt="" width="84" height="105">' : "<span></span>") +
        '<div><div class="top"><a class="n" href="' + esc(u("/p/" + l.slug)) + '">' + esc(l.name) + '</a><b class="tnum">' + gbp(l.line_total) + "</b></div>" +
        '<div class="v">' + esc(l.colour) + " · " + esc(l.size) + "</div>" +
        (l.short ? '<div class="short">' + (l.stock ? "Only " + l.stock + " left — reduce to " + l.stock + " to check out." : "Sold out — remove it to check out.") + "</div>" : "") +
        '<div class="qty" role="group" aria-label="Quantity of ' + esc(l.name) + '"><button data-qty="-1" aria-label="One fewer">−</button><output>' + l.qty +
        '</output><button data-qty="1" aria-label="One more" ' + (l.qty >= l.stock ? "disabled" : "") + '>+</button></div><button class="link remove" data-qty="0">Remove</button></div></li>';
    });
    var freeNow = q.free_over && q.subtotal - q.discount >= q.free_over;
    h += '</ul></div><div class="sheet-foot"><div class="sums"><span>Subtotal</span><span>' + gbp(q.subtotal) + "</span><span>Delivery</span><span>" +
      (freeNow ? "Free" : "From " + gbp(S.standard_price)) + '</span><span class="v">Prices include VAT.</span></div>' +
      '<a class="btn wide' + (q.short.length ? " is-off" : "") + '" href="' + esc(u(q.short.length ? "/bag" : "/checkout")) + '">' +
      (q.short.length ? "Update your bag" : "Checkout · " + gbp(q.subtotal)) + "</a>" +
      '<p class="secure"><svg><use href="#i-lock"/></svg>' + (BASE !== "/" ? "Preview copy — nothing is ordered or charged" :
        S.payments === "stripe" ? "Secure checkout with Stripe" : "Test mode — no real payment is taken") + "</p></div>";
    return h;
  }

  /* ------------------------------------------------------------ search (app/catalogue.py: search) */
  function terms(q) {
    var out = [];
    q.toLowerCase().replace(/-/g, " ").split(/\s+/).forEach(function (w) {
      if (w.length < 2) return;
      var base = w.slice(-2) === "es" && w.length > 4 ? w.slice(0, -2) : (w.slice(-1) === "s" && w.length > 3 ? w.slice(0, -1) : w);
      var set = {};
      [w, base].concat(D.synonyms[w] || [], D.synonyms[base] || []).forEach(function (x) { set[x] = 1; });
      out.push(Object.keys(set));
    });
    return out;
  }
  function search(term, limit) {
    var t = terms(String(term || "").trim().slice(0, 60)), scored = [];
    if (!t.length) return [];
    D.products.forEach(function (p) {
      var hay = [p.name, p.subtitle, p.category, p.category_label, p.description, p.colours.join(" ")].join(" ").toLowerCase();
      var nm = p.name.toLowerCase(), hits = 0, nh = 0;
      t.forEach(function (alts) {
        if (alts.some(function (a) { return hay.indexOf(a) >= 0; })) hits++;
        if (alts.some(function (a) { return nm.indexOf(a) >= 0; })) nh++;
      });
      if (hits === t.length) scored.push([-nh, p.position, p]);
    });
    scored.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return scored.slice(0, limit || 24).map(function (x) { return x[2]; });
  }
  function searchApi(q) {
    return search(String(q || "").slice(0, 60), 6).map(function (p) {
      return { name: p.name, url: u("/p/" + p.slug), price: gbp(p.price, true), image: p.cover ? u("/media/p/" + p.cover + "-540.webp") : "", line: p.category_label };
    });
  }

  /* ------------------------------------------------------------ today's arc and light (app/sky.py, app/light.py) */
  function londonMidnight(day) {                 // the instant the UK day starts (23:00 UTC the day before, in summer)
    var a = ymd(day), guess = Date.UTC(a[0], a[1] - 1, a[2]), L = london(guess);
    return guess - (L.day === day ? L.secs : L.secs - 86400) * 1000;
  }
  function pyf(x) { return Number.isInteger(x) ? x.toFixed(1) : String(x); }   // a float as Python prints it
  function rnd(x, n) { var k = Math.pow(10, n); return Math.round(x * k) / k; }
  function arc(day, lat, lon) {
    var m0 = londonMidnight(day), pts = [];
    for (var m = 0; m <= 1440; m += 10) pts.push([m, rnd(g.AASun.arcY(g.AASun.elevation(m0 + m * 60000, lat, lon)), 1)]);
    var d = "M" + pts.map(function (p) { return p[0] + "," + p[1].toFixed(1); }).join("L"), peak = pts[0];
    pts.forEach(function (p) { if (p[1] < peak[1]) peak = p; });
    var ne = -90; for (var k = 600; k <= 840; k += 2) ne = Math.max(ne, g.AASun.elevation(m0 + k * 60000, lat, lon));
    var a = ymd(day), ev = g.AASun.day(a[0], a[1] - 1, a[2], lat, lon);
    var mins = function (t) { return t == null ? null : (t - m0) / 60000; };
    return { d: d, area: d + "L1440,116L0,116Z", peak_x: peak[0], peak_y: peak[1], noon_elev: Math.round(ne),
      sunrise_x: mins(ev.sunrise), sunset_x: mins(ev.sunset), first_x: mins(ev.first_light), last_x: mins(ev.last_light) };
  }
  function lightAt(city, nowMs) {               // what partials/arc.html reads from light.context and sky_context
    var c = S.cities[city] || S.cities.London, L = london(nowMs), a = ymd(L.day), b = ymd(L.day + 1);
    var ev = g.AASun.day(a[0], a[1] - 1, a[2], c[0], c[1]), tm = g.AASun.day(b[0], b[1] - 1, b[2], c[0], c[1]);
    var sr = ev.sunrise, ss = ev.sunset, fl = ev.first_light || sr, ll = ev.last_light || ss;
    var elev = g.AASun.elevation(nowMs, c[0], c[1]), now = rnd(Math.floor(L.secs / 60) / 14.4, 2);
    return { city: city, lat: c[0], lon: c[1], day: L.day, sunrise: hm(sr), sunset: hm(ss),
      times: { dawn: hm(fl) + "–" + hm(sr), day: hm(sr) + "–" + hm(ss), dusk: hm(ss) + "–" + hm(ll), night: hm(ll) + "–" + hm(tm.first_light || tm.sunrise) },
      sun_at: { x: now, y: rnd(g.AASun.arcY(elev) / 160 * 100, 2), state: elev > -0.833 ? "up" : (elev >= -6 ? "edge" : "down") } };
  }
  function arcHTML(a, lc) {
    var s = lc.sun_at;
    return '<div class="sky-arc" id="track" data-lat="' + pyf(lc.lat) + '" data-lon="' + pyf(lc.lon) + '">' +
      '<svg class="arc" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>' +
      '<clipPath id="arc-above"><rect x="0" y="0" width="1440" height="116"/></clipPath><clipPath id="arc-below"><rect x="0" y="116" width="1440" height="44"/></clipPath>' +
      '<linearGradient id="arc-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0C040" stop-opacity="0"/><stop offset="1" stop-color="#F0C040" stop-opacity=".34"/></linearGradient>' +
      '</defs><path class="area" d="' + a.area + '" clip-path="url(#arc-above)" fill="url(#arc-glow)"/><line class="hz" x1="0" y1="116" x2="1440" y2="116"/>' +
      (a.first_x != null && a.sunrise_x != null ? '<line class="edge" x1="' + pyf(rnd(a.first_x, 1)) + '" x2="' + pyf(rnd(a.sunrise_x, 1)) + '" y1="116" y2="116"/>' : "") +
      (a.sunset_x != null && a.last_x != null ? '<line class="edge" x1="' + pyf(rnd(a.sunset_x, 1)) + '" x2="' + pyf(rnd(a.last_x, 1)) + '" y1="116" y2="116"/>' : "") +
      '<path class="curve up" d="' + a.d + '" clip-path="url(#arc-above)"/><path class="curve down" d="' + a.d + '" clip-path="url(#arc-below)"/></svg>' +
      (a.sunrise_x != null ? '<span class="lbl rise" style="--x:' + pyf(rnd(a.sunrise_x / 14.4, 2)) + '">Sunrise <b>' + lc.sunrise + "</b></span>" : "") +
      (a.sunset_x != null ? '<span class="lbl set" style="--x:' + pyf(rnd(a.sunset_x / 14.4, 2)) + '">Sunset <b>' + lc.sunset + "</b></span>" : "") +
      '<span class="lbl peak" style="--x:' + pyf(rnd(a.peak_x / 14.4, 2)) + ";--y:" + pyf(rnd(a.peak_y / 1.6, 2)) + '">Highest · ' + a.noon_elev + "°</span>" +
      '<div class="ticks" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>' +
      '<span class="now-tick" id="now-tick" style="--x:' + pyf(s.x) + '" hidden></span>' +
      '<input type="range" id="scrub" min="0" max="1439" step="1" value="' + Math.round(s.x * 14.4) + '" aria-label="Move the sun through the day — the store changes its light">' +
      '<span class="sun ' + s.state + '" id="sun" style="--x:' + pyf(s.x) + ";--y:" + pyf(s.y) + '"></span></div>';
  }
  function skyApi(city, nowMs) {
    var lc = lightAt(S.cities[city] ? city : "London", nowMs == null ? Date.now() : nowMs);
    return { arc: arcHTML(arc(lc.day, lc.lat, lc.lon), lc), times: lc.times };
  }

  /* ------------------------------------------------------------ checkout and payment rules (app/orders.py, app/payments.py) */
  var EMAIL_RX = /^[^@\s]{1,64}@[^@\s]{1,255}\.[A-Za-z]{2,}$/;
  function validate(form) {
    var errs = {}, f = {}, n = 0;
    ["email", "first_name", "last_name", "line1", "line2", "city", "county", "postcode", "phone", "method", "code"].forEach(function (k) { f[k] = String(form[k] || "").trim(); });
    if (!EMAIL_RX.test(f.email)) errs.email = "Enter an email address like name@example.co.uk.";
    [["first_name", "first name"], ["last_name", "last name"], ["line1", "the first line of your address"], ["city", "the town or city"]].forEach(function (kl) {
      if (!f[kl[0]]) errs[kl[0]] = "Enter " + kl[1] + "."; else if (f[kl[0]].length > 80) errs[kl[0]] = "That’s too long.";
    });
    var pc = pcNormalise(f.postcode);
    if (!pc) errs.postcode = "Enter a full UK postcode, like SW1A 1AA.";
    else if (NOT_UK_VAT[pcArea(pc)]) errs.postcode = "We can’t deliver to " + NOT_UK_VAT[pcArea(pc)] + " yet.";
    if (f.phone && !/^[+\d][\d ()\-]{6,20}$/.test(f.phone)) errs.phone = "Enter a phone number, or leave it empty.";
    for (var k in errs) n++;
    if (n) return { errors: errs };
    f.postcode = pc; f.marketing = ["1", "on", "yes"].indexOf(form.marketing) >= 0;
    return { f: f };
  }
  function luhn(n) {
    var s = 0, alt = false;
    for (var i = n.length - 1; i >= 0; i--) { var d = +n[i]; if (alt) d = d > 4 ? d * 2 - 9 : d * 2; s += d; alt = !alt; }
    return s % 10 === 0;
  }
  function testCharge(number, exp, cvc, nowMs) {   // throws the sentence the shopper sees
    var n = String(number || "").replace(/\D/g, ""), cards = S.test_cards || {};
    if (!(n.length >= 12 && n.length <= 19) || !luhn(n)) throw "That card number isn’t valid. Check it and try again.";
    if (!cards[n]) throw "This store is in test mode and takes no real cards. Use the test card 4242 4242 4242 4242.";
    var m = String(exp || "").replace(/\D/g, "");
    if (m.length !== 4 && m.length !== 6) throw "Enter the expiry date as MM / YY.";
    var mm = +m.slice(0, 2), yy = +m.slice(2), t = ymd(london(nowMs == null ? Date.now() : nowMs).day);
    if (yy < 100) yy += 2000;
    if (!(mm >= 1 && mm <= 12) || yy < t[0] || (yy === t[0] && mm < t[1])) throw "That expiry date has passed.";
    var c = cards[n], want = c[0] === "American Express" ? 4 : 3;
    if (!(/^\d+$/.test(cvc || "") && cvc.length === want)) throw "Enter the " + want + "-digit security code.";
    return { brand: c[0], last4: n.slice(-4), outcome: c[1], message: c[2] };
  }

  /* ------------------------------------------------------------ the server's answers */
  function err(status, msg) { return { status: status, body: { error: msg } }; }
  function bagResponse(bag, msg, added) {
    writeBag(bag);
    var q = quote(bag);
    return { status: 200, body: { count: q.count, msg: msg == null ? null : msg, added: added || null, drawer: drawer(q) } };
  }
  function bagAdd(f) {
    var vid = toInt(f.variant), qty = toInt(f.qty || "1");
    if (isNaN(vid) || isNaN(qty)) return err(400, "Choose a size first.");
    var v = D.variants[vid];
    if (!v || v.status !== "live") return err(404, "That item is no longer available.");
    var bag = readBag(), have = bag.get(vid) || 0, want = Math.min(MAX_QTY, have + Math.max(1, qty));
    if (want > v.stock) return err(409, v.stock ? "Only " + v.stock + " left in " + v.size + "." : v.size + " has just sold out.");
    bag.delete(vid); bag.set(vid, want);
    return bagResponse(bag, v.name + " · " + v.colour + " · " + v.size, { name: v.name, size: v.size });
  }
  function bagSet(f) {
    var vid = toInt(f.variant), qty = toInt(f.qty == null ? "0" : f.qty);
    if (isNaN(vid) || isNaN(qty)) return err(400, "Error");
    var bag = readBag();
    if (qty <= 0) bag.delete(vid);
    else if (bag.has(vid)) {
      var v = D.variants[vid], n = Math.max(1, Math.min(qty, MAX_QTY, v ? v.stock : 0));
      bag.set(vid, n);
    }
    return bagResponse(bag);
  }
  function bagAddKit(f) {
    var i = toInt(f.kit);
    if (isNaN(i)) return err(400, "That kit is not in the shop.");
    var k = (D.kits || []).filter(function (x) { return x.index === i; })[0];
    if (!k) return err(404, "That kit is no longer in the shop.");
    var bag = readBag(), added = [], short = [], full = [];
    for (var row = 0; row < k.pieces.length; row++) {
      var pc = k.pieces[row], raw = String(f["v" + row] || "").trim();
      if (!raw) continue;
      var vid = toInt(raw);
      if (isNaN(vid)) return err(400, "Choose a size from the list.");
      var v = pc.variants.filter(function (x) { return x.id === vid; })[0];
      if (!v) return err(400, "That size is not part of this kit.");
      var have = bag.get(vid) || 0;
      if (have >= MAX_QTY) { full.push(pc.name); continue; }
      if (v.stock < have + 1) { short.push(pc.name + " in " + v.size); continue; }
      bag.delete(vid); bag.set(vid, have + 1); added.push(pc.name);
    }
    var why = function () {
      var out = [];
      if (short.length) out.push(short.join(" and ") + " " + (short.length === 1 ? "has" : "have") + " just sold out.");
      if (full.length) out.push(full.join(" and ") + " " + (full.length === 1 ? "is" : "are") + " already in your bag " + MAX_QTY + " times.");
      return out.join(" ");
    };
    if (!added.length) return err(409, why() || "Choose a size for at least one piece.");
    var msg = k.name + ": " + added.length + " piece" + (added.length === 1 ? "" : "s") + " in your bag.";
    if (short.length || full.length) msg += " " + why();
    return bagResponse(bag, msg, { name: k.name, count: added.length });
  }
  function quoteApi(f, nowMs) {                  /* app/store_views.py: quote_api */
    var pc = pcNormalise(f.postcode || ""), q = quote(readBag(), f.code || "", f.method || "standard", pc, nowMs);
    return { subtotal: gbp(q.subtotal), discount: q.discount ? gbp(-q.discount) : "", code: q.code, code_error: q.code_error,
      total: gbp(q.total), vat: gbp(q.vat), delivery: q.delivery.price === 0 ? "Free" : gbp(q.delivery.price),
      options: q.options.map(function (o) { return { id: o.id, label: o.label, when: o.when, price: o.price === 0 ? "Free" : gbp(o.price) }; }),
      remote: !!(pc && pcRemote(pc)), postcode: pc || "", blocked: pc ? (NOT_UK_VAT[pcArea(pc)] || null) : null };
  }
  function notify(f) {
    var email = String(f.email || "").trim().toLowerCase(), vid = toInt(f.variant);
    if (isNaN(vid)) return err(400, "Choose a size.");
    if (!EMAIL_RX.test(email)) return err(400, "Enter an email address.");
    if (!D.variants[vid]) return err(404, "That size no longer exists.");
    return err(200, "This is the preview copy, so nothing is sent from here. In the store, this emails you once, when it’s back.");
  }
  function answer(route, form, qs, nowMs) {
    if (route === "api/bag") { var q = quote(readBag()); return { status: 200, body: { count: q.count, drawer: drawer(q) } }; }
    if (route === "bag/add") return bagAdd(form);
    if (route === "bag/set") return bagSet(form);
    if (route === "bag/add-kit") return bagAddKit(form);
    if (route === "api/search") return { status: 200, body: searchApi(qs.q || "") };
    if (route === "api/sky") return { status: 200, body: skyApi(qs.city || cookie("aa_city"), nowMs) };
    if (route === "api/quote") return { status: 200, body: quoteApi(form, nowMs) };
    if (route === "api/notify") return notify(form);
    return err(404, "Not found");
  }

  /* ============================================================ in the page */
  function cookie(k) {
    if (!HAS_DOM) return "";
    var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
    try { return m ? decodeURIComponent(m[1]) : ""; } catch (e) { return ""; }
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var realFetch = null, dataP = null;
  function ready() {
    if (D) return Promise.resolve(D);
    return dataP || (dataP = realFetch(BASE + "static/copy-data.json?v=" + (S.data_v || ""), { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("the catalogue answered " + r.status); return r.json(); })
      .then(function (j) { D = j; return j; })
      .catch(function (e) { dataP = null; fail("The preview couldn’t load its catalogue (" + e.message + "). Reload the page."); throw e; }));
  }
  function fail(msg) {                           // loudly: a preview that silently shows the wrong thing is worse
    if (typeof console !== "undefined") console.error("[preview copy] " + msg);
    var t = HAS_DOM && $("#toast"); if (t) { t.textContent = msg; t.classList.add("on"); }
  }
  function shim() {
    realFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (url.indexOf(location.origin) === 0) url = url.slice(location.origin.length);
      var m = /^\/(api\/bag|api\/search|api\/sky|api\/quote|api\/notify|bag\/add-kit|bag\/add|bag\/set)(\?[^#]*)?$/.exec(url);
      if (!m) return realFetch(input, init);
      var form = {}, qs = {};
      if (init && init.body) new URLSearchParams(init.body).forEach(function (v, k) { form[k] = v; });
      new URLSearchParams(m[2] || "").forEach(function (v, k) { qs[k] = v; });
      var need = m[1] === "api/sky" ? Promise.resolve() : ready();
      return need.then(function () {
        var r = answer(m[1], form, qs);
        return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
      });
    };
  }
  function syncCount() {
    var c = $("#bag-count"); if (!c) return;
    var n = bagCount(); c.textContent = n ? n : ""; c.dataset.n = n;
    var a = c.closest("a"); if (a) a.setAttribute("aria-label", "Bag, " + n + " item" + (n === 1 ? "" : "s"));
  }
  function lightData() {                         // the city and light the shopper chose, from their cookies
    var el = $("#light-data"), L = {};
    try { L = JSON.parse(el.textContent); } catch (e) {}
    var city = cookie("aa_city"), ov = cookie("aa_light");
    L.city = S.cities[city] ? city : "London";
    L.override = ov === "day" || ov === "night" ? ov : "auto";
    if (el) el.textContent = JSON.stringify(L);
    var sel = $("#light-city"); if (sel) sel.value = L.city;
    $$("[data-light]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.light === L.override ? "true" : "false"); });
    return L;
  }
  function order() { try { return JSON.parse(sget(ORDER) || "null"); } catch (e) { return null; } }
  function saveOrder(o) { sset(ORDER, JSON.stringify(o)); }
  function img(l, w, h, style) {
    return l.image ? '<img src="' + esc(u("/media/p/" + l.image + "-360.webp")) + '" alt=""' + (w ? ' width="' + w + '" height="' + h + '"' : "") + (style ? ' style="' + style + '"' : "") + ">" : "<span></span>";
  }
  function mini(ls) {
    return ls.map(function (l) {
      return "<li>" + img(l, 56, 70) + "<span>" + esc(l.name) + "<small>" + esc(l.colour) + " · " + esc(l.size) + (l.qty > 1 ? " · × " + l.qty : "") +
        '</small></span><b class="tnum">' + gbp(l.price * l.qty) + "</b></li>";
    }).join("");
  }
  function windowText(o) { return fmtDay(o.delivery_from) + (o.delivery_to !== o.delivery_from ? " – " + fmtDay(o.delivery_to) : ""); }
  function sums(o, paid) {
    return '<span>Subtotal</span><span>' + gbp(o.subtotal) + "</span>" +
      (o.discount ? "<span>Discount (" + esc(o.discount_code) + ")</span><span>" + gbp(-o.discount) + "</span>" : "") +
      "<span>" + esc(o.delivery_label) + "</span><span>" + (o.delivery === 0 ? "Free" : gbp(o.delivery)) + "</span>" +
      '<span class="t">Total</span><span class="t">' + gbp(o.total) + '</span><span class="v">Includes VAT of ' + gbp(o.vat) +
      (paid && o.card ? " · Paid by " + esc(o.card) : "") + "</span>";
  }

  /* ---------- the home page: today's arc, for the shopper's city */
  function home() {
    var slot = $("#arc-slot"); if (!slot) return;
    var L = lightData(), lc = lightAt(L.city, Date.now());
    slot.innerHTML = arcHTML(arc(lc.day, lc.lat, lc.lon), lc);
    Object.keys(lc.times).forEach(function (ph) { var t = $('[data-t="' + ph + '"]'); if (t) t.textContent = lc.times[ph]; });
    var dl = $("#dayline"); if (dl) dl.title = "Daylight in " + L.city + " today: sunrise " + lc.sunrise + ", sunset " + lc.sunset;
  }

  /* ---------- a product page: when an order placed now leaves and arrives */
  function product() {
    var pr = $(".promise"); if (!pr || pr.children.length < 2) return;
    var now = Date.now(), cal = new Cal(S.closed_days), sent = cal.dispatch(now, S.cutoff), today = london(now).day;
    var a = cal.window(now, S.cutoff, S.standard_min, S.standard_max), x = S.express_on ? cal.window(now, S.cutoff, S.express_min, S.express_max) : null;
    pr.children[0].innerHTML = '<svg><use href="#i-clock"/></svg>' + (sent[1] ? '<span class="count-down" data-cutoff="' + new Date(sent[1]).toISOString() +
      '">Order today and it leaves today.</span>' : "<span>Order now — it leaves " + fmtDay(sent[0], today) + ".</span>");
    pr.children[1].innerHTML = '<svg><use href="#i-van"/></svg><span><b>' + esc(S.standard_label) + "</b> · arrives " + fmtWindow(a[0], a[1], today) + " · " +
      (S.free_delivery_over ? "free over " + gbp(S.free_delivery_over, true) : gbp(S.standard_price)) +
      (x ? "<br><b>" + esc(S.express_label) + "</b> · arrives " + fmtWindow(x[0], x[1], today) + " · " + gbp(S.express_price) : "") + "</span>";
  }

  /* ---------- the bag page */
  function bagPage() { $("#bag-sheet").innerHTML = drawer(quote(readBag())); }

  /* ---------- the search page */
  function searchPage() {
    var q = (new URLSearchParams(location.search).get("q") || "").slice(0, 60), ps = q ? search(q) : [];
    var h1 = $("#main .listing-head h1"), box = $$("#main > .wrap")[1], sq = $("#sq");
    if (h1) h1.textContent = q ? "“" + q + "”" : "Search the store";
    if (sq) sq.value = q;
    document.title = (q ? "Search: " + q : "Search") + " · " + S.shop_name;
    if (box) box.innerHTML = ps.length ? '<div class="grid">' + ps.map(function (p) { return D.cards[p.slug]; }).join("") + "</div>" :
      (q ? '<p class="empty">Nothing matches “' + esc(q) + '”. Try “hoodie”, “black” or “running” — or <a href="' + esc(u("/shop/all")) + '">see everything</a>.</p>' : "");
  }

  /* ---------- checkout */
  function checkoutPage() {
    var co = $("#checkout"), q = quote(readBag(), "", "standard", null);
    if (!q.lines.length) { location.replace(u("/bag")); return false; }
    fillCheckout(co, q);
    var tm = $(".step .note b", co); if (tm && tm.textContent === "Test mode.") tm.textContent = "Preview copy.";
    return true;
  }
  function fillCheckout(co, q) {
    var mt = $(".mobile-total span", co); if (mt) mt.textContent = "Total " + gbp(q.total) + " · " + q.count + " item" + (q.count === 1 ? "" : "s");
    $("#summary .mini").innerHTML = mini(q.lines);
    var vals = { subtotal: gbp(q.subtotal), discount: q.discount ? gbp(-q.discount) : "", delivery: q.delivery.price === 0 ? "Free" : gbp(q.delivery.price), total: gbp(q.total), vat: gbp(q.vat) };
    $$("[data-sum]").forEach(function (el) { if (el.dataset.sum in vals) el.textContent = vals[el.dataset.sum]; });
    $$("[data-row=discount]").forEach(function (el) { el.hidden = !q.discount; });
    q.options.forEach(function (o) {
      var row = $('[data-method="' + o.id + '"]', co); if (!row) return;
      $(".when", row).textContent = "Arrives " + o.when; $(".p", row).textContent = o.price === 0 ? "Free" : gbp(o.price);
    });
    var place = $("#place", co); if (place) place.dataset.label = "Continue to payment · " + gbp(q.total);
    var short = $(".alert.short-alert", co);
    if (q.short.length && !short) {
      var al = document.createElement("div"); al.className = "alert short-alert"; al.setAttribute("role", "alert");
      al.innerHTML = 'Some items in your bag have sold out since you added them. <a href="' + esc(u("/bag")) + '">Update your bag</a>.';
      if (mt) mt.parentNode.after(al);
    } else if (!q.short.length && short) short.remove();
  }
  function clearErrors(co) {
    var box = $("#errors", co); if (box) box.remove();
    $$(".field.bad", co).forEach(function (el) { el.classList.remove("bad"); });
    $$("[aria-invalid]", co).forEach(function (el) { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); });
    $$(".err[data-copy]", co).forEach(function (el) { el.remove(); });
    var pe = $("#postcode-err", co); if (pe) { pe.hidden = true; pe.textContent = ""; }
  }
  function showErrors(co, errors, message) {
    var box = document.createElement("div"), lis = "";
    box.className = "errors"; box.id = "errors"; box.setAttribute("role", "alert"); box.tabIndex = -1;
    Object.keys(errors).forEach(function (k) {
      lis += '<li><a href="#' + (k === "form" || k === "stock" ? "checkout" : k) + '">' + esc(errors[k]) + "</a></li>";
      if (k === "code") { var cm = $("#code-msg", co); if (cm) { cm.textContent = errors[k]; cm.className = "err"; } return; }
      var inp = document.getElementById(k); if (!inp || !inp.closest(".field")) return;
      inp.closest(".field").classList.add("bad"); inp.setAttribute("aria-invalid", "true"); inp.setAttribute("aria-describedby", k + "-err");
      var sp = document.getElementById(k + "-err");
      if (!sp) { sp = document.createElement("span"); sp.className = "err"; sp.id = k + "-err"; sp.dataset.copy = "1"; inp.after(sp); }
      sp.hidden = false; sp.textContent = errors[k];
    });
    box.innerHTML = "<h2>" + esc(message || "Check these details") + "</h2><ul>" + lis + "</ul>";
    var mt = $(".mobile-total", co); mt.parentNode.insertBefore(box, mt);
    box.focus();
  }
  function checkoutSubmit(e, co) {
    e.preventDefault(); e.stopPropagation();
    var form = {}; new FormData(co).forEach(function (v, k) { form[k] = v; });
    clearErrors(co);
    var r = validate(form);
    if (r.errors) return showErrors(co, r.errors, "Check the highlighted details.");
    var f = r.f, bag = readBag(), q = quote(bag, f.code, f.method || "standard", f.postcode);
    if (!q.lines.length) return showErrors(co, { form: "Your bag is empty." }, "Your bag is empty.");
    if (q.code_error) return showErrors(co, { code: q.code_error }, q.code_error);
    if (q.short.length) {                        // take what is left, and say so
      var l = q.short[0];
      q.lines.forEach(function (x) { if (x.short) { if (x.stock) bag.set(x.variant_id, x.stock); else bag.delete(x.variant_id); } });
      writeBag(bag); fillCheckout(co, quote(bag, f.code, f.method || "standard", f.postcode));
      var msg = "Sorry — " + l.name + " in " + l.colour + ", " + l.size + " " + (l.stock ? "has only " + l.stock + " left." : "has just sold out.") + " Your bag has been updated.";
      return showErrors(co, { stock: msg }, msg);
    }
    var d = q.delivery;
    saveOrder({ number: "PREVIEW", created: Date.now(), status: "pending", card: "", email: f.email.toLowerCase(), first_name: f.first_name,
      last_name: f.last_name, phone: f.phone, address: { line1: f.line1, line2: f.line2, city: f.city, county: f.county }, postcode: f.postcode,
      delivery_label: d.label, delivery: d.price, delivery_from: d.from, delivery_to: d.to, subtotal: q.subtotal, discount: q.discount,
      discount_code: q.code, total: q.total, vat: q.vat,
      lines: q.lines.map(function (x) { return { name: x.name, colour: x.colour, size: x.size, image: x.image, price: x.price, qty: x.qty }; }) });
    var b = $("#place", co); if (b) { b.disabled = true; b.textContent = "Placing your order…"; }
    location.href = u("/pay");
  }

  /* ---------- payment, the bank check, the confirmation */
  function live(o) {                             // an unpaid order is held for 30 minutes, then closed
    if (o && o.status === "pending" && Date.now() > o.created + HOLD * 1000) { o.status = "expired"; saveOrder(o); }
    return o;
  }
  function payPage() {
    var o = live(order());
    if (!o) { location.replace(u("/bag")); return false; }
    if (o.status !== "pending") { location.replace(u("/order")); return false; }
    var left = $("#main .checkout > div"), kick = $(".kicker", left);
    if (kick) kick.textContent = "Order " + o.number;
    var dl = $("[data-left]"); if (dl) dl.dataset.left = Math.max(0, Math.round((o.created + HOLD * 1000 - Date.now()) / 1000));
    var note = $("#pay .note"); if (note) note.innerHTML = "<b>Preview copy — no money moves.</b> Only test card numbers are accepted; a real card is refused.";
    var btn = $("#pay-btn"); if (btn) btn.textContent = "Pay " + gbp(o.total);
    $("#main aside.summary").innerHTML = "<h2>Order " + esc(o.number) + '</h2><ul class="mini">' + mini(o.lines) + '</ul><div class="sums">' + sums(o) + "</div>" +
      '<p class="muted" style="font-size:14px;margin:0 0 8px">To ' + esc(o.first_name) + " " + esc(o.last_name) + ", " + esc(o.address.line1) +
      (o.address.line2 ? ", " + esc(o.address.line2) : "") + ", " + esc(o.address.city) + " " + esc(o.postcode) + "</p>" +
      '<p class="muted" style="font-size:14px;margin:0">Arrives ' + windowText(o) + ' · You can cancel within 14 days of delivery · <a href="' + esc(u("/legal/terms")) + '">Terms of sale</a></p>';
    document.title = "Payment · " + S.shop_name;
    var pe = sget(PAYERR); if (pe) { sset(PAYERR, null); payError(pe); }
    return true;
  }
  function payError(msg) {
    var al = $("#pay-alert");
    if (!al) { al = document.createElement("div"); al.className = "alert"; al.id = "pay-alert"; al.setAttribute("role", "alert"); $("#pay").before(al); }
    al.textContent = msg;
  }
  function paid(o) {
    o.status = "paid"; o.paid = Date.now(); saveOrder(o); writeBag(new Map());
    location.href = u("/order") + "?new=1";
  }
  function paySubmit(e) {
    e.preventDefault(); e.stopPropagation();
    var o = live(order()), r;
    if (!o || o.status !== "pending") { location.replace(u("/order")); return; }
    try { r = testCharge($("#number").value, $("#exp").value, $("#cvc").value, Date.now()); }
    catch (x) { payError(String(x)); return; }
    if (r.outcome === "declined") { payError(r.message); return; }
    o.card = r.brand + " ending " + r.last4; saveOrder(o);
    if (r.outcome === "3ds") { location.href = u("/pay/verify"); return; }
    paid(o);
  }
  function verifyPage() {
    var o = live(order());
    if (!o || o.status !== "pending" || !o.card) { location.replace(u(o ? "/order" : "/bag")); return false; }
    var k = $("#main .kicker"); if (k) k.textContent = "Preview copy · 3-D Secure";
    var p = $("#main .box p"); if (p) p.textContent = gbp(o.total) + " to " + S.shop_name + " · " + o.card;
    return true;
  }
  function verifySubmit(e) {
    e.preventDefault(); e.stopPropagation();
    var o = live(order()); if (!o || o.status !== "pending") { location.replace(u("/order")); return; }
    if (e.submitter && e.submitter.value === "approve") { paid(o); return; }
    o.card = ""; saveOrder(o);
    sset(PAYERR, "Your bank didn’t approve the payment. Try again, or use another card.");
    location.href = u("/pay");
  }
  function orderPage() {
    var o = live(order()), w = $("#main > .wrap"), isNew = /(^|[?&])new=1(&|$)/.test(location.search.slice(1));
    document.title = (o ? "Order " + o.number : "Your order") + " · " + S.shop_name;
    if (!o) {
      w.innerHTML = '<div class="done-hero"><p class="kicker">Preview copy</p><h1 class="display">No order here yet.</h1><p class="lede">An order placed in the preview copy lives only in this browser. Fill a bag and check out to see one.</p><p style="margin-top:20px"><a class="btn" href="' + esc(u("/shop/new")) + '">See what’s new</a></p></div>';
      return true;
    }
    if (o.status === "pending") {
      w.innerHTML = '<div class="done-hero"><p class="kicker">Order ' + esc(o.number) + ' · Awaiting payment</p><h1 class="display">Waiting for payment.</h1><p class="lede">We haven’t received the payment for this order yet. <a href="' + esc(u("/pay")) + '">Pay now</a>.</p></div>';
      return true;
    }
    if (o.status === "expired") {
      w.innerHTML = '<div class="done-hero"><p class="kicker">Order ' + esc(o.number) + ' · Not paid</p><h1 class="display">This order is closed.</h1><p class="lede">It wasn’t paid, so nothing was charged and the items went back on sale.</p></div>';
      return true;
    }
    var a = o.address;
    w.innerHTML = '<div class="done-hero"><p class="kicker">Order ' + esc(o.number) + " · Being prepared</p>" +
      '<h1 class="display">' + (isNew ? "Thank you, " + esc(o.first_name) + "." : "Your order.") + "</h1>" +
      '<p class="lede">' + (isNew ? "This is the preview copy, so nothing was ordered, charged or emailed. In the store, the order is confirmed here and the details go to <b>" + esc(o.email) + "</b>."
        : "Placed " + fmtWhen(o.created) + ", in the preview copy: it lives only in this browser.") + "</p></div>" +
      '<div class="timeline" aria-label="Progress"><div class="on"><b>Ordered</b><span>' + fmtWhen(o.created) + '</span></div><div class=""><b>On its way</b><span>We’ll email you when it leaves</span></div><div><b>Arriving</b><span>' + windowText(o) + "</span></div></div>" +
      '<div class="order-grid"><div><ul class="mini" style="margin:0">' + o.lines.map(function (l) {
        return '<li style="grid-template-columns:72px 1fr auto">' + img(l, 0, 0, "width:72px") + "<span>" + esc(l.name) + "<small>" + esc(l.colour) + " · " + esc(l.size) + " · × " + l.qty +
          '</small></span><b class="tnum">' + gbp(l.price * l.qty) + "</b></li>";
      }).join("") + '</ul><div class="sums" style="margin-top:18px">' + sums(o, true) + "</div></div>" +
      '<div><div class="box"><h3>Delivering to</h3><p style="margin:0">' + esc(o.first_name) + " " + esc(o.last_name) + "<br>" + esc(a.line1) + (a.line2 ? "<br>" + esc(a.line2) : "") +
      "<br>" + esc(a.city) + (a.county ? ", " + esc(a.county) : "") + "<br>" + esc(o.postcode) + "</p></div>" +
      '<div class="box" id="copy-cancel"><h3>Changed your mind?</h3><p style="margin:0 0 12px">It hasn’t been packed yet, so you can cancel it now and be refunded in full.</p><form method="post" action="#" data-copy-cancel><button class="btn ghost small">Cancel this order</button></form></div>' +
      '<div class="box"><h3>Need anything?</h3><p style="margin:0 0 10px">Send items back within ' + S.returns_days + " days of delivery" + (S.free_returns ? ", free" : "") + '.</p><p style="margin:0"><a href="' +
      esc(u("/returns")) + '">Start a return</a> · <a href="' + esc(u("/help/contact")) + '">Contact us</a></p></div>' +
      '<p style="margin-top:20px"><a class="btn ghost" href="' + esc(u("/shop/new")) + '">Keep shopping</a></p></div></div>';
    return true;
  }

  /* ---------- forms that would reach the store's server: answered here, honestly */
  var NOTES = {
    orders: "This is the preview copy: it keeps no orders, so there’s nothing to find here. In the store, the order number and email open the order.",
    returns: "This is the preview copy: it keeps no orders, so there’s nothing to return here. In the store, these three details open the order and the items that can go back."
  };
  function noteBefore(form, msg) {
    var al = $("#copy-note");
    if (!al) { al = document.createElement("div"); al.className = "alert"; al.id = "copy-note"; al.setAttribute("role", "alert"); al.style.marginTop = "20px"; form.before(al); }
    al.textContent = msg;
  }
  function teamsSubmit(form) {
    var f = {}; ["name", "email", "org", "phone", "message"].forEach(function (k) { f[k] = String((form.elements[k] || {}).value || "").trim().slice(0, 2000); });
    var errors = {};
    if (!f.name) errors.name = "Enter your name.";
    if (!EMAIL_RX.test(f.email)) errors.email = "Enter an email address.";
    if (f.message.length < 10) errors.message = "Tell us a little about what you need.";
    $$(".field", form).forEach(function (el) { el.classList.remove("bad"); var s = $(".err", el); if (s) s.remove(); });
    Object.keys(errors).forEach(function (k) {
      var fld = form.elements[k].closest(".field"), sp = document.createElement("span");
      fld.classList.add("bad"); sp.className = "err"; sp.textContent = errors[k]; fld.appendChild(sp);
    });
    if (Object.keys(errors).length) return;
    var n = document.createElement("div"); n.className = "note";
    n.innerHTML = "<b>Preview copy.</b> Your enquiry wasn’t sent. In the store, it reaches the owner in the Desk, and they reply by email.";
    form.replaceWith(n);
  }
  function onSubmit(e) {
    var f = e.target, kind = page();
    if (f.id === "checkout") return checkoutSubmit(e, f);
    if (f.id === "pay") return paySubmit(e);
    if (kind === "verify") return verifySubmit(e);
    if (f.matches("[data-kit-form], #buy") || (f.getAttribute("method") || "get").toLowerCase() !== "post") return;
    e.preventDefault(); e.stopPropagation();
    if (f.matches("[data-copy-cancel]")) {
      $("#copy-cancel").innerHTML = '<h3>Changed your mind?</h3><p style="margin:0">In the store, this cancels the order and refunds it in full. The preview copy took no money, so there is nothing to cancel.</p>';
      return;
    }
    if (kind === "teams") return teamsSubmit(f);
    noteBefore(f, NOTES[kind] || "This is the preview copy: this form would go to the store’s server, so nothing was sent.");
  }
  function page() { var m = $("#main"); return (m && m.dataset.copy) || ""; }

  function start() {
    try { S = JSON.parse($("#copy-settings").textContent); } catch (e) { fail("The preview’s settings are missing."); return; }
    shim();
    lightData(); syncCount();
    ["pageshow", "visibilitychange", "storage", "focus"].forEach(function (ev) { window.addEventListener(ev, syncCount); });
    document.addEventListener("prerenderingchange", syncCount);
    document.addEventListener("submit", onSubmit, true);
    var kind = page(), main = $("#main");
    var shown = function () { if (main) main.removeAttribute("data-copy-fill"); };
    var sync = { home: home, product: product, pay: payPage, verify: verifyPage, order: orderPage };
    var later = { bag: bagPage, search: searchPage, checkout: checkoutPage };
    try {
      if (sync[kind]) { if (sync[kind]() !== false) shown(); }
      else if (later[kind]) ready().then(function () { if (later[kind]() !== false) shown(); }).catch(function () { shown(); });
      else shown();
    } catch (x) { shown(); fail("The preview couldn’t draw this page: " + x.message); }
  }

  var api = { gbp: gbp, vatIncluded: vatIncluded, esc: esc, dn: dn, ymd: ymd, fromIso: fromIso, bankHolidays: bankHolidays, Cal: Cal,
    london: london, fmtDay: fmtDay, fmtWindow: fmtWindow, fmtWhen: fmtWhen, hm: hm, pcNormalise: pcNormalise, pcArea: pcArea, pcRemote: pcRemote,
    u: u, quote: quote, drawer: drawer, search: search, searchApi: searchApi, arc: arc, arcHTML: arcHTML, lightAt: lightAt, skyApi: skyApi,
    validate: validate, testCharge: testCharge, answer: answer, readBag: readBag, writeBag: writeBag,
    setup: function (settings, data, base) { S = settings; D = data; if (base) BASE = base; } };
  g.AACopy = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (HAS_DOM) start();
})(typeof window !== "undefined" ? window : globalThis);
