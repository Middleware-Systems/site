/* MIDDLEWARE — site.js v2
   One dictionary (written by tools/fill.py from copy.json), one toggle, the X-ray
   slider, the count-up. No request leaves this page. Arabic is the document. */
(function () {
  'use strict';

  var WA = 'https://wa.me/963953250111?text=';

  /* figures inside the finding names — written by reading/build.py from reading/figures.json */
  var FIG = /*FIG*/{"f1n": "820", "f2n": "40", "f3n": "11", "f3m": "4", "f3t": "$2,000", "f4n": "134", "f4o": "$31,000", "f4t": "$79,400", "f4d": "90", "f5n": "6", "cur": "1", "book": "2,829", "pct1": "29", "pct4": "39", "read_on_ar": "أيلول 2026", "read_on_en": "September 2026", "client_ar": "موزّع بالشام", "client_en": "a Damascus distributor", "read_m_ar": "أيلول", "read_m_en": "September", "read_y": "2026"}/*/FIG*/;

  /* the dictionary — written by tools/fill.py from site/copy.json; never edit here */
  var T = /*T*/{"ar": {"title": "MIDDLEWARE — أنظمة وتطبيقات ومواقع لشركتك · دمشق، سوريا", "share": "MIDDLEWARE — نبني ما ينقص شركتك.", "desc": "لا نستبدل ما تعمل عليه شركتك؛ نبني ما ينقصها: أنظمة مخصّصة، وتطبيقات، ومواقع ومتاجر إلكترونية. شركة برمجة في دمشق، سوريا.", "xray.hint": "اسحب لترى", "xray.label": "ما نبنيه", "hero.alt": "ممر مستودع: رفوف وكراتين، وهاتف على كرتونة", "build.qa": "جرّب ما نبنيه", "contact.h": "أخبرنا بما ينقص شركتك.", "contact.wa": "واتساب", "foot": "<span class=\"lat\" lang=\"en\">MIDDLEWARE</span> — شركة برمجة في دمشق، سوريا", "link.system": "برنامج الأمين على الموبايل", "link.statement": "كشف حساب زبون على واتساب", "link.catalogue": "ربط الأمين بمتجر إلكتروني", "link.dead": "بضاعة راكدة وفرق الجرد: أين هي في برنامجك", "link.firm": "عن MIDDLEWARE", "msg": "مرحبا، شفت الموقع. بدي أحكي معكن ٢٠ دقيقة عن شغلي.", "hero.h1": "لا نستبدل ما تعمل عليه شركتك. نبني ما ينقصها.", "cta": "تواصل معنا على واتساب", "ctaShort": "تواصل معنا", "build.h": "ما نبنيه", "t.system.h": "أنظمة مخصّصة", "t.system.p": "أرقام برنامج المحاسبة لديك — الأمين (<span class=\"lat\">Al-Ameen</span>) أو غيره — على كل هاتف.", "t.system.alt": "حاسوب المكتب وعليه دفتر برنامج المحاسبة، ورصيد منه معروض على هاتف.", "t.apps.h": "تطبيقات", "t.apps.p": "للمندوبين والفانات والمستودع، على هواتفهم.", "t.apps.alt": "سيارة توزيع عند المستودع، وكراتينها معدودة على هاتف المندوب.", "t.web.h": "مواقع إلكترونية", "t.web.p": "شركتك على الإنترنت، بالعربية والإنجليزية.", "t.web.alt": "هذا الموقع: صورة المستودع ونسختها المرسومة", "t.store.h": "متاجر إلكترونية", "t.store.p": "منتجاتك مصوّرة، والطلب منها بضغطة.", "t.store.alt": "منتجات مصوّرة؛ تُختار صفيحة زيت زيتون فتنتقل إلى السلة.", "ask": "اسألنا عن هذا", "start.h": "البداية", "st1": "راسلنا على واتساب.", "st2": "مكالمة <span class=\"n\">20</span> دقيقة: نسأل وأنت تتحدث.", "st3": "نعرض عليك ما سنبنيه، ثم السعر.", "pr1": "لا نستبدل شيئًا مما تعمل عليه.", "pr2": "لا نكتب في برنامج المحاسبة لديك؛ نقرأ منه فقط.", "q.link": "أسئلة ما بعد المكالمة", "g.site": "مرحبا، شفت الموقع.", "g.ig": "مرحبا، شفتكم على إنستغرام.", "g.fb": "مرحبا، شفتكم على فيسبوك.", "w.call": "بدي أحكي معكن ٢٠ دقيقة عن شغلي.", "w.system": "مهتم بنظام لشركتي.", "w.apps": "مهتم بتطبيق لشركتي.", "w.web": "مهتم بموقع إلكتروني لشركتي.", "w.store": "مهتم بمتجر إلكتروني لشركتي.", "ft.nav": "صفحات أخرى", "toggle": "عربي", "toggleName": "العربية"}, "en": {"title": "MIDDLEWARE — Systems, apps and websites · Damascus, Syria", "share": "MIDDLEWARE — We build what your business is missing.", "desc": "We don’t replace what your business runs on — we build what’s missing: custom systems, apps, websites and online stores. A software company in Damascus, Syria.", "xray.hint": "Drag to see", "xray.label": "What we build", "hero.alt": "A warehouse aisle: racks of cartons, a phone on one carton", "build.qa": "Try what we build", "contact.h": "Tell us what your business is missing.", "contact.wa": "WhatsApp", "foot": "MIDDLEWARE — a software company in Damascus, Syria", "link.system": "Al-Ameen on mobile", "link.statement": "A customer statement on WhatsApp", "link.catalogue": "Al-Ameen linked to an online store", "link.dead": "Dead stock and the count difference: where they hide in your program", "link.firm": "About MIDDLEWARE", "msg": "Hello, I saw your website. I’d like the twenty minutes about my business.", "hero.h1": "We don’t replace what your business runs on. We build what’s missing.", "cta": "Message us on WhatsApp", "ctaShort": "Contact us", "build.h": "What we build", "t.system.h": "Custom systems", "t.system.p": "Your accounting program’s numbers — Al-Ameen or another — on every phone.", "t.system.alt": "An office computer showing the accounting program’s ledger, and one balance from it on a phone.", "t.apps.h": "Apps", "t.apps.p": "For your reps, vans and warehouse, on their own phones.", "t.apps.alt": "A delivery van at the warehouse, its cartons counted on the rep’s phone.", "t.web.h": "Websites", "t.web.p": "Your company online, in Arabic and English.", "t.web.alt": "This website: the warehouse photograph and its blueprint", "t.store.h": "Online stores", "t.store.p": "Your products photographed, ordered in a tap.", "t.store.alt": "Photographed products; an olive-oil tin is tapped and goes into the cart.", "ask": "Ask about this", "start.h": "How it starts", "st1": "Message us on WhatsApp.", "st2": "A <span class=\"n\">20</span>-minute call: we ask, you talk.", "st3": "We show what we’d build, then the price.", "pr1": "Nothing you run is replaced.", "pr2": "We never write to your accounting program; we only read.", "q.link": "The questions, after the call", "g.site": "Hello, I saw your website.", "g.ig": "Hello, I saw you on Instagram.", "g.fb": "Hello, I saw you on Facebook.", "w.call": "I’d like the twenty minutes about my business.", "w.system": "I’m interested in a system for my business.", "w.apps": "I’m interested in an app for my business.", "w.web": "I’m interested in a website for my business.", "w.store": "I’m interested in an online store for my business.", "ft.nav": "More pages", "toggle": "EN", "toggleName": "English"}}/*/T*/;

  /* the data layer's callouts — written by tools/fill.py from site/copy.json (real figures only) */
  var CALLOUTS = /*CALLOUTS*/[{"cx": 24, "cy": 33, "a": "l", "fig": {"ar": "نظام", "en": "System"}, "ar": "المخزون والحسابات على كل هاتف", "en": "stock and accounts on every phone", "lg": false, "mx": 20, "my": 20.5, "ars": "المخزون على كل هاتف", "ens": "stock on every phone"}, {"cx": 86, "cy": 35, "a": "r", "fig": {"ar": "متجر إلكتروني", "en": "Online store"}, "ar": "أصنافك مصوّرة ومعروضة", "en": "your products, photographed and listed", "lg": false, "mx": 80, "my": 21.7, "ars": "أصنافك على الإنترنت", "ens": "your products online"}, {"cx": 36, "cy": 17, "a": "c", "fig": {"ar": "موقع إلكتروني", "en": "Website"}, "ar": "شركتك على الإنترنت", "en": "your company, online", "lg": false, "mx": 20, "my": 10.5, "ars": "شركتك على الإنترنت", "ens": "your company, online"}, {"cx": 59, "cy": 72, "a": "l", "fig": {"ar": "تطبيق", "en": "App"}, "ar": "على هاتف كل مندوب", "en": "on every rep’s phone", "lg": false, "mx": 51.4, "my": 44.6, "ars": "لكل مندوب", "ens": "for every rep"}]/*/CALLOUTS*/;

  /* alternate pins up the racks for a callout the headline would cover — written by tools/fill.py from site/copy.json */
  var SLOTS = /*SLOTS*/{"ltr": [[13, 13.5, "l"], [26, 18.5, "l"], [39, 23.5, "l"], [88, 13.5, "r"]], "rtl": [[87, 13.5, "r"], [74, 18.5, "r"], [61, 23.5, "r"], [12, 13.5, "l"]]}/*/SLOTS*/;

  /* a pin's name: a figure (one string) or, since 15 Oct 2026, what we build ({ar, en}) */
  function figOf(c) { return typeof c.fig === 'object' ? (c.fig[document.documentElement.lang] || c.fig.en) : c.fig; }

  /* what a visitor sends on WhatsApp: the greeting names where they came from (a profile's link carries
     ?from=instagram or ?from=facebook — no cookie, no pixel: the first message is the count), then what the
     button is about (data-wa="system" …). The words are voice lines, written by tools/fill.py from copy.json. */
  var SRC = (function () {
    var m = /[?&]from=(instagram|ig|facebook|fb)\b/i.exec(location.search);
    if (!m) return 'site';
    var v = m[1].toLowerCase();
    return v === 'instagram' || v === 'ig' ? 'ig' : 'fb';
  })();
  function waText(d, want) { return (d['g.' + SRC] || d['g.site']) + ' ' + (d['w.' + want] || d['w.call']); }

  function tpl(s) { return s.replace(/\{(\w+)\}/g, function (m, k) { return k in FIG ? FIG[k] : '—'; }); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function apply(lang) {
    if (!T[lang]) lang = 'ar';
    var d = T[lang], h = document.documentElement;
    var wasDir = h.dir;
    h.lang = lang;
    h.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (wasDir && wasDir !== h.dir && window.__flipX) window.__flipX();
    if (d.title) document.title = d.title;
    $$('[data-i18n-content]').forEach(function (el) { var k = el.getAttribute('data-i18n-content'); if (k in d) el.content = d[k]; });
    $$('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (k in d && el.tagName !== 'TITLE') el.textContent = tpl(d[k]); });
    $$('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (k in d) el.innerHTML = tpl(d[k]); });
    $$('[data-i18n-alt]').forEach(function (el) { var k = el.getAttribute('data-i18n-alt'); if (k in d) el.alt = d[k]; });
    $$('[data-i18n-aria]').forEach(function (el) { var k = el.getAttribute('data-i18n-aria'); if (k in d) el.setAttribute('aria-label', tpl(d[k])); });
    $$('[data-wa]').forEach(function (a) { a.href = WA + encodeURIComponent(waText(d, a.getAttribute('data-wa'))); });
    var b = document.getElementById('lang'), other = lang === 'ar' ? 'en' : 'ar';
    if (b) { b.textContent = T[other].toggle; b.lang = other; b.setAttribute('aria-label', T[other].toggleName); b.title = T[other].toggleName; }   // its href is the other document's URL, written by fill.py
    try { localStorage.setItem('mw_lang', lang); } catch (e) {}   // not read here any more (the language is the URL) — questions/ reads it to open in the same language
    if (window.__fitX) window.__fitX();                          // the headline's height changed: the knob and the callouts under it follow
  }

  /* ---- the X-ray: drag anywhere on the picture, click to flip, arrows on the keyboard, a trackpad
     swipe. On load the seam sweeps across once and settles back, so a visitor sees the layer is
     there; the first real interaction retires it, reduced motion never runs it. ---- */
  function xray() {
    var box = document.getElementById('xray'), range = document.getElementById('xr-range');
    if (!box || !range) return;
    var list = document.getElementById('callouts'), knob = box.querySelector('.xr-knob'), inner = document.querySelector('.hero-inner'),
        hint = box.querySelector('.xr-hint'), tag = box.querySelector('.xr-tag');
    var rmq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduce = !!(rmq && rmq.matches);
    if (rmq && rmq.addEventListener) rmq.addEventListener('change', function (e) { reduce = e.matches; });
    var lis = [];
    CALLOUTS.forEach(function (c) {
      var li = document.createElement('li');
      li.style.setProperty('--cx', c.cx + '%'); li.style.setProperty('--cy', c.cy + '%');
      if (c.mx != null) { li.style.setProperty('--mx', c.mx + '%'); li.style.setProperty('--my', c.my + '%'); }
      li.className = (c.a === 'l' ? 'al' : c.a === 'r' ? 'ar' : '') + (c.lg ? ' lg' : '');
      var b = document.createElement('b'); b.textContent = figOf(c);
      var s = document.createElement('span');
      li.appendChild(b); li.appendChild(s); list.appendChild(li); lis.push(li);
    });
    var frames = $$('.xr-frame');
    var x = narrow() ? 50 : (ltr() ? 58 : 42), rest = x;                       // the data opens on the end side
    function ltr() { return document.documentElement.dir !== 'rtl'; }
    function narrow() { return window.matchMedia('(max-width: 700px)').matches; }
    function edge() { return Math.max(4, 48 / box.clientWidth * 100); }        // the KNOB never parks inside a phone's edge-swipe zone; the seam itself goes to the edge
    // the two frames cover the box at the photograph's own aspect, so callouts stay on the things they name
    function fit() {
      var W = box.clientWidth, H = box.clientHeight;
      boxW = W; box.style.setProperty('--bw', W + 'px');
      if (x !== undefined) set(x);   // the pixel positions follow the width
      var ar = narrow() ? 900 / 1125 : 16 / 9;
      var w = W, h = W / ar;
      if (h < H) { h = H; w = H * ar; }
      frames.forEach(function (f) { f.style.width = w + 'px'; f.style.height = h + 'px'; });
      // every callout back on its own pin with its long label (the phone keeps the short ones)
      var nar = narrow(), lang = document.documentElement.lang, k = lang + 's';
      function pin(li, c, cx, cy, a, slot) {
        li.style.setProperty('--cx', cx + '%'); li.style.setProperty('--cy', cy + '%');
        li.className = (a === 'l' ? 'al' : a === 'r' ? 'ar' : '') + (slot ? ' slot' : '') + (c.lg ? ' lg' : '');
      }
      lis.forEach(function (li, i) {
        var c = CALLOUTS[i]; if (!c) return;
        pin(li, c, c.cx, c.cy, c.a, false);
        li.firstChild.textContent = figOf(c); li.lastChild.textContent = (nar && c[k]) || c[lang] || c.en;
      });
      var bt = box.getBoundingClientRect().top, r = inner ? inner.getBoundingClientRect() : null;
      // the knob cluster's real boxes, measured once (the hint and the tag are wider in English than in Arabic)
      var hintR = hint ? hint.getBoundingClientRect() : { width: 110, height: 26 }, tagR = tag ? tag.getBoundingClientRect() : { width: 112, height: 24 };
      var hw = hintR.width / 2 + 2, hb = 34 + hintR.height + 2, tw = tagR.width + 2, tb = tagR.height - 14 + 2;
      var rects = [];
      function collect() { rects = []; lis.forEach(function (li, i) { if (CALLOUTS[i] && getComputedStyle(li).display !== 'none' && !li.classList.contains('under')) { var c = li.getBoundingClientRect(); rects.push([c.left, c.right, c.top - bt, c.bottom - bt]); } }); }
      function overlap(x0, x1, y0, y1) { var a = 0; rects.forEach(function (b) { a += Math.max(0, Math.min(x1, b[1]) - Math.max(x0, b[0])) * Math.max(0, Math.min(y1, b[3]) - Math.max(y0, b[2])); }); return a; }
      function cost(cy, kxs, withHint) {   // the knob at each x in kxs, the tag beside it on the data side, the hint under it
        var a = 0, L = ltr();
        kxs.forEach(function (kx) {
          a += overlap(kx - 23, kx + 23, cy - 23, cy + 23);
          a += L ? overlap(kx + 34, kx + 34 + tw, cy - 14, cy + tb) : overlap(kx - 34 - tw, kx - 34, cy - 14, cy + tb);
          if (withHint) a += overlap(kx - hw, kx + hw, cy + 24, cy + hb);
        });
        return a;
      }
      function hit(li) { var c = li.getBoundingClientRect(); return !!r && c.left < r.right && c.right > r.left && c.top < r.bottom && c.bottom > r.top; }
      if (nar) {
        // a phone: first, a callout pinned past the screen's edge slides inside it (the frame is wider than a tall phone)
        lis.forEach(function (li, i) {
          if (!CALLOUTS[i] || getComputedStyle(li).display === 'none') return;
          var c = li.getBoundingClientRect(), over = c.right > W - 4 ? c.right - (W - 4) : c.left < 4 ? c.left - 4 : 0;
          if (over) li.style.setProperty('--mx', (parseFloat(li.style.getPropertyValue('--mx') || li.style.getPropertyValue('--cx')) - over / frames[0].getBoundingClientRect().width * 100) + '%');
        });
        // a callout the headline block covers is hidden rather than cut through (a 560 px viewport has no room for six):
        lis.forEach(function (li, i) { if (CALLOUTS[i]) li.classList.toggle('under', getComputedStyle(li).display !== 'none' && hit(li)); });
        // then the knob's row: it parks 48 px inside either edge when the seam is at the end, so its row must be clear of the
        // callouts at BOTH clamps and above the headline — the lowest such band (nearest the thumb), with the hint under
        // it when that fits, without it when not; on a short phone the strip under the glass header counts, and the row
        // that covers the least is the last resort (.squeezed). The tag rides beside the knob on phones too, as on the desktop.
        box.style.removeProperty('--veil-top');
        collect();
        var hl = r ? r.top - bt : H, L = ltr(), kin = L ? 48 : W - 48, kout = L ? W - 48 : 48;
        var lg = document.getElementById('lang'), floor = lg ? Math.ceil(lg.getBoundingClientRect().bottom - bt) + 23 + 4 : 68;   // clear of the language toggle
        var best = 0, bestCost = Infinity, ky = 0, cramped = true, cy;
        for (cy = Math.floor(hl - 16 - hb); cy >= floor; cy -= 2) { if (cost(cy, [kin, kout], true) === 0) { ky = cy; cramped = false; break; } }
        if (!ky) for (cy = Math.floor(hl - 16 - 23); cy >= floor; cy -= 2) { var k = cost(cy, [kin, kout], false); if (k === 0) { ky = cy; break; } if (k < bestCost) { bestCost = k; best = cy; } }
        box.classList.toggle('squeezed', !ky);
        if (!ky) ky = best || Math.round(H * 0.42);
        box.style.setProperty('--ky', ky + 'px');
        box.classList.toggle('cramped', cramped);
        return;
      }
      if (!inner) { box.style.removeProperty('--ky'); box.style.removeProperty('--veil-top'); return; }
      // a callout the headline block would cover keeps its dot on a real object: first it tries its own pin with the
      // short label, then the next free alternate pin up the same rack (copy.json → SLOTS, near to far, so they
      // follow the rack's perspective instead of forming a row); only a screen where nothing fits hides it
      var placed = [], fh = list.getBoundingClientRect().height, moving = [];
      lis.forEach(function (li, i) { if (CALLOUTS[i]) { if (hit(li)) moving.push(i); else placed.push(li.getBoundingClientRect()); } });
      function settle(li) {                                          // slide down the carton until clear of the header and of every box already placed
        for (var t = 0; t < 8; t++) {
          var rc = li.getBoundingClientRect(), dy = 0;
          if (rc.top < bt + 64) dy = bt + 64 - rc.top;
          placed.forEach(function (o) { if (rc.left < o.right && rc.right > o.left && rc.top < o.bottom && rc.bottom > o.top) dy = Math.max(dy, o.bottom + 8 - rc.top); });
          if (dy < 0.5) break;
          li.style.setProperty('--cy', (parseFloat(li.style.getPropertyValue('--cy')) + dy / fh * 100) + '%');
        }
        return !hit(li);
      }
      var slots = (SLOTS[ltr() ? 'ltr' : 'rtl'] || []).slice();
      moving.forEach(function (i) {
        var li = lis[i], c = CALLOUTS[i];
        li.lastChild.textContent = c[k] || c[lang] || c.en;
        if (settle(li)) { placed.push(li.getBoundingClientRect()); return; }
        while (slots.length) {
          var sl = slots.shift(); pin(li, c, sl[0], sl[1], sl[2], true);
          if (settle(li)) { placed.push(li.getBoundingClientRect()); return; }
        }
        li.classList.add('under');
      });
      // the knob, its tag and its hint are one cluster on the seam: clear of the header, the shelf and, when there is room, the headline
      var ky = Math.max(110, Math.min(H * 0.34, r.top - bt - 48));
      // at rest the knob, its tag and its hint must not sit on a figure: the nearest clear band to the preferred row wins
      collect();
      var eD = edge() / 100 * W, kxs = [rest / 100 * W, eD, W - eD], hlD = r.top - bt, cramped = ky + 40 > hlD;
      function band(withHint) {   // the nearest row to the preferred one where the cluster covers no figure; 0 if none
        if (cost(ky, kxs, withHint) === 0) return ky;
        for (var d = 2; d <= 240; d += 2) {
          var up = ky - d, dn = ky + d;
          if (up >= 110 && cost(up, kxs, withHint) === 0) return up;
          if (dn + 23 + (withHint ? hb - 23 : 0) + 16 <= hlD && cost(dn, kxs, withHint) === 0) return dn;
        }
        return 0;
      }
      var kyB = cramped ? 0 : band(true);
      if (!kyB) { kyB = band(false); if (kyB) cramped = true; }   // no row holds the hint too: the pulse invites instead
      if (kyB) ky = kyB;
      box.style.setProperty('--ky', ky + 'px');
      box.classList.toggle('cramped', cramped);                              // the hint would sit on the headline's letters: the pulse invites instead
      box.style.setProperty('--veil-top', Math.max(0, r.top - bt - 24) + 'px');   // the side veil darkens from the headline down, never the shelf above it
    }
    fit(); window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    function dataShare() { return ltr() ? 100 - x : x; }
    var boxW = 0;
    function set(v) {
      var e = edge(), kx, W = boxW || (boxW = box.clientWidth);
      x = Math.max(0, Math.min(100, v));                                      // to the very edge: a callout pinned there shows whole (Samir, 18 Sep 2026)
      kx = Math.max(e, Math.min(100 - e, x));
      box.style.setProperty('--x', x + '%');
      box.style.setProperty('--kx', kx + '%');   // the knob, its tag and its hint stop 48 px short and let the line go on
      box.style.setProperty('--xp', (x / 100 * W).toFixed(2) + 'px');    // the same two in pixels: the seam and the knob move by transform, which is not a layout shift
      box.style.setProperty('--kp', (kx / 100 * W).toFixed(2) + 'px');
      range.value = String(Math.round(x));
      range.setAttribute('aria-valuetext', Math.round(dataShare()) + '%');
      box.classList.toggle('sliver', dataShare() < 12);
    }
    function park(reveal) { return (ltr() === reveal) ? 0 : 100; }   // where a flip lands: the whole layer, every figure whole
    // one tween, driven by requestAnimationFrame — a custom property does not transition on its own
    var tw = null, raf = 0;
    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
    function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; tw = null; }
    function step(ts) {
      var t = tw; if (!t) return;
      if (t.t0 === null) t.t0 = ts;
      var p = Math.min(1, (ts - t.t0) / t.D);
      set(t.from + (t.to - t.from) * t.ease(p));
      if (p < 1) raf = requestAnimationFrame(step); else { raf = 0; tw = null; if (t.done) t.done(); }
    }
    function tween(to, D, ease, done) {
      stop();
      if (reduce) { set(to); if (done) done(); return; }
      tw = { from: x, to: to, t0: null, D: D, ease: ease, done: done };
      raf = requestAnimationFrame(step);
    }
    // the intro: out to the far side (the data covering nine tenths), a beat, back to rest, then the knob breathes twice
    var hold = 0, touched = false;
    function unhold() { if (hold) { clearTimeout(hold); hold = 0; } }
    function retire() {                                                        // the first real interaction: the hint goes, the knob stops breathing
      if (touched) return;
      touched = true; unhold(); box.classList.add('touched');
      if (knob) knob.classList.remove('pulse');
    }
    function sweep() {
      hold = 0;
      if (touched || reduce || box.getBoundingClientRect().bottom <= 0) return;   // opened scrolled past the hero: nothing to show
      var far = ltr() ? 0 : 100;                                              // the intro shows the whole layer once
      tween(far, 1500, easeInOut, function () {
        hold = setTimeout(function () {
          hold = 0;
          tween(rest, 1300, easeInOut, function () { if (knob && !touched) knob.classList.add('pulse'); });
        }, 700);
      });
    }
    function ready() {   // both frames decoded, or 2.5 s, whichever first
      var imgs = $$('.xr-frame img');
      var all = Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; }));
      return Promise.race([all, new Promise(function (r) { setTimeout(r, 2500); })]);
    }
    if (!reduce) ready().then(function () { if (!touched && !hold) hold = setTimeout(sweep, 600); });
    // the drag is RELATIVE from wherever the hand lands — the seam moves by what the hand moves and never
    // jumps under it; on the knob the grab keeps its offset. A tap (no movement, under half a second) flips:
    // whichever layer is smaller takes the frame. The first contact owns the drag; a second finger is
    // ignored. A sideways move past the gate starts the drag; a vertical one is the page's own scroll, and
    // if the browser then takes the gesture the seam goes back where the hand found it. The browser's own
    // image drag is refused outright (dragstart) — it would tear a ghost across the screen and cancel the pointer.
    var dragging = false, locked = false, moved = 0, startX = 0, startY = 0, x0 = x, xDown = x, pid = null, t0 = 0, gate = 3, slop = 6, onKnob = false, wasIntro = true, isTouch = false;
    box.addEventListener('dragstart', function (e) { e.preventDefault(); });
    function endDrag() { dragging = false; locked = false; pid = null; box.classList.remove('dragging'); }
    function onDown(e) {
      if (e.button > 0) return;                                             // right or middle button: not ours
      if (dragging && locked) return;                                         // a finger already dragging keeps the seam; a resting finger (the thumb holding the phone) yields to the one that lands next
      stop(); unhold();                                                       // whatever was moving freezes under the hand; a stale drag is simply replaced
      isTouch = e.pointerType !== 'mouse';
      gate = isTouch ? 8 : 3; slop = isTouch ? 12 : 6;
      dragging = true; locked = false; moved = 0; startX = e.clientX; startY = e.clientY; x0 = xDown = x; pid = e.pointerId; t0 = e.timeStamp;
      onKnob = !!(e.target && e.target.closest && e.target.closest('.xr-knob')); wasIntro = !touched;
      box.classList.add('dragging');
      if (e.pointerId != null && box.setPointerCapture) { try { box.setPointerCapture(e.pointerId); } catch (err) {} }
      if (!isTouch) {                                                         // a mouse: no selection, no focus theft, and the arrows work right after
        if (e.preventDefault) e.preventDefault();
        try { range.focus({ preventScroll: true }); } catch (err) { try { range.focus(); } catch (err2) {} }
      }
    }
    function onMove(e) {
      if (!dragging || e.pointerId !== pid) return;
      if (!isTouch && e.buttons === 0) { endDrag(); return; }                // a mouse release this page never saw
      var dx = e.clientX - startX, dy = e.clientY - startY;
      moved = Math.max(moved, Math.sqrt(dx * dx + dy * dy));
      if (!locked) {
        // a finger: the browser has already refused to scroll sideways (touch-action), so a sideways move past the
        // gate is ours — a vertical one arrives as pointercancel. A mouse also has to be more across than down.
        if (Math.abs(dx) < gate || (!isTouch && Math.abs(dx) <= Math.abs(dy))) return;
        locked = true; retire();
      }
      var v = x0 + dx / box.clientWidth * 100;
      set(v);
      if (x !== v) { x0 = x; startX = e.clientX; }                             // at the clamp: re-anchor, so reversing moves at once
    }
    function flip(reveal) { tween(park(reveal), 550, easeOut); }
    function onUp(e) {
      if (!dragging || e.pointerId !== pid) return;
      var tap = !locked && moved < slop && (e.timeStamp - t0) < 500, wi = wasIntro;
      endDrag();
      if (tap) { retire(); if (!onKnob) flip(wi || dataShare() <= 50); }      // the first tap always reveals; the knob is a handle, not a switch
      else if (!locked && !touched) tween(rest, 500, easeOut);                // a long hold mid-intro: settle
    }
    function onCancel(e) {
      if (!dragging || e.pointerId !== pid) return;
      var wasLocked = locked; endDrag();
      if (wasLocked) tween(xDown, 160, easeOut);                              // the browser took the gesture: back where the hand found it
      else if (!touched) tween(rest, 500, easeOut);                           // a scroll that began on the picture mid-intro: settle
    }
    if (window.PointerEvent) {
      box.addEventListener('pointerdown', onDown);
      box.addEventListener('pointermove', onMove);
      box.addEventListener('pointerup', onUp);
      box.addEventListener('pointercancel', onCancel);
      box.addEventListener('lostpointercapture', function (e) { if (dragging && !isTouch && e.pointerId === pid) endDrag(); });   // a mouse only: a finger's end is its up or cancel
    } else {                                                                  // no pointer events (iOS 12 and older): the same rules from touch events
      function tp(te, type) {
        var t = te.changedTouches[0];
        return { pointerId: t.identifier, pointerType: 'touch', isPrimary: te.touches.length <= 1 || t.identifier === pid, button: 0, buttons: 1,
                 clientX: t.clientX, clientY: t.clientY, timeStamp: te.timeStamp, target: te.target, type: type };
      }
      box.addEventListener('touchstart', function (te) { if (te.touches.length === 1) onDown(tp(te, 'pointerdown')); }, { passive: true });
      box.addEventListener('touchmove', function (te) { onMove(tp(te, 'pointermove')); }, { passive: true });
      box.addEventListener('touchend', function (te) { onUp(tp(te, 'pointerup')); });
      box.addEventListener('touchcancel', function (te) { onCancel(tp(te, 'pointercancel')); });
      box.addEventListener('mousedown', function (e) { onDown({ pointerId: 1, pointerType: 'mouse', isPrimary: true, button: e.button, buttons: e.buttons, clientX: e.clientX, clientY: e.clientY, timeStamp: e.timeStamp, target: e.target, preventDefault: function () { e.preventDefault(); } }); });
      window.addEventListener('mousemove', function (e) { onMove({ pointerId: 1, pointerType: 'mouse', buttons: e.buttons, clientX: e.clientX, clientY: e.clientY }); });
      window.addEventListener('mouseup', function (e) { onUp({ pointerId: 1, timeStamp: e.timeStamp }); });
    }
    box.addEventListener('wheel', function (e) {                               // a trackpad's sideways swipe slides the seam instead of going "back"
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); stop(); retire();
      set(x - e.deltaX / box.clientWidth * 100);
    }, { passive: false });
    range.addEventListener('input', function () { stop(); retire(); set(parseFloat(range.value)); });
    window.__setX = function (v) { stop(); retire(); set(v); };
    window.__flipX = function () {                                             // the language toggle mirrors the seam — mid-drag and mid-intro too
      rest = 100 - rest; x0 = 100 + x0 - 2 * x; xDown = 100 - xDown;
      if (tw) { tw.from = 100 - tw.from; tw.to = 100 - tw.to; }
      set(100 - x);
    };
    window.__fitX = fit;
    if (/[?&]debug\b/.test(location.search)) {                                 // ?debug — an on-screen log of what the phone actually sends, for a screenshot
      var dbg = document.createElement('pre'); dbg.id = 'xr-debug';
      dbg.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:38vh;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,.85);color:#9AD4FF;font:11px/1.4 monospace;z-index:99;direction:ltr;text-align:left;white-space:pre-wrap';
      document.body.appendChild(dbg);
      var n = 0;
      function logEv(e) {
        n++; var line = n + ' ' + e.type + ' ' + (e.pointerType || '') + ' id' + e.pointerId + (e.isPrimary === false ? ' 2nd' : '') + ' x' + Math.round(e.clientX || 0) + ' y' + Math.round(e.clientY || 0) + ' → --x ' + x.toFixed(1) + (dragging ? ' drag' : '') + (locked ? ' locked' : '') + '\n';
        dbg.textContent = line + dbg.textContent.slice(0, 4000);
      }
      ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (t) { box.addEventListener(t, logEv, { passive: true }); });
      dbg.textContent = 'MIDDLEWARE hero debug · PointerEvent ' + (window.PointerEvent ? 'yes' : 'NO') + ' · UA ' + navigator.userAgent + '\n';
      window.addEventListener('error', function (ev) { dbg.textContent = 'ERROR ' + ev.message + ' @' + ev.lineno + '\n' + dbg.textContent; });
    }
    window.__xrIntro = function () { return { x: x, rest: rest, running: !!tw || !!hold, touched: touched }; };   // for the harness
    set(x);
  }

  /* ---- the count-up: a figure counts from zero to its value the first time it enters view ---- */
  function fmt(v, dec) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countUp() {
    var els = $$('[data-count]');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var live = [];
    els.forEach(function (el) {
      var v = parseFloat(el.getAttribute('data-value'));
      if (!isFinite(v)) { console.error('MIDDLEWARE: a figure is missing on the page —', el); return; }
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
      el.textContent = pre + fmt(v, dec) + suf;
      live.push({ el: el, v: v, dec: dec, pre: pre, suf: suf });
    });
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var it = e.target.__mw; if (!it || it.done) return;
        it.done = true;
        it.el.textContent = it.pre + fmt(0, it.dec) + it.suf;   // zeroed only now, 200 px before it scrolls in: a visitor sees a number in motion, never the figure blinking to zero
        var t0 = null, D = 900;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / D), k = 1 - Math.pow(1 - p, 3);
          it.el.textContent = it.pre + fmt(it.v * k, it.dec) + it.suf;
          if (p < 1) requestAnimationFrame(step); else it.el.textContent = it.pre + fmt(it.v, it.dec) + it.suf;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0, rootMargin: '0px 0px 200px 0px' });
    var vh = window.innerHeight + 200;
    live.forEach(function (it) {
      it.el.__mw = it;
      if (it.el.getBoundingClientRect().top < vh) it.el.textContent = it.pre + fmt(0, it.dec) + it.suf;   // already in view: from zero at once, no flash
      io.observe(it.el);   // below the fold the real figure stays in the DOM until the observer fires — a crawler that never scrolls indexes the number, not a zero
    });
  }

  /* ---- the header: transparent over the hero, glass below it. On a phone the WhatsApp bar rises under the
     thumb once the hero has scrolled away, and steps aside while the last section's own button is on screen. ---- */
  function header() {
    var hd = document.getElementById('hd'), end = document.getElementById('hero-end'),
        bar = document.getElementById('wa-bar'), contact = document.getElementById('contact');
    if (!hd || !end) return;
    if (!('IntersectionObserver' in window)) { hd.classList.add('past'); if (bar) bar.classList.add('on'); return; }
    var past = false, atEnd = false;
    function show() { if (bar) bar.classList.toggle('on', past && !atEnd); }
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      past = !e.isIntersecting && e.boundingClientRect.top < 0;
      hd.classList.toggle('past', past); show();
    }, { threshold: 0 }).observe(end);
    if (contact) new IntersectionObserver(function (entries) { atEnd = entries[0].isIntersecting; show(); }, { threshold: 0.35 }).observe(contact);
  }

  var lang = document.documentElement.lang === 'en' ? 'en' : 'ar';   // the language is the URL: / is Arabic, /en/ is English (20 Sep 2026); the toggle is a link between them
  xray();
  apply(lang);
  countUp();
  header();
  var toggle = document.getElementById('lang');
  if (toggle) toggle.addEventListener('click', function () {   // the other document opens at the block he was reading, not at the top
    var cur = '';
    $$('section[id]').forEach(function (sec) { if (sec.id !== 'hero' && sec.getBoundingClientRect().top <= 80) cur = sec.id; });   // the hero is the top: no anchor
    toggle.href = toggle.getAttribute('href').split('#')[0] + (cur ? '#' + cur : '');
  });
  window.__setLang = apply;   // the harnesses switch a document's words in place
  var nq = window.matchMedia && window.matchMedia('(max-width: 700px)');   // a phone turned sideways gets the long captions
  if (nq && nq.addEventListener) nq.addEventListener('change', function () { apply(document.documentElement.lang); });
})();
