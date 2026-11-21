/* Active Athlete — the store's one script. Everything works without it (forms post, links go); it adds the light that
   follows the sun, the bag drawer, the leap into the bag, instant search, filters and live checkout totals. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var BASE = root.dataset.base || "/";          /* "/" in the store; the preview copy at middlewaresy.com sets its own */
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setCookie(k, v) { try { document.cookie = k + "=" + encodeURIComponent(v) + "; Path=" + BASE + "; Max-Age=31536000; SameSite=Lax"; } catch (e) {} }
  function post(url, data, json) {
    var body = new URLSearchParams();
    Object.keys(data || {}).forEach(function (k) { body.append(k, data[k]); });
    return fetch(url, { method: "POST", body: body, credentials: "same-origin",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" } })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  var toastT;
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on"); clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }

  /* ------------------------------------------------------------ the light */
  var L = {};
  try { L = JSON.parse($("#light-data").textContent); } catch (e) {}
  var CITIES = { "London": [51.5074, -0.1278], "Birmingham": [52.4862, -1.8904], "Manchester": [53.4808, -2.2426], "Leeds": [53.8008, -1.5491],
    "Liverpool": [53.4084, -2.9916], "Newcastle": [54.9783, -1.6178], "Nottingham": [52.9548, -1.1581], "Bristol": [51.4545, -2.5879],
    "Brighton": [50.8225, -0.1372], "Cardiff": [51.4816, -3.1791], "Edinburgh": [55.9533, -3.1883], "Glasgow": [55.8642, -4.2518],
    "Aberdeen": [57.1497, -2.0943], "Belfast": [54.5973, -5.9301] };
  var city = L.city || "London", override = L.override || "auto", preview = null;
  var fmtHM = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });
  var fmtParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  function ukNow(ms) {
    var p = {}; fmtParts.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month - 1, d: +p.day, mins: (+p.hour % 24) * 60 + (+p.minute) };
  }
  function hm(ms) { return ms ? fmtHM.format(new Date(ms)) : "—"; }
  function dur(s) { var m = Math.floor(s / 60), h = Math.floor(m / 60); m = m % 60; return h ? h + " h " + (m < 10 ? "0" : "") + m + " min" : m + " min"; }
  function sunState(ms) {
    var c = CITIES[city] || CITIES.London, u = ukNow(ms);
    var ev = AASun.day(u.y, u.m, u.d, c[0], c[1]);
    var tm = AASun.day(u.y, u.m, u.d + 1, c[0], c[1]);
    var ph = AASun.phase(ms, c[0], c[1]), line;
    if (ph === "night") {
      var fl = ms < ev.first_light ? ev.first_light : tm.first_light, sr = ms < ev.sunrise ? ev.sunrise : tm.sunrise;
      line = "Dark in " + city + ". " + (ms < ev.first_light ? "First light" : "Tomorrow: first light") + " <b>" + hm(fl) + "</b>, sunrise " + hm(sr) + ".";
    } else if (ph === "dawn") {
      line = ms < ev.sunrise ? "First light in " + city + ". Sunrise <b>" + hm(ev.sunrise) + "</b>."
        : "Sun up in " + city + " since " + hm(ev.sunrise) + ". <b>" + dur((ev.sunset - ev.sunrise) / 1000) + "</b> of daylight today.";
    } else if (ph === "day") {
      line = "Sunset in " + city + " " + hm(ev.sunset) + ". <b>" + dur((ev.sunset - ms) / 1000) + "</b> of light left.";
    } else {
      line = ms < ev.sunset ? "Last light in " + city + ". Sunset <b>" + hm(ev.sunset) + "</b>, dark by " + hm(ev.last_light) + "."
        : "The sun set at " + hm(ev.sunset) + ". Last light until <b>" + hm(ev.last_light) + "</b>.";
    }
    return { phase: ph, line: line, ev: ev, mins: u.mins, ms: ms };
  }
  function minsOf(ms) { return ms ? ukNow(ms).mins : 0; }
  /* what the line says at a time the shopper has dragged the sun to */
  function previewLine(st) {
    var t = "<b>" + hm(st.ms) + "</b> in " + city + ". ", ev = st.ev, ms = st.ms;
    if (st.phase === "day") return t + dur((ev.sunset - ms) / 1000) + " of light left, sunset " + hm(ev.sunset) + ".";
    if (st.phase === "dawn") return t + (ms < ev.sunrise ? "First light. Sunrise " + hm(ev.sunrise) + "." : "The sun is up; the day has " + dur((ev.sunset - ev.sunrise) / 1000) + ".");
    if (st.phase === "dusk") return t + (ms < ev.sunset ? "Low sun. Sunset " + hm(ev.sunset) + "." : "Last light, dark by " + hm(ev.last_light) + ".");
    return t + "Dark. " + (ms < ev.first_light ? "First light " + hm(ev.first_light) + "." : "The sun set at " + hm(ev.sunset) + ".");
  }
  function arcY(e) { return AASun.arcY(e); }

  var heroLoaded = {};
  function showScene(ph) {
    $$("#scene picture").forEach(function (pic) {
      var on = pic.dataset.phase === ph;
      if (on && !heroLoaded[ph]) {
        heroLoaded[ph] = 1;
        $$("[data-srcset]", pic).forEach(function (el) { el.srcset = el.dataset.srcset; });
        $$("[data-src]", pic).forEach(function (el) { el.src = el.dataset.src; });
      }
      var im = $("img", pic); if (im && im.dataset.alt) im.alt = on ? im.dataset.alt : "";
      pic.classList.toggle("on", on);
    });
  }
  function apply(st, isPreview) {
    var theme = override === "day" || override === "night" ? override : (st.phase === "day" ? "day" : "night");
    if (isPreview) theme = st.phase === "day" ? "day" : "night";
    root.dataset.phase = st.phase; root.dataset.theme = theme;
    var meta = $('meta[name="theme-color"]'); if (meta) meta.content = theme === "night" ? "#0B0B0A" : "#E8E6E2";
    showScene(st.phase);
    var line = $("#light-line");
    if (line) line.innerHTML = isPreview ? previewLine(st) : st.line;
    var sun = $("#sun"), scrub = $("#scrub"), c = CITIES[city] || CITIES.London;
    if (sun) {
      var elev = AASun.elevation(st.ms, c[0], c[1]);
      sun.style.setProperty("--x", (st.mins / 14.4).toFixed(2));
      sun.style.setProperty("--y", (arcY(elev) / 1.6).toFixed(2));
      sun.classList.toggle("edge", elev < -0.833 && elev >= -6);
      sun.classList.toggle("down", elev < -6);
    }
    var dl = $("#dayline");
    if (dl) {
      dl.style.setProperty("--now", (st.mins / 14.4).toFixed(2));
      ["first_light:fl", "sunrise:sr", "sunset:ss", "last_light:ll"].forEach(function (kv) {
        var k = kv.split(":"); if (st.ev[k[0]]) dl.style.setProperty("--" + k[1], (minsOf(st.ev[k[0]]) / 14.4).toFixed(2));
      });
    }
    var nt = $("#now-tick");
    if (nt) { nt.hidden = !isPreview; if (isPreview) nt.style.setProperty("--x", (ukNow(Date.now()).mins / 14.4).toFixed(2)); }
    if (scrub && !isPreview) { scrub.value = st.mins; scrub.setAttribute("aria-valuetext", hm(st.ms) + ", " + st.phase); }
    if (!isPreview) selectEdit(st.phase, true);
    var when = $("#edit-when"); if (when) when.textContent = city + (isPreview ? " · at " + hm(st.ms) : " · now");
  }
  function tick() { if (preview === null && window.AASun) apply(sunState(Date.now()), false); }
  if (window.AASun) { tick(); setInterval(tick, 60000); }

  var nowBtn = $("#now-btn");
  document.addEventListener("input", function (e) {
    var scrub = e.target; if (scrub.id !== "scrub") return;
    var now = Date.now(), u = ukNow(now);
    var ms = now + (+scrub.value - u.mins) * 60000;
    preview = ms;
    var st = sunState(ms); st.mins = +scrub.value;
    apply(st, true);
    scrub.setAttribute("aria-valuetext", hm(ms) + ", " + st.phase);
    selectEdit(st.phase, false); editManual = false;
    if (nowBtn) nowBtn.hidden = false;
  });
  document.addEventListener("pointerdown", function (e) { var a = e.target.closest && e.target.closest(".sky-arc"); if (a) a.classList.add("dragging"); });
  document.addEventListener("pointerup", function () { $$(".sky-arc.dragging").forEach(function (a) { a.classList.remove("dragging"); }); });
  if (nowBtn) nowBtn.addEventListener("click", function () { preview = null; nowBtn.hidden = true; tick(); });
  var citySel = $("#light-city");
  if (citySel) citySel.addEventListener("change", function () {
    city = citySel.value; setCookie("aa_city", city); preview = null; if (nowBtn) nowBtn.hidden = true;
    tick();
    fetch("/api/sky?city=" + encodeURIComponent(city), { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var a = $("#arc-slot");
        if (a && j.arc) a.innerHTML = j.arc;
        Object.keys(j.times || {}).forEach(function (ph) { var t = $('[data-t="' + ph + '"]'); if (t) t.textContent = j.times[ph]; });
        tick();
      }).catch(function () { tick(); });
  });
  $$("[data-light]").forEach(function (b) {
    b.addEventListener("click", function () {
      override = b.dataset.light; setCookie("aa_light", override); root.dataset.override = override;
      $$("[data-light]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      if (window.AASun) { preview = null; tick(); } else root.dataset.theme = override === "auto" ? root.dataset.theme : override;
    });
  });

  var editManual = false;
  function selectEdit(ph, auto) {
    if (auto && editManual) return;
    var tabs = $$("[data-edit]"); if (!tabs.length) return;
    tabs.forEach(function (t) { var on = t.dataset.edit === ph; t.setAttribute("aria-selected", on ? "true" : "false"); var p = $("#edit-" + t.dataset.edit); if (p) p.hidden = !on; });
    var title = $("#edit-title"), tab = $("#tab-" + ph); if (title && tab) title.textContent = tab.dataset.name || tab.textContent;
    var note = $("#edit-note"); if (note && tab) note.textContent = tab.dataset.note || "";
  }
  $$("[data-edit]").forEach(function (t) { t.addEventListener("click", function () { selectEdit(t.dataset.edit, false); editManual = true; }); });
  /* ------------------------------------------------------------ the kit list */
  function pickKit(i, focus) {
    $$("[data-kit-tab]").forEach(function (t) {
      var on = t.dataset.kitTab === String(i);
      t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1;
      var panel = $("#kit-" + t.dataset.kitTab); if (panel) panel.hidden = !on;
      if (on && focus) t.focus();
    });
  }
  $$("[data-kit-tab]").forEach(function (t, n, all) {
    t.addEventListener("click", function () { pickKit(t.dataset.kitTab); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
      e.preventDefault(); var to = all[(n + d + all.length) % all.length]; pickKit(to.dataset.kitTab, true);
    });
  });
  /* a kit worn or laid out (21 Nov 2026) */
  $$(".kit.has-look").forEach(function (kit) {
    var views = $(".kit-views", kit), look = $(".kit-look", kit), board = $(".kit-board", kit);
    if (!views || !look || !board) return;
    views.removeAttribute("data-wait");
    $$("[data-kit-view]", views).forEach(function (b) {
      b.addEventListener("click", function () {
        var worn = b.dataset.kitView === "worn";
        look.hidden = !worn; board.hidden = worn;
        $$("[data-kit-view]", views).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
    });
  });
  function kitTotals(form) {
    var n = 0, pence = 0;
    $$(".kit-row", form).forEach(function (row) {
      var on = !!$("input:checked", row); row.classList.toggle("kr-skip", !on && !row.classList.contains("out"));
      if (on) { n++; pence += +row.dataset.price; }
    });
    var btn = $("button[type=submit]", form);
    btn.disabled = !n;
    btn.textContent = n ? "Add " + n + " piece" + (n === 1 ? "" : "s") + " · " + gbp(pence) : "Choose your sizes above";
  }
  function gbp(p) { return "£" + (p % 100 ? (p / 100).toFixed(2) : String(p / 100)); }
  $$("[data-kit-form]").forEach(function (form) {
    kitTotals(form);
    form.addEventListener("change", function (e) {
      var r = e.target; if (r.type !== "radio") return;
      /* the same size on the pieces still without one, where that piece comes in it */
      $$(".kit-row", form).forEach(function (row) {
        if ($("input:checked", row)) return;
        var same = $$("input[type=radio]", row).filter(function (x) { return x.dataset.size === r.dataset.size && !x.disabled; })[0];
        if (same) same.checked = true;
      });
      kitTotals(form);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("button[type=submit]", form), msg = $(".kit-msg", form), data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      btn.disabled = true;
      post("/bag/add-kit", data).then(function (j) {
        if (j._status !== 200) { msg.textContent = j.error || "That did not work — try again."; kitTotals(form); return; }
        msg.textContent = "";
        var d = form.closest("dialog");
        leap(btn, function () {
          if (d) d.close();
          setCount(j.count);
          var sheet = $("#bag-sheet"); if (sheet && j.drawer) sheet.innerHTML = j.drawer;
          openDialog("bag"); toast(j.msg);
        });
        kitTotals(form);
      });
    });
  });

  /* ------------------------------------------------------------ the next page, before the tap lands */
  /* A product's photo is the slowest thing on its page. The moment a finger touches (or a mouse rests on) a link to a
     product, its photo starts loading at the size the product page will ask for, so it arrives with the page. */
  var started = {};
  function pdpWidth() {
    var need = (innerWidth <= 900 ? innerWidth * 0.88 : innerWidth * 0.58) * (window.devicePixelRatio || 1);
    var ws = [360, 540, 720, 960, 1440];
    for (var i = 0; i < ws.length; i++) if (ws[i] >= need) return ws[i];
    return 1440;
  }
  function warm(e) {
    var a = e.target.closest && e.target.closest("a[data-img]"); if (!a || started[a.dataset.img]) return;
    started[a.dataset.img] = 1;
    var im = new Image(); im.decoding = "async"; if ("fetchPriority" in im) im.fetchPriority = "high";
    im.src = BASE + "media/p/" + a.dataset.img + "-" + pdpWidth() + ".webp";
  }
  document.addEventListener("touchstart", warm, { passive: true });
  document.addEventListener("pointerdown", warm, { passive: true });
  var hoverT;
  document.addEventListener("mouseover", function (e) { clearTimeout(hoverT); hoverT = setTimeout(function () { warm(e); }, 60); }, { passive: true });
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute("download") || a.dataset.open) return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    root.classList.add("leaving");
  });
  document.addEventListener("submit", function (e) { if (!e.defaultPrevented && !e.target.closest("[data-kit-form]")) root.classList.add("leaving"); });
  window.addEventListener("pageshow", function () { root.classList.remove("leaving"); });

  /* ------------------------------------------------------------ dialogs */
  function openDialog(id) {
    var d = document.getElementById(id); if (!d || d.open) return d;
    d.showModal();
    if (id === "bag") loadBag();
    if (id === "search") setTimeout(function () { var q = $("#q"); q && q.focus(); }, 30);
    return d;
  }
  $$("[data-open]").forEach(function (b) {
    b.addEventListener("click", function (e) { if (!window.HTMLDialogElement) return; e.preventDefault(); openDialog(b.dataset.open); });
  });
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-close]"); if (c) { var d = c.closest("dialog"); d && d.close(); return; }
    if (e.target.tagName === "DIALOG") e.target.close();
  });

  /* ------------------------------------------------------------ the bag */
  function setCount(n) {
    var c = $("#bag-count"); if (!c) return;
    c.textContent = n ? n : ""; c.dataset.n = n; c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    var a = c.closest("a"); if (a) a.setAttribute("aria-label", "Bag, " + n + " item" + (n === 1 ? "" : "s"));
  }
  function loadBag() {
    fetch("/api/bag", { headers: { Accept: "application/json" }, credentials: "same-origin" }).then(function (r) { return r.json(); })
      .then(function (j) { $("#bag-sheet").innerHTML = j.drawer; setCount(j.count); });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-qty]"); if (!b) return;
    e.preventDefault();
    var form = b.closest("[data-line]"); var vid = form.dataset.line, q = +form.dataset.q + (+b.dataset.qty);
    if (b.dataset.qty === "0") q = 0;
    post("/bag/set", { variant: vid, qty: q }).then(function (j) {
      var sheet = $("#bag-sheet"); if (sheet && j.drawer) sheet.innerHTML = j.drawer;
      setCount(j.count);
      if (document.body.dataset.page === "bag") location.reload();
    });
  });

  function leap(from, then) {
    var to = $("#bag-count") && $("#bag-count").closest("a");
    if (reduce || !from || !to || !Element.prototype.animate) { then(); return; }
    var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    var outer = document.createElement("div"), inner = document.createElement("i");
    outer.className = "leap"; outer.appendChild(inner); document.body.appendChild(outer);
    var lift = Math.min(260, Math.max(120, Math.abs(y0 - y1) * .6));
    var dur = 720;
    outer.animate([{ transform: "translate(" + (x0 - 8) + "px,0)" }, { transform: "translate(" + (x1 - 8) + "px,0)" }], { duration: dur, easing: "linear", fill: "forwards" });
    var peak = Math.min(y0, y1) - lift;
    inner.animate([{ transform: "translateY(" + (y0 - 8) + "px) scale(1)" }, { transform: "translateY(" + (peak - 8) + "px) scale(1.25)", offset: .42, easing: "cubic-bezier(.3,0,.7,1)" },
      { transform: "translateY(" + (y1 - 8) + "px) scale(.5)" }], { duration: dur, easing: "cubic-bezier(.3,.6,.6,1)", fill: "forwards" })
      .onfinish = function () { outer.remove(); then(); };
  }

  /* ------------------------------------------------------------ product page */
  var buy = $("#buy");
  if (buy) {
    var vin = $("input[name=variant]", buy), addBtn = $("#add-btn"), note = $("#stock-note"), notify = $("#notify");
    var low = +buy.dataset.low;
    function pick(btn) {
      $$(".size", buy).forEach(function (x) { x.setAttribute("aria-checked", x === btn ? "true" : "false"); x.tabIndex = x === btn ? 0 : -1; });
      var st = +btn.dataset.stock; vin.value = btn.dataset.variant;
      if (st === 0) {
        addBtn.disabled = true; addBtn.textContent = "Sold out in " + btn.dataset.size;
        note.className = "stock-note"; note.textContent = "Tell me when " + btn.dataset.size + " is back:";
        if (notify) notify.hidden = false;
      } else {
        addBtn.disabled = false; addBtn.innerHTML = "Add to bag · " + btn.dataset.size;
        if (notify) notify.hidden = true;
        if (st <= low) { note.className = "stock-note low"; note.textContent = "Only " + st + " left in " + btn.dataset.size + "."; }
        else { note.className = "stock-note"; note.textContent = "In stock in " + btn.dataset.size + "."; }
      }
    }
    $$(".size", buy).forEach(function (btn) {
      btn.addEventListener("click", function () { pick(btn); });
      btn.addEventListener("keydown", function (e) {
        var all = $$(".size", buy), i = all.indexOf(btn);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); var n = all[(i + 1) % all.length]; n.focus(); pick(n); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); var p = all[(i - 1 + all.length) % all.length]; p.focus(); pick(p); }
      });
    });
    var only = $$(".size", buy); if (only.length === 1) pick(only[0]);
    buy.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!vin.value) { note.className = "stock-note low"; note.textContent = "Choose a size first."; var f = $(".size", buy); f && f.focus(); return; }
      addBtn.disabled = true; var label = addBtn.innerHTML; addBtn.textContent = "Adding…";
      post("/bag/add", { variant: vin.value, qty: 1 }).then(function (j) {
        addBtn.disabled = false; addBtn.innerHTML = label;
        if (j.error) { note.className = "stock-note low"; note.textContent = j.error; return; }
        leap(addBtn, function () {
          setCount(j.count);
          var sheet = $("#bag-sheet"); if (sheet) sheet.innerHTML = j.drawer;
          var d = document.getElementById("bag");
          if (d && !d.open && window.HTMLDialogElement) d.showModal(); else toast("Added to your bag: " + j.msg);
        });
      }).catch(function () { addBtn.disabled = false; addBtn.innerHTML = label; buy.submit(); });
    });
    var nb = $("#notify-btn");
    if (nb) nb.addEventListener("click", function () {
      post("/api/notify", { variant: vin.value, email: $("#notify-email").value }).then(function (j) {
        if (j.ok) { notify.hidden = true; note.textContent = "Done — we’ll email you once, when it’s back."; } else { note.className = "stock-note low"; note.textContent = j.error; }
      });
    });
    var cd = $("[data-cutoff]");
    if (cd && cd.dataset.cutoff) {
      var end = Date.parse(cd.dataset.cutoff);
      var upd = function () { var s = (end - Date.now()) / 1000; if (s <= 0) { cd.textContent = "Order now — it leaves on the next working day."; return; } cd.innerHTML = "Order in the next <b>" + dur(s) + "</b> and it leaves today."; };
      upd(); setInterval(upd, 30000);
    }
    var zoom = $("#zoom");
    $$(".gallery figure").forEach(function (f) {
      f.addEventListener("click", function () { if (!zoom || !zoom.showModal) return; $("img", zoom).src = f.dataset.full; $("img", zoom).alt = $("img", f).alt; zoom.showModal(); });
    });
  }
  $$("[data-modal]").forEach(function (b) { b.addEventListener("click", function () { var d = document.getElementById(b.dataset.modal); d && d.showModal && d.showModal(); }); });

  /* ------------------------------------------------------------ search */
  var q = $("#q"), out = $("#search-out"), qt;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  if (q) q.addEventListener("input", function () {
    clearTimeout(qt);
    qt = setTimeout(function () {
      var v = q.value.trim();
      if (v.length < 2) { out.innerHTML = ""; return; }
      fetch("/api/search?q=" + encodeURIComponent(v), { headers: { Accept: "application/json" } }).then(function (r) { return r.json(); }).then(function (rs) {
        if (q.value.trim() !== v) return;
        out.innerHTML = rs.length ? '<div class="search-results">' + rs.map(function (r) {
          return '<a href="' + esc(r.url) + '"><img src="' + esc(r.image) + '" alt="" loading="lazy"><div class="n">' + esc(r.name) + '</div><div class="muted">' + esc(r.price) + "</div></a>";
        }).join("") + "</div>" : '<p class="search-empty">Nothing matches “' + esc(v) + '”. Try “hoodie”, “black” or “running”.</p>';
      });
    }, 160);
  });

  /* ------------------------------------------------------------ shop filters */
  var grid = $("#grid");
  if (grid) {
    var state = { size: "", colour: "", cat: "", sort: "" };
    var params = new URLSearchParams(location.search);
    Object.keys(state).forEach(function (k) { state[k] = params.get(k) || ""; });
    var cards = $$(".card", grid);
    function run() {
      var shown = cards.filter(function (c) {
        if (state.size && c.dataset.sizes.split("|").indexOf(state.size) < 0) return false;
        if (state.colour && c.dataset.colours.split("|").indexOf(state.colour) < 0) return false;
        if (state.cat && c.dataset.cat !== state.cat) return false;
        return true;
      });
      var by = { "price-asc": function (a, b) { return a.dataset.price - b.dataset.price; }, "price-desc": function (a, b) { return b.dataset.price - a.dataset.price; },
        "new": function (a, b) { return b.dataset.new - a.dataset.new; } }[state.sort];
      var order = by ? shown.slice().sort(by) : shown;
      cards.forEach(function (c) { c.hidden = shown.indexOf(c) < 0; });
      order.forEach(function (c) { grid.appendChild(c); });
      var n = $("#count-line"); if (n) n.textContent = shown.length + " item" + (shown.length === 1 ? "" : "s");
      var em = $("#grid-empty"); if (em) em.hidden = shown.length > 0;
      $$("[data-f]").forEach(function (b) { b.setAttribute("aria-pressed", state[b.dataset.f] === b.dataset.v ? "true" : "false"); });
      var sel = $("#sort"); if (sel) sel.value = state.sort;
      var p = new URLSearchParams(); Object.keys(state).forEach(function (k) { if (state[k]) p.set(k, state[k]); });
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
    }
    $$("[data-f]").forEach(function (b) { b.addEventListener("click", function () { var k = b.dataset.f; state[k] = state[k] === b.dataset.v ? "" : b.dataset.v; run(); }); });
    var sort = $("#sort"); if (sort) sort.addEventListener("change", function () { state.sort = sort.value; run(); });
    var clr = $("#clear"); if (clr) clr.addEventListener("click", function () { state = { size: "", colour: "", cat: "", sort: "" }; run(); });
    run();
  }

  /* ------------------------------------------------------------ checkout */
  var co = $("#checkout");
  var errs = $("#errors"); if (errs) errs.focus();
  if (co) {
    var pcIn = $("#postcode", co), code = $("#code", co), quoteT, busy = false;
    function quote() {
      var m = $("input[name=method]:checked", co);
      post("/api/quote", { postcode: pcIn.value, method: m ? m.value : "standard", code: code ? code.value : "" }).then(function (j) {
        $$("[data-sum]").forEach(function (el) { var k = el.dataset.sum; if (k in j) el.textContent = j[k]; });
        $$("[data-row=discount]").forEach(function (el) { el.hidden = !j.discount; });   /* the label and the amount */
        (j.options || []).forEach(function (o) {
          var row = $('[data-method="' + o.id + '"]', co); if (!row) return;
          $(".when", row).textContent = "Arrives " + o.when; $(".p", row).textContent = o.price;
        });
        var rn = $("#remote-note"); if (rn) rn.hidden = !j.remote;
        var ce = $("#code-msg"); if (ce) { ce.textContent = j.code_error || (j.code ? "Code " + j.code + " applied." : ""); ce.className = j.code_error ? "err" : "hint"; }
        if (j.postcode && pcIn.value !== j.postcode && document.activeElement !== pcIn) pcIn.value = j.postcode;
        var pe = $("#postcode-err");
        if (pe) { pe.textContent = j.blocked ? "We can’t deliver to " + j.blocked + " yet." : ""; pe.hidden = !j.blocked; }
      });
    }
    function later() { clearTimeout(quoteT); quoteT = setTimeout(quote, 250); }
    pcIn.addEventListener("blur", quote); pcIn.addEventListener("input", function () { if (pcIn.value.replace(/\s/g, "").length >= 5) later(); });
    $$("input[name=method]", co).forEach(function (r) { r.addEventListener("change", quote); });
    var applyBtn = $("#apply-code"); if (applyBtn) applyBtn.addEventListener("click", function (e) { e.preventDefault(); quote(); });
    co.addEventListener("submit", function (e) {
      if (busy) { e.preventDefault(); return; }
      busy = true; var b = $("#place", co); b.disabled = true; b.textContent = "Placing your order…";
      setTimeout(function () { busy = false; b.disabled = false; b.textContent = b.dataset.label; }, 9000);
    });
  }

  /* ------------------------------------------------------------ pay (test mode) */
  var pay = $("#pay");
  if (pay) {
    var num = $("#number", pay), exp = $("#exp", pay), cvc = $("#cvc", pay);
    num.addEventListener("input", function () { var d = num.value.replace(/\D/g, "").slice(0, 19); num.value = d.replace(/(.{4})/g, "$1 ").trim(); });
    exp.addEventListener("input", function () { var d = exp.value.replace(/\D/g, "").slice(0, 4); exp.value = d.length > 2 ? d.slice(0, 2) + " / " + d.slice(2) : d; });
    cvc.addEventListener("input", function () { cvc.value = cvc.value.replace(/\D/g, "").slice(0, 4); });
    $$("[data-card]").forEach(function (b) {
      b.addEventListener("click", function () {
        num.value = b.dataset.card.replace(/(.{4})/g, "$1 ").trim();
        var d = new Date(); exp.value = "12 / " + String((d.getFullYear() + 3) % 100);
        cvc.value = b.dataset.card.length === 15 ? "1234" : "123"; num.focus();
      });
    });
    pay.addEventListener("submit", function () { var b = $("#pay-btn", pay); b.disabled = true; b.textContent = "Paying…"; });
    var left = $("[data-left]");
    if (left) { var end = Date.now() + (+left.dataset.left) * 1000; var lt = function () { var s = Math.max(0, (end - Date.now()) / 1000); left.textContent = Math.floor(s / 60) + " min"; }; lt(); setInterval(lt, 15000); }
  }
})();
