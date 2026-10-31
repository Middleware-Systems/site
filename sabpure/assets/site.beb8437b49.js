/* 00-core.js */
/* site.js — one deferred file, concatenated by build.py from src/js/*.js in order (DESIGN.md §5).
   Its first act is html.io: every hidden starting state that waits for an IntersectionObserver is keyed on it, so a
   script that fails leaves nothing hidden. No scroll handlers anywhere: IntersectionObserver and CSS only. */
(function () {
  var root = document.documentElement;
  var SP = window.SP = {
    io: "IntersectionObserver" in window,
    reduced: window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches,
    lang: root.lang || "en",
    $: function (s, c) { return (c || document).querySelector(s); },
    $$: function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); },
    // one helper for "add .in once this enters the viewport"
    once: function (els, cb, opts) {
      if (!els.length) return;
      if (!SP.io) { els.forEach(cb); return; }
      var ob = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { ob.unobserve(e.target); cb(e.target); } });
      }, opts || { threshold: 0.35 });
      els.forEach(function (el) { ob.observe(el); });
    }
  };
  if (SP.io) root.classList.add("io");
  // the header over the hero is transparent until the reader leaves the top (SPEC §4.11); no observer, glass at once
  var head = SP.$(".site-header--over"), mark = SP.$("[data-header-sentinel]");
  if (head && mark) {
    if (SP.io) new IntersectionObserver(function (e) { head.classList.toggle("is-glass", !e[0].isIntersecting); }).observe(mark);
    else head.classList.add("is-glass");
  }
})();

/* 10-reveal.js */
/* In-view wipes (countersigns, route end, footer line) and plates developing on load (§5 #1, #5, #6) */
(function (SP) {
  // the hero's arcade draws its own line once, in CSS (40-home.css): it is never re-hidden here
  SP.once(SP.$$("[data-wipe]").filter(function (el) { return !el.closest("#shelf"); }), function (el) { el.classList.add("in"); });
  SP.once(SP.$$("[data-stage]"), function (el) { el.classList.add("in"); }, { threshold: 0.2 });
  SP.once(SP.$$(".route__list"), function (el) { el.classList.add("in"); }, { threshold: 0.1 });
  // plates: fetched 600 px before they arrive (the macro leaves them unfetched), developed once loaded
  function fetchPlate(pic) {
    if (!pic.hasAttribute("data-defer")) return;
    pic.removeAttribute("data-defer");
    var img = SP.$("img", pic);
    img.addEventListener("load", function () { img.classList.add("loaded"); });
    img.addEventListener("error", function () { img.classList.add("loaded"); });
    SP.$$("[data-srcset]", pic).forEach(function (s) { s.setAttribute("srcset", s.getAttribute("data-srcset")); });
    img.setAttribute("src", img.getAttribute("data-src"));
  }
  var plates = SP.$$("picture[data-defer]");
  SP.once(plates, fetchPlate, { rootMargin: "0px 0px 600px 0px" });
  window.addEventListener("beforeprint", function () { plates.forEach(fetchPlate); });
})(window.SP);

/* 15-dust.js */
/* The hero's light (SPEC "The Arches" §2.6 as amended 31 Oct 2026, DESIGN §10 Motion): the CSS light pauses while the
   hero is off screen (.is-off); then the dust, warm motes drifting up through the windows, which fade out and stop
   5 s after load (WCAG 2.2.2), the canvas hidden again. Decoration only: the canvas stays hidden without JS, under
   reduced motion, Save-Data or a small device. */
(function (SP) {
  var hero = SP.$(".hero"), seen = true, go = function () {};
  if (!hero) return;
  // the observer's state is kept, so a tab coming back to a page scrolled past the hero never restarts the dust
  if (SP.io) new IntersectionObserver(function (e) {
    seen = e[0].isIntersecting; hero.classList.toggle("is-off", !seen); go(seen && !document.hidden);
  }).observe(hero);
  document.addEventListener("visibilitychange", function () { go(seen && !document.hidden); });
  var cv = SP.$(".hero__dust"), arc = SP.$(".arcade__sweep"), nav = navigator;
  if (!cv || !arc || SP.reduced || !cv.getContext || (nav.connection && nav.connection.saveData) || nav.deviceMemory < 2) return;
  var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), M = Math, R = M.random;
  var W, H, b, motes = [], on = false, raf = 0, last = 0, END = 5000, FADE = 1500;
  cv.hidden = false;
  function spawn(any) {
    var p = b.w * .06;
    return { x: b.x - p + R() * (b.w + 2 * p), y: any ? b.y + R() * b.h : b.y + b.h * (.8 + R() * .25),
      r: 1 + R(), v: 4 + R() * 8, ph: R() * 6.3, a: .2 + R() * .35 };
  }
  function size() {
    var r = hero.getBoundingClientRect(), a = arc.getBoundingClientRect(), n = innerWidth >= 1024 ? 60 : 24;
    W = r.width; H = r.height; cv.width = M.round(W * dpr); cv.height = M.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    b = { x: a.left - r.left, y: a.top - r.top, w: a.width, h: a.height };
    motes = []; while (n--) motes.push(spawn(1));
  }
  function frame(t) {
    // t is the document's clock (ms since load): the dust is gone by END, whatever happened in between
    var fade = M.min(1, (END - t) / FADE);
    if (fade <= 0) { go(0); go = function () {}; ctx.clearRect(0, 0, W, H); cv.hidden = true; return; }
    raf = requestAnimationFrame(frame);
    if (t - last < 33) return;
    var dt = last ? M.min(.1, (t - last) / 1e3) : 0, cx = b.x + b.w / 2, cy = b.y + b.h * .55;
    last = t; ctx.clearRect(0, 0, W, H);
    motes.forEach(function (m, i) {
      m.ph += dt; m.y -= m.v * dt; m.x += M.sin(m.ph) * 6 * dt;
      if (m.y < b.y - 20) { motes[i] = spawn(0); return; }
      var dx = (m.x - cx) / (b.w * .75), dy = (m.y - cy) / (b.h * .7), al = fade * m.a * M.max(0, 1 - dx * dx - dy * dy);
      if (al < .02) return;
      ctx.fillStyle = "rgba(255,228,180," + al.toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.3); ctx.fill();
    });
  }
  go = function (y) { if (y && !on) { on = true; last = 0; raf = requestAnimationFrame(frame); } else if (!y && on) { on = false; cancelAnimationFrame(raf); } };
  size(); go(seen && !document.hidden);
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 200); });
})(window.SP);

/* 20-index.js */
/* The Index (B18): in the HTML a link to the site index at the page's end; here it opens that index in a <dialog>
   sheet — the browser traps focus and closes it on Escape; a tap on any link closes it too. */
(function (SP) {
  var key = SP.$(".index-key"), index = SP.$("#site-index");
  if (!key || !index || typeof HTMLDialogElement !== "function") return;
  var sheet = document.createElement("dialog");
  sheet.className = "sheet";
  sheet.setAttribute("aria-label", key.getAttribute("data-sheet-label") || key.textContent.trim());
  var bar = document.createElement("div");
  bar.className = "sheet__bar";
  var logo = SP.$(".site-header__logo");
  if (logo) {
    var l = logo.cloneNode(true);
    l.removeAttribute("id");
    SP.$$("[id]", l).forEach(function (n) { n.removeAttribute("id"); });   /* its <use> still finds the header's path */
    bar.appendChild(l);
  }
  var close = document.createElement("button");
  close.type = "button";
  close.className = "sheet__close";
  close.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg><span></span>';
  close.lastChild.textContent = key.getAttribute("data-close") || "Close";
  bar.appendChild(close);
  sheet.appendChild(bar);
  var copy = index.cloneNode(true);
  copy.removeAttribute("id");
  SP.$$("[id]", copy).forEach(function (n) { n.removeAttribute("id"); });
  /* its label was the footer's heading, inert behind the modal: the copy is named by its own heading */
  var ch = copy.querySelector("h2");
  if (ch) { ch.id = "sheet-index-h"; copy.setAttribute("aria-labelledby", ch.id); } else copy.removeAttribute("aria-labelledby");
  sheet.appendChild(copy);
  document.body.appendChild(sheet);
  key.setAttribute("role", "button");
  key.setAttribute("aria-haspopup", "dialog");
  key.setAttribute("aria-expanded", "false");
  function open(e) { e.preventDefault(); sheet.showModal(); key.setAttribute("aria-expanded", "true"); }
  function shut() { if (sheet.open) sheet.close(); }
  key.addEventListener("click", open);
  key.addEventListener("keydown", function (e) { if (e.key === " ") open(e); });
  close.addEventListener("click", shut);
  sheet.addEventListener("close", function () { key.setAttribute("aria-expanded", "false"); key.focus(); });
  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) shut();
    if (e.target.closest && e.target.closest("a")) shut();
  });
})(window.SP);

/* 30-copy.js */
/* Copy the number (§5 #9): shown only with JS and a fine pointer (B32); a live region says it worked */
(function (SP) {
  SP.$$("[data-copy]").forEach(function (btn) {
    var label = btn.querySelector("[data-copy-label]"), said = btn.getAttribute("data-copied") || "Copied",
        failed = btn.getAttribute("data-copy-failed") || "Copy failed",
        idle = label ? label.textContent : "", live = SP.$("#copy-live"), t;
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      function say(msg, ms) {
        if (label) label.textContent = msg;
        if (live) live.textContent = msg;
        clearTimeout(t);
        t = setTimeout(function () { if (label) label.textContent = idle; if (live) live.textContent = ""; }, ms);
      }
      function done() { say(said, 2000); }
      /* nothing reached the clipboard: say so, and hand the text over selected so it can be copied by hand */
      function fail() {
        say(failed, 4000);
        var letter = btn.hasAttribute("data-composer-copy") && SP.$("[data-composer-letter]");
        if (letter) { letter.focus(); letter.select(); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = value; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        var prev = document.activeElement;      /* the textarea takes focus; removing it would drop focus to <body> */
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        if (prev && prev.focus) prev.focus({ preventScroll: true });
        if (ok) done(); else fail();
      }
    });
  });
})(window.SP);

/* 40-callbar.js */
/* The call bar (phones, B10): fixed, rendered only under html.io; hidden (and inert) while any [data-callbar-hide]
   element — the hero doors, the footer's phone — is on screen. */
(function (SP) {
  var bar = SP.$(".callbar");
  if (!bar || !SP.io) return;
  var watch = SP.$$("[data-callbar-hide]"), seen = new Set(), started = false;
  document.body.classList.add("has-callbar");
  function set(hidden) {
    bar.classList.toggle("is-hidden", hidden);
    if (hidden) bar.setAttribute("inert", ""); else bar.removeAttribute("inert");
  }
  set(true);
  var ob = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
    set(seen.size > 0 || !started);
  }, { threshold: 0 });
  watch.forEach(function (el) { ob.observe(el); });
  // the bar first appears once the reader has moved past the top of the page (no doors at the top → at once)
  var top = SP.$("[data-callbar-start]") || SP.$("main > :first-child");
  if (top) {
    new IntersectionObserver(function (es) {
      started = !es[0].isIntersecting || !watch.length;
      set(seen.size > 0 || !started);
    }, { threshold: 0.6 }).observe(top);
  } else { started = true; set(seen.size > 0); }
})(window.SP);

/* 50-lang.js */
/* The language switch keeps your place (§5 #14): the anchors are the same in both languages (A7) */
(function (SP) {
  SP.$$("a[data-lang-switch]").forEach(function (a) {
    a.addEventListener("click", function () {
      if (location.hash && /^#[a-z][a-z0-9-]*$/.test(location.hash)) a.href = a.href.split("#")[0] + location.hash;
    });
  });
})(window.SP);

/* 70-clock.js */
/* Damascus time (§5 #11, B25): written into its own <time dir="ltr"> beside the tz.damascus claim, never over it;
   Western digits in both languages (B22) */
(function (SP) {
  var els = SP.$$("[data-damascus-clock]");
  if (!els.length || !window.Intl) return;
  var fmt;
  try {
    fmt = new Intl.DateTimeFormat(SP.lang === "ar" ? "ar-u-nu-latn" : "en-GB",
      { timeZone: "Asia/Damascus", hour: "2-digit", minute: "2-digit", hourCycle: "h23", numberingSystem: "latn" });
  } catch (e) { return; }
  function tick() {
    var now = new Date(), s = fmt.format(now).replace(/[^0-9:]/g, "");
    els.forEach(function (el) { el.textContent = s; el.setAttribute("datetime", s); el.hidden = false; });
  }
  /* on the minute, not 60 s after the page loaded (that showed the past minute for up to 59 s); again on return */
  (function loop() { tick(); setTimeout(loop, 60000 - (Date.now() % 60000) + 50); })();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
})(window.SP);

/* 80-print.js */
/* Print buttons (§5 #16): window.print(); hidden without JS (the browser's own print still works).
   A printed sheet says where it came from and when: [data-print-url] gets this page's address when the build left it
   empty (the preview, which has no --origin), [data-print-date] gets today's date as YYYY-MM-DD in Western digits.
   The date is the reader's, never the build's: a build date would be a wrong date printed with confidence. Without JS
   both stay empty and the stylesheet hides their lines. */
(function (SP) {
  SP.$$("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function fill() {
    var d = new Date(), day = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
    SP.$$("[data-print-url]").forEach(function (e) {
      if (!e.textContent.trim()) e.textContent = location.origin + location.pathname;
    });
    SP.$$("[data-print-date]").forEach(function (e) { e.textContent = day; e.setAttribute("datetime", day); });
  }
  fill();
  window.addEventListener("beforeprint", fill);
})(window.SP);

/* 85-composer.js */
/* The introduction composer on /partners/ (DESIGN.md §5 #10, B20). The visitor fills the fields; the page writes the
   letter they send from their own app: copied, opened in WhatsApp, in their mail, or printed. Nothing is submitted,
   nothing is stored, nothing leaves the page. Both letters (English, Arabic) are in the page as JSON. */
(function (SP) {
  var root = SP.$("[data-composer]");
  if (!root) return;
  var src = SP.$("[data-composer-data]", root), D;
  try { D = JSON.parse(src.textContent); } catch (e) { return; }   // without its letters the no-JS version stays

  var fields = {};
  SP.$$("[data-field]", root).forEach(function (el) { fields[el.getAttribute("data-field")] = el; });
  var letter = SP.$("[data-composer-letter]", root), printCopy = SP.$("[data-composer-print-copy]", root),
      slot = SP.$("[data-composer-slot]", root), name = SP.$("[data-composer-name]", root),
      copy = SP.$("[data-composer-copy]", root), wa = SP.$("[data-composer-wa]", root),
      mail = SP.$("[data-composer-mail]", root), print = SP.$("[data-composer-print]", root),
      langs = SP.$$("input[name=pt-letter-lang]", root);
  if (!letter || !D.en || !D.ar) return;
  var waBase = wa ? wa.getAttribute("href").split("?")[0] : "",
      mailBase = mail ? mail.getAttribute("href").split("?")[0] : "",
      emptyName = name ? name.textContent : "";
  var DROP = "\u0000";   // a signature line left empty is removed, not filled

  function val(k) {
    var el = fields[k];
    return el && el.value ? el.value.replace(/\s+/g, " ").trim() : "";
  }
  function letterLang() {
    for (var i = 0; i < langs.length; i++) if (langs[i].checked) return langs[i].value;
    return SP.lang === "ar" ? "ar" : "en";
  }

  function compose() {
    var L = letterLang(), d = D[L], v = {};
    // an empty field says so in words that agree with its own label (Arabic: «لم تُذكر» for a plural, «لم يُذكر» else)
    ["origin", "categories", "markets"].forEach(function (k) { v[k] = val(k) || d.empty[k]; });
    ["person", "company", "contact"].forEach(function (k) { v[k] = val(k) || DROP; });
    v.brand = val("brand") || "[" + d.brand + "]";
    var si = fields.syria ? fields.syria.value : "";
    v.syria = si !== "" && d.syria[+si] ? d.syria[+si] : d.empty.syria;

    var text = d.letter.replace(/\{(\w+)\}/g, function (m, k) { return k in v ? v[k] : m; })
      .split("\n").filter(function (line) { return line.indexOf(DROP) < 0; }).join("\n");

    letter.value = text;
    letter.setAttribute("lang", L);
    letter.setAttribute("dir", L === "ar" ? "rtl" : "ltr");
    fit();
    if (printCopy) {
      printCopy.textContent = text;
      printCopy.setAttribute("lang", L);
      printCopy.setAttribute("dir", L === "ar" ? "rtl" : "ltr");
    }
    if (copy) copy.setAttribute("data-copy", text);
    if (wa) wa.setAttribute("href", waBase + "?text=" + encodeURIComponent(text));
    if (mail) {
      // the subject is the first line after its label; the body starts after the first blank line
      var first = text.split("\n")[0], cut = first.indexOf(": "), gap = text.indexOf("\n\n");
      var subject = cut >= 0 ? first.slice(cut + 2) : first, body = gap >= 0 ? text.slice(gap + 2) : text;
      mail.setAttribute("href", mailBase + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body));
    }
    paintSlot(val("brand"));
  }

  // the whole letter is shown, never a scrolled window of it (2 px: the textarea's border)
  function fit() {
    letter.style.height = "auto";
    letter.style.height = (letter.scrollHeight + 2) + "px";
  }
  var fitT;
  window.addEventListener("resize", function () { clearTimeout(fitT); fitT = setTimeout(fit, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  // the visitor's brand, after the brands already on the shelf, at their size: the block keeps the page's direction
  // and only the typed text is isolated (a Latin name on /ar/ stays on the right, arabic#1)
  function paintSlot(b) {
    if (!slot || !name) return;
    if (b) {
      var iso = document.createElement("bdi");
      iso.textContent = b;
      name.textContent = "";
      name.appendChild(iso);
      slot.classList.remove("is-empty");
    } else {
      name.textContent = emptyName;
      slot.classList.add("is-empty");
    }
  }

  root.addEventListener("input", compose);
  root.addEventListener("change", compose);
  letter.addEventListener("focus", function () { letter.select(); });

  if (print) print.addEventListener("click", function () {
    var html = document.documentElement, t;
    function done() { html.classList.remove("pt-printing"); window.removeEventListener("afterprint", done); clearTimeout(t); }
    html.classList.add("pt-printing");
    window.addEventListener("afterprint", done);
    t = setTimeout(done, 60000);
    window.print();
  });

  compose();
  root.classList.add("is-ready");
  fit();   // measured once it is on the page: hidden, it has no height to give
})(window.SP);

