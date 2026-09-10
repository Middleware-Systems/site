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

  /* alternate pins up the racks for a callout the headline would cover — written by tools/fill.py from site/copy.json */
  var SLOTS = /*SLOTS*/{"ltr": [[13, 13.5, "l"], [26, 18.5, "l"], [39, 23.5, "l"], [88, 13.5, "r"]], "rtl": [[87, 13.5, "r"], [74, 18.5, "r"], [61, 23.5, "r"], [12, 13.5, "l"]]}/*/SLOTS*/;

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
    var b = document.getElementById('lang'), other = lang === 'ar' ? 'en' : 'ar';
    if (b) { b.textContent = T[other].toggle; b.lang = other; b.setAttribute('aria-label', T[other].toggleName); b.title = T[other].toggleName; }
    try { localStorage.setItem('mw_lang', lang); } catch (e) {}
    if (window.__fitX) window.__fitX();                          // the headline's height changed: the knob and the callouts under it follow
  }

  /* ---- the X-ray: drag anywhere on the picture, click to flip, arrows on the keyboard, a trackpad
     swipe. On load the seam sweeps across once and settles back, so a visitor sees the layer is
     there; the first real interaction retires it, reduced motion never runs it. ---- */
  function xray() {
    var box = document.getElementById('xray'), range = document.getElementById('xr-range');
    if (!box || !range) return;
    var list = document.getElementById('callouts'), knob = box.querySelector('.xr-knob'), inner = document.querySelector('.hero-inner');
    var rmq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduce = !!(rmq && rmq.matches);
    if (rmq && rmq.addEventListener) rmq.addEventListener('change', function (e) { reduce = e.matches; });
    var lis = [];
    CALLOUTS.forEach(function (c) {
      var li = document.createElement('li');
      li.style.setProperty('--cx', c.cx + '%'); li.style.setProperty('--cy', c.cy + '%');
      if (c.mx != null) { li.style.setProperty('--mx', c.mx + '%'); li.style.setProperty('--my', c.my + '%'); }
      li.className = (c.a === 'l' ? 'al' : c.a === 'r' ? 'ar' : '') + (c.lg ? ' lg' : '');
      var b = document.createElement('b'); b.textContent = c.fig;
      var s = document.createElement('span');
      li.appendChild(b); li.appendChild(s); list.appendChild(li); lis.push(li);
    });
    var frames = $$('.xr-frame');
    function ltr() { return document.documentElement.dir !== 'rtl'; }
    function narrow() { return window.matchMedia('(max-width: 700px)').matches; }
    function edge() { return Math.max(4, 48 / box.clientWidth * 100); }        // the knob never parks inside a phone's edge-swipe zone
    // the two frames cover the box at the photograph's own aspect, so callouts stay on the things they name
    function fit() {
      var W = box.clientWidth, H = box.clientHeight;
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
        li.lastChild.textContent = (nar && c[k]) || c[lang] || c.en;
      });
      if (!inner || nar) { box.style.removeProperty('--ky'); box.style.removeProperty('--veil-top'); return; }
      var bt = box.getBoundingClientRect().top, r = inner.getBoundingClientRect();
      // a callout the headline block would cover keeps its dot on a real object: first it tries its own pin with the
      // short label, then the next free alternate pin up the same rack (copy.json → SLOTS, near to far, so they
      // follow the rack's perspective instead of forming a row); only a screen where nothing fits hides it
      function hit(li) { var c = li.getBoundingClientRect(); return c.left < r.right && c.right > r.left && c.top < r.bottom && c.bottom > r.top; }
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
      box.style.setProperty('--ky', ky + 'px');
      box.classList.toggle('cramped', ky + 40 > r.top - bt);                 // the hint would sit on the headline's letters: the pulse invites instead
      box.style.setProperty('--veil-top', Math.max(0, r.top - bt - 24) + 'px');   // the side veil darkens from the headline down, never the shelf above it
    }
    fit(); window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var x = narrow() ? 50 : (ltr() ? 58 : 42), rest = x;                       // the data opens on the end side
    function dataShare() { return ltr() ? 100 - x : x; }
    function set(v) {
      var e = edge();
      x = Math.max(e, Math.min(100 - e, v));
      box.style.setProperty('--x', x + '%');
      range.value = String(Math.round(x));
      range.setAttribute('aria-valuetext', Math.round(dataShare()) + '%');
      box.classList.toggle('sliver', dataShare() < 12);
    }
    function park(reveal) { var e = Math.max(8, edge()); return (ltr() === reveal) ? e : 100 - e; }   // where a flip lands
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
      var far = ltr() ? Math.max(10, edge()) : Math.min(90, 100 - edge());
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
      if (e.button > 0 || e.isPrimary === false) return;                      // right or middle button, or a second finger: not ours
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
  var nq = window.matchMedia && window.matchMedia('(max-width: 700px)');   // a phone turned sideways gets the long captions
  if (nq && nq.addEventListener) nq.addEventListener('change', function () { apply(document.documentElement.lang); });
})();
