/* MIDDLEWARE — site.js v2
   One dictionary (written by tools/fill.py from copy.json), one toggle, the X-ray
   slider, the count-up. No request leaves this page. Arabic is the document. */
(function () {
  'use strict';

  var WA = 'https://wa.me/963953250111?text=';

  /* figures inside the finding names — written by reading/build.py from reading/figures.json */
  var FIG = /*FIG*/{"f1n": "820", "f2n": "40", "f4n": "134", "f4o": "$31,000"}/*/FIG*/;

  /* the dictionary — written by tools/fill.py from site/copy.json; never edit here */
  var T = /*T*/{"ar": {"title": "MIDDLEWARE — بتصير شايف.", "desc": "شركتك عكل تلفون.", "xray.hint": "اسحب وشوف", "xray.label": "الأرقام", "hero.alt": "دفتر وتلفون بالخان", "reading.eb": "القراءة", "reading.h": "ورقتين. أرقامك جنب بعضها.", "reading.cap": "أسامي مشالة، أرقام مدوّرة.", "reading.alt": "القراءة", "f1": "نايمة بـ <span class=\"n\">{f1n}</span> صنف هالسنة", "f2": "بالشهر على <span class=\"n\">{f2n}</span> صنف تغطيتهن تحت الشهرين", "f3": "زبون فوق <span class=\"n\" dir=\"ltr\">$2,000</span> بالسنة، غايبين أربع أشهر", "f4": "عند <span class=\"n\">{f4n}</span> زبون، <span class=\"n\" dir=\"ltr\">{f4o}</span> فوق <span class=\"n\">90</span> يوم", "f5": "بنود انباعوا تحت الكلفة", "client.eb": "زبون: Lightware", "client.h": "لليوم شغّال عالنظام.", "client.p": "موزّع إنارة. كل شي جوّا <span class=\"lat\">Al-Ameen</span>، ولا شي عتلفون صاحبو.", "c1": "صنف عكل تلفون", "c2": "صنف مصوّر عالموقع", "c3": "من تموز، كل ساعة. Al-Ameen بحالو.", "how.eb": "البداية", "how.h": "<span class=\"n\">20</span> دقيقة. <span class=\"n\">3</span> ملفات. ورقتين.", "s1": "<span class=\"n\">20</span> دقيقة. بلا عرض. منسأل وإنت بتحكي.", "s2": "<span class=\"n\">3</span> ملفات، وتعهّد موقّع قبلهن.", "s3": "ورقتين، أصنافك عتلفونك، بعدين السعر.", "s4": "بتدفع لما تختار.", "accountant": "للمحاسب: دخول قراءة بس. جرّبو، بيرفض. واحذفو براحتك.", "build.eb": "الشغل", "build.intro": "أنظمة شركتك، مو تسويقها.", "p.system": "النظام", "p.systemL": "برنامجك عكل تلفون بالمحل، كل ساعة.", "p.morning": "الصبح", "p.morningL": "رقمك قبل ما توصل.", "p.statement": "الكشف", "p.statementL": "كشف بالصور، عالواتساب بثواني.", "p.floor": "الصالة", "p.floorL": "ورق وواتساب، طابور واحد عند يلي بيفوتر.", "p.catalogue": "الكتالوج", "p.catalogueL": "أصنافك بصورة، أو متجر أونلاين.", "p.profile": "البروفايل", "p.profileL": "لزبون من برّا: موقع، بروفايل، عرض سعر.", "p.exception": "الاستثناء", "p.exceptionL": "عندك «إلا لما…»؟ منبنيه.", "proof": "من تموز <span class=\"n\">2026</span>: <span class=\"n\">2,800</span> صنف.", "contact.eb": "المكالمة", "contact.h": "الأرقام عندك. شوفها.", "contact.wa": "واتساب", "foot": "دمشق", "sentence": "برنامج المحاسبة عندك بيعرف كل شي عن شركتك. وإنت ما عم تشوف منو ولا شي.", "answer": "ما منغيّر شي. بس فجأة بتصير شايف.", "btn": "<span class=\"n\">20</span> دقيقة عالتلفون", "btnShort": "<span class=\"n\">20</span> دقيقة", "msg": "مرحبا، شفت الموقع. بدي أحكي معكن ٢٠ دقيقة عن شغلي.", "toggle": "عربي", "toggleName": "العربية"}, "en": {"title": "MIDDLEWARE — Suddenly you can see.", "desc": "Everything in your program, on every phone.", "xray.hint": "Drag to see", "xray.label": "The numbers", "hero.alt": "Ledger and phone, khan storeroom", "reading.eb": "The Reading", "reading.h": "Two pages. Your numbers, side by side.", "reading.cap": "Names removed, figures rounded.", "reading.alt": "The Reading", "f1": "asleep all year in <span class=\"n\">{f1n}</span> items", "f2": "a month on <span class=\"n\">{f2n}</span> items under two months’ cover", "f3": "customers over <span class=\"n\" dir=\"ltr\">$2,000</span> last year, absent four months", "f4": "owed by <span class=\"n\">{f4n}</span> customers, <span class=\"n\" dir=\"ltr\">{f4o}</span> past ninety days", "f5": "lines sold below cost", "client.eb": "A client: Lightware", "client.h": "Still runs on the System.", "client.p": "A lighting distributor. Everything in <span class=\"lat\">Al-Ameen</span>, nothing on the owner’s phone.", "c1": "items on every phone", "c2": "items photographed, published", "c3": "since July, hourly. Al-Ameen untouched.", "how.eb": "The start", "how.h": "<span class=\"n\">20</span> minutes. <span class=\"n\">3</span> files. <span class=\"n\">2</span> pages.", "s1": "<span class=\"n\">20</span> minutes. No pitch. We ask, you talk.", "s2": "<span class=\"n\">3</span> files. Signed undertaking first.", "s3": "Two pages. Your items on your phone. Then a price.", "s4": "You pay when you choose.", "accountant": "For the accountant: read-only login. Watch it fail. Delete anytime.", "build.eb": "The Work", "build.intro": "Systems a business runs on. Not marketing.", "p.system": "The System", "p.systemL": "Your program, every phone, every hour.", "p.morning": "The Morning", "p.morningL": "One number, before you arrive.", "p.statement": "The Statement", "p.statementL": "Statement with photographs, on WhatsApp in seconds.", "p.floor": "The Floor", "p.floorL": "Paper and WhatsApp, one queue for whoever bills.", "p.catalogue": "The Catalogue", "p.catalogueL": "Products photographed. Or a full online store.", "p.profile": "The Profile", "p.profileL": "For the buyer abroad: site, profile, quotation.", "p.exception": "The Exception", "p.exceptionL": "We build your “except when…”.", "proof": "Since July <span class=\"n\">2026</span>: <span class=\"n\">2,800</span> items.", "contact.eb": "The call", "contact.h": "The numbers exist. See them.", "contact.wa": "WhatsApp", "foot": "Damascus", "sentence": "Your accounting program knows everything about your business. You can’t see any of it.", "answer": "Nothing changes. Suddenly you can see.", "btn": "Twenty minutes on the phone", "btnShort": "Twenty minutes", "msg": "Hello, I saw the site. I’d like the twenty minutes about my business.", "toggle": "EN", "toggleName": "English"}}/*/T*/;

  /* the data layer's callouts — written by tools/fill.py from site/copy.json (real figures only) */
  var CALLOUTS = /*CALLOUTS*/[{"cx": 26, "cy": 30, "a": "l", "fig": "$118,600", "ar": "نايمة على الرفوف · 820 صنف", "en": "asleep on the racks · 820 items", "lg": false, "mx": 20, "my": 18.6, "ars": "نايمة · 820 صنف", "ens": "asleep · 820 items"}, {"cx": 86, "cy": 30, "a": "r", "fig": "$15,600", "ar": "مبيع شهري على 40 صنف · أقل من شهرين تغطية", "en": "a month on 40 items · under two months of cover", "lg": false, "mx": 80, "my": 18.6, "ars": "بالشهر · 40 صنف", "ens": "a month · 40 items"}, {"cx": 30, "cy": 46, "a": "l", "fig": "2,829", "ar": "صنف عالدفتر · ولا واحد بلا رقم", "en": "items on the book · not one without a number", "lg": false, "mx": 20, "my": 28.5, "ars": "صنف عالدفتر", "ens": "items on the book"}, {"cx": 26, "cy": 68, "a": "l", "fig": "243", "ar": "صنف بالأحمر · 113 خلصوا", "en": "in the red · 113 out of stock", "lg": false, "mx": 20, "my": 42.2, "ars": "بالأحمر · 113 خلصوا", "ens": "in the red · 113 out"}, {"cx": 82, "cy": 57, "a": "r", "fig": "6", "ar": "بنود انباعوا تحت الكلفة", "en": "lines sold below cost", "lg": false, "mx": 80, "my": 35.3, "ars": "تحت الكلفة", "ens": "below cost"}, {"cx": 62, "cy": 70, "a": "l", "fig": "$79,400", "ar": "مستحقة عند 134 زبون", "en": "owed by 134 customers", "lg": false, "mx": 55.5, "my": 43.4, "ars": "مستحقة · 134 زبون", "ens": "owed · 134 customers"}]/*/CALLOUTS*/;

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
    $$('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (k in d && el.tagName !== 'TITLE') el.textContent = d[k]; });
    $$('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (k in d) el.innerHTML = tpl(d[k]); });
    $$('[data-i18n-alt]').forEach(function (el) { var k = el.getAttribute('data-i18n-alt'); if (k in d) el.alt = d[k]; });
    $$('[data-i18n-aria]').forEach(function (el) { var k = el.getAttribute('data-i18n-aria'); if (k in d) el.setAttribute('aria-label', d[k]); });
    $$('[data-wa]').forEach(function (a) { a.href = WA + encodeURIComponent(d.msg); });
    var narrow = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    $$('#callouts li span').forEach(function (s, i) { var c = CALLOUTS[i]; if (c) s.textContent = (narrow && c[lang + 's']) || c[lang]; });
    var b = document.getElementById('lang'), other = lang === 'ar' ? 'en' : 'ar';
    if (b) { b.textContent = T[other].toggle; b.lang = other; b.setAttribute('aria-label', T[other].toggleName); b.title = T[other].toggleName; }
    try { localStorage.setItem('mw_lang', lang); } catch (e) {}
  }

  /* ---- the X-ray: drag anywhere on the photograph, click to flip, arrows on the keyboard ---- */
  function xray() {
    var box = document.getElementById('xray'), range = document.getElementById('xr-range');
    if (!box || !range) return;
    var list = document.getElementById('callouts');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    CALLOUTS.forEach(function (c) {
      var li = document.createElement('li');
      li.style.setProperty('--cx', c.cx + '%'); li.style.setProperty('--cy', c.cy + '%');
      if (c.mx != null) { li.style.setProperty('--mx', c.mx + '%'); li.style.setProperty('--my', c.my + '%'); }
      li.className = (c.a === 'l' ? 'al' : c.a === 'r' ? 'ar' : '') + (c.lg ? ' lg' : '');
      var b = document.createElement('b'); b.textContent = c.fig;
      var s = document.createElement('span');
      li.appendChild(b); li.appendChild(s); list.appendChild(li);
    });
    // the two frames cover the box at the photograph's own aspect, so callouts stay on the things they name
    var frames = $$('.xr-frame');
    function fit() {
      var W = box.clientWidth, H = box.clientHeight;
      var ar = window.matchMedia('(max-width: 700px)').matches ? 900 / 1125 : 16 / 9;
      var w = W, h = W / ar;
      if (h < H) { h = H; w = H * ar; }
      frames.forEach(function (f) { f.style.width = w + 'px'; f.style.height = h + 'px'; });
    }
    fit(); window.addEventListener('resize', fit);
    var narrow = window.matchMedia('(max-width: 700px)').matches;
    var x = narrow ? 50 : (document.documentElement.dir === 'rtl' ? 42 : 58);   // the data opens on the end side
    function set(v, animate) {
      x = Math.max(4, Math.min(96, v));
      box.style.transition = (animate && !reduce) ? '--x .55s cubic-bezier(.2,.8,.2,1)' : 'none';
      box.style.setProperty('--x', x + '%');
      range.value = String(Math.round(x));
    }
    var dragging = false, moved = 0, startX = 0;
    box.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.hero-inner')) return;
      dragging = true; moved = 0; startX = e.clientX;
      if (box.setPointerCapture) { try { box.setPointerCapture(e.pointerId); } catch (err) {} }
      set((e.clientX - box.getBoundingClientRect().left) / box.clientWidth * 100, false);
    });
    box.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moved = Math.max(moved, Math.abs(e.clientX - startX));
      set((e.clientX - box.getBoundingClientRect().left) / box.clientWidth * 100, false);
    });
    function up() {
      if (!dragging) return; dragging = false;
      if (moved < 6) set(x > 50 ? 8 : 92, true);   // a click flips the layer
    }
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    range.addEventListener('input', function () { set(parseFloat(range.value), false); });
    window.__setX = function (v) { set(v, false); };
    window.__flipX = function () { set(100 - x, false); };       // the language toggle mirrors the seam
    set(x, false);
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
        var t0 = null, D = 900;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / D), k = 1 - Math.pow(1 - p, 3);
          it.el.textContent = it.pre + fmt(it.v * k, it.dec) + it.suf;
          if (p < 1) requestAnimationFrame(step); else it.el.textContent = it.pre + fmt(it.v, it.dec) + it.suf;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    live.forEach(function (it) { it.el.__mw = it; it.el.textContent = it.pre + fmt(0, it.dec) + it.suf; io.observe(it.el); });
  }

  /* ---- the header: transparent over the hero, glass from block 2 down ---- */
  function header() {
    var hd = document.getElementById('hd'), end = document.getElementById('hero-end');
    if (!hd || !end) return;
    if (!('IntersectionObserver' in window)) { hd.classList.add('past'); return; }
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      hd.classList.toggle('past', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(end);
  }

  var lang = 'ar';
  try { lang = localStorage.getItem('mw_lang') === 'en' ? 'en' : 'ar'; } catch (e) {}
  xray();
  apply(lang);
  countUp();
  header();
  var toggle = document.getElementById('lang');
  if (toggle) toggle.addEventListener('click', function () { apply(document.documentElement.lang === 'ar' ? 'en' : 'ar'); });
  window.__setLang = apply;
})();
