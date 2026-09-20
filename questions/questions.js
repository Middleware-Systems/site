/* MIDDLEWARE — questions.js (17 Sep 2026 · voice 20 Sep)
   Twelve questions, answered on a phone. Nothing leaves the page until he taps send: the answers
   live in localStorage under one key, and the send button is a wa.me link whose text is rebuilt on
   every keystroke. ES5 on purpose — the phones this is for are not new. No network, no library.
   Voice: a recording stays on the phone (IndexedDB) and reaches WhatsApp by the phone's own share
   sheet, in a second tap after the message — see the voice block at the foot. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var S = JSON.parse(doc.getElementById('strings').textContent);
  var KEY = 'mw_q1', LKEY = 'mw_lang';
  var qs = slice(doc.querySelectorAll('.q'));
  var send = doc.getElementById('send'), pn = doc.getElementById('pn'), copyBtn = doc.getElementById('copy'),
      clearBtn = doc.getElementById('clear'), toggle = doc.getElementById('lang'),
      forEl = doc.getElementById('for');

  function slice(l) { return Array.prototype.slice.call(l); }
  function lang() { return html.lang === 'en' ? 'en' : 'ar'; }
  function tog(el, cls, on) { if (on) el.classList.add(cls); else el.classList.remove(cls); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function ta(li) { return li.querySelector('textarea'); }
  function radios(li) { return slice(li.querySelectorAll('.chips input')); }
  function qval(li) {
    var t = ta(li), c = li.querySelector('.chips input:checked');
    return { t: t ? t.value.replace(/\s+$/, '') : '', c: c ? parseInt(c.value, 10) : -1, r: !!(recs && recs[li.getAttribute('data-n')]) };
  }
  function answered(v) { return !!(v.t || v.c >= 0 || v.r); }
  function chipText(li, i, l) {
    var lab = li.querySelectorAll('.chips label')[i]; if (!lab) return '';
    var s = lab.querySelector('.i18n[lang="' + l + '"]'); return s ? s.textContent : '';
  }
  function collect() {
    var out = {};
    qs.forEach(function (li) { var v = qval(li); if (v.t || v.c >= 0) out[li.getAttribute('data-n')] = { t: v.t, c: v.c }; });
    return out;
  }

  /* the message, in the language he is reading; unanswered numbers are listed so nobody guesses */
  function compose() {
    var l = lang(), s = S[l], lines = [s.msgHead], miss = [], any = false;
    var name = forEl ? forEl.getAttribute('data-name') : '';
    if (name) lines.push(s['for'].replace('{name}', name));
    lines.push('');
    qs.forEach(function (li, i) {
      var n = li.getAttribute('data-n'), v = qval(li);
      if (!answered(v)) { miss.push(n); return; }
      any = true;
      var a = [];
      if (v.c >= 0) a.push(chipText(li, v.c, l));
      if (v.t) a.push(v.t);
      if (v.r) a.push(s.msgVoice);
      lines.push('*' + n + '. ' + S.titles[l][i] + '*');
      lines.push(a.join(' — '));
      lines.push('');
    });
    if (!any) return s.msgEmpty;
    if (miss.length) lines.push(s.msgMissing.replace('{list}', miss.join(l === 'ar' ? '، ' : ', ')));
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
  }

  function refresh() {
    var n = 0;
    qs.forEach(function (li) { var a = answered(qval(li)); tog(li, 'done', a); if (a) n++; });
    if (pn && pn.textContent !== String(n)) pn.textContent = n;
    html.style.setProperty('--p', (n / qs.length * 100) + '%');
    var msg = compose();
    if (send) send.href = 'https://wa.me/' + S.wa + '?text=' + encodeURIComponent(msg);
    tog(doc.body, 'long', msg.length > 3000);   // long enough that a phone's WhatsApp may open it empty: the copy button is the fallback, and the page says so
    var rn = 0; for (var k in recs) if (recs.hasOwnProperty(k)) rn++;
    if (vsend) {
      vsend.hidden = !rn;
      slice(vsend.querySelectorAll('#sendVoice .i18n')).forEach(function (sp) {
        var l = sp.getAttribute('lang'); sp.textContent = S[l].sendVoice.replace('{n}', rn);
      });
    }
  }

  function grow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }

  function apply(l) {
    if (l !== 'en') l = 'ar';
    html.lang = l; html.dir = l === 'en' ? 'ltr' : 'rtl';
    doc.title = S[l].title;
    qs.forEach(function (li) { var t = ta(li); if (t) t.placeholder = t.getAttribute('data-ph-' + l) || ''; });
    slice(doc.querySelectorAll('[data-aria-' + l + ']')).forEach(function (el) { el.setAttribute('aria-label', el.getAttribute('data-aria-' + l)); });
    if (toggle) {
      var o = l === 'en' ? 'ar' : 'en';
      toggle.textContent = S[o].toggle; toggle.setAttribute('lang', o);
      toggle.setAttribute('aria-label', S[o].toggleName); toggle.title = S[o].toggleName;
    }
    if (forEl) { var nm = forEl.getAttribute('data-name'); if (nm) forEl.textContent = S[l]['for'].replace('{name}', nm); }
    var home = doc.querySelector('a.wm'); if (home) home.setAttribute('href', l === 'en' ? '../en/' : '../');   // the one page's language is its URL: home in the language he is reading
    try { localStorage.setItem(LKEY, l); } catch (e) {}
    refresh();
    growAll();
  }
  function growAll() { qs.forEach(function (li) { var t = ta(li); if (t) grow(t); }); }
  window.addEventListener('resize', growAll);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(growAll, function () {});   // the real face is wider than the fallback: measure again

  /* ?to=Name — the page greets the company by name; the name lives in this URL and nowhere else */
  (function () {
    var m = /[?&]to=([^&#]*)/.exec(location.search), name = '';
    try { name = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; } catch (e) { name = ''; }
    name = name.replace(/[<>"'$]/g, '').replace(/[\x00-\x1f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (name && forEl) { forEl.setAttribute('data-name', name); forEl.hidden = false; }
  })();

  /* restore what he typed last time on this phone */
  var saved = load();
  qs.forEach(function (li) {
    var v = saved[li.getAttribute('data-n')]; if (!v) return;
    var t = ta(li); if (t && v.t) t.value = v.t;
    if (v.c >= 0) { var r = radios(li)[v.c]; if (r) r.checked = true; }
  });

  var timer = null;
  function changed() {
    refresh();
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { save(collect()); }, 150);
  }
  qs.forEach(function (li) {
    var t = ta(li);
    if (t) t.addEventListener('input', function () { grow(t); changed(); });
    radios(li).forEach(function (r) {
      r.addEventListener('click', function () {           // a second tap on the chosen chip clears it
        if (r.getAttribute('data-was') === '1') { r.checked = false; }
        radios(li).forEach(function (o) { o.setAttribute('data-was', o.checked ? '1' : '0'); });
        changed();
      });
      r.setAttribute('data-was', r.checked ? '1' : '0');
    });
  });

  function flash(btn) { tog(btn, 'did', true); setTimeout(function () { tog(btn, 'did', false); }, 1600); }
  function legacyCopy(text) {
    var t = doc.createElement('textarea'); t.value = text; t.setAttribute('readonly', '');
    t.style.position = 'fixed'; t.style.top = '0'; t.style.opacity = '0'; doc.body.appendChild(t);
    t.focus(); t.select(); try { t.setSelectionRange(0, text.length); } catch (e) {}
    var ok = false; try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    doc.body.removeChild(t); return ok;
  }
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var text = compose();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(copyBtn); }, function () { if (legacyCopy(text)) flash(copyBtn); });
    } else if (legacyCopy(text)) flash(copyBtn);
  });
  if (clearBtn) clearBtn.addEventListener('click', function () {
    if (!window.confirm(S[lang()].clearAsk)) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    qs.forEach(function (li) { var t = ta(li); if (t) { t.value = ''; grow(t); } radios(li).forEach(function (r) { r.checked = false; r.setAttribute('data-was', '0'); }); });
    qs.forEach(function (li) { dropRec(li, false); });
    recClear();
    refresh();
  });
  if (toggle) toggle.addEventListener('click', function () { apply(lang() === 'ar' ? 'en' : 'ar'); });

  /* ---------- voice (20 Sep 2026) ----------
     A wa.me link carries text and nothing else, so a recording can reach WhatsApp only the way a
     static page hands any file to another app: the phone's own share sheet (navigator.share with
     files), in a second tap after the message. The mic is shown ONLY where both halves work — a
     recorder and a file share — so on any other phone this block does nothing and the page is what
     it was; the cover message already says he can voice-note in WhatsApp itself. The audio stays on
     the phone (IndexedDB, the same phone-only rule as the text) until he taps send. No transcription:
     what we receive is his voice, as a file named by question. Capped at three minutes a question. */
  var MIME = (function () {
    var c = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    try { for (var i = 0; i < c.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(c[i])) return c[i]; } catch (e) {}
    return '';
  })();
  function base(m) { return String(m || MIME).split(';')[0] || 'audio/webm'; }
  function ext(m) { m = base(m); return /mp4/.test(m) ? 'm4a' : /ogg/.test(m) ? 'ogg' : 'webm'; }
  var VOICE = (function () {
    try {
      if (!(MIME && window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.File && window.indexedDB && window.URL && URL.createObjectURL)) return false;
      if (!(navigator.share && navigator.canShare)) return false;
      return !!navigator.canShare({ files: [new File([new Blob([''], { type: base() })], 'x.' + ext(), { type: base() })] });
    } catch (e) { return false; }
  })();
  var DB = 'mw_q1v', STORE = 'rec', MAX_MS = 180000;
  function idb(cb) {
    var r; try { r = indexedDB.open(DB, 1); } catch (e) { return cb(null); }
    r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
    r.onsuccess = function () { cb(r.result); };
    r.onerror = function () { cb(null); };
  }
  function recPut(n, blob, m) { idb(function (db) { if (!db) return; try { db.transaction(STORE, 'readwrite').objectStore(STORE).put({ b: blob, t: m, at: Date.now() }, String(n)); } catch (e) {} }); }
  function recDel(n) { idb(function (db) { if (!db) return; try { db.transaction(STORE, 'readwrite').objectStore(STORE)['delete'](String(n)); } catch (e) {} }); }
  function recClear() { idb(function (db) { if (!db) return; try { db.transaction(STORE, 'readwrite').objectStore(STORE).clear(); } catch (e) {} }); }
  function recAll(cb) {
    idb(function (db) {
      var out = {}; if (!db) return cb(out);
      var req; try { req = db.transaction(STORE).objectStore(STORE).openCursor(); } catch (e) { return cb(out); }
      req.onsuccess = function () { var c = req.result; if (!c) return cb(out); out[c.key] = c.value; c['continue'](); };
      req.onerror = function () { cb(out); };
    });
  }

  var recs = {};   // n -> { b: Blob, t: mime, url }
  var vsend = doc.getElementById('vsend'), sendVoice = doc.getElementById('sendVoice');
  function micOf(li) { return li.querySelector('.mic'); }
  function recBox(li) { return li.querySelector('.rec'); }
  function setRec(li, blob, m) {
    var n = li.getAttribute('data-n'), box = recBox(li), a = box && box.querySelector('audio');
    if (recs[n] && recs[n].url) { try { URL.revokeObjectURL(recs[n].url); } catch (e) {} }
    var url = URL.createObjectURL(blob);
    recs[n] = { b: blob, t: m, url: url };
    if (a) { a.src = url; }
    if (box) box.hidden = false;
    var f = li.querySelector('.vfail'); if (f) f.hidden = true;
  }
  function dropRec(li, persist) {
    var n = li.getAttribute('data-n'), box = recBox(li), a = box && box.querySelector('audio');
    if (recs[n] && recs[n].url) { try { URL.revokeObjectURL(recs[n].url); } catch (e) {} }
    delete recs[n];
    if (a) { a.removeAttribute('src'); try { a.load(); } catch (e) {} }
    if (box) box.hidden = true;
    if (persist !== false) recDel(n);
  }
  var live = null;   // { li, mr, stream, timer, tick, t0 }
  function stopRec() { if (live && live.mr && live.mr.state !== 'inactive') { try { live.mr.stop(); } catch (e) {} } }
  function fail(li) {
    var f = li.querySelector('.vfail'); if (f) f.hidden = false;
    tog(li, 'recording', false); var b = micOf(li); if (b) b.setAttribute('aria-pressed', 'false');
  }
  function startRec(li) {
    var n = li.getAttribute('data-n'), btn = micOf(li);
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mr; try { mr = new MediaRecorder(stream, { mimeType: MIME }); } catch (e) { try { mr = new MediaRecorder(stream); } catch (e2) { stream.getTracks().forEach(function (t) { t.stop(); }); return fail(li); } }
      var chunks = [], m = mr.mimeType || MIME;
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onerror = function () { fail(li); };
      mr.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        if (live && live.timer) clearTimeout(live.timer);
        if (live && live.tick) clearInterval(live.tick);
        live = null;
        tog(li, 'recording', false); btn.setAttribute('aria-pressed', 'false');
        var sec = btn.querySelector('.sec'); if (sec) sec.textContent = '';
        var blob = new Blob(chunks, { type: base(m) });
        if (blob.size < 2000) return;   // a tap and a release: nothing was said, nothing is kept
        setRec(li, blob, base(m)); recPut(n, blob, base(m)); changed();
      };
      live = { li: li, mr: mr, stream: stream, t0: Date.now() };
      live.timer = setTimeout(stopRec, MAX_MS);
      live.tick = setInterval(function () {
        var sec = btn.querySelector('.sec'), t = Math.floor((Date.now() - live.t0) / 1000);
        if (sec) sec.textContent = ' ' + Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
      }, 500);
      try { mr.start(); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); live = null; return fail(li); }
      tog(li, 'recording', true); btn.setAttribute('aria-pressed', 'true');
    }, function () { fail(li); });
  }
  function shareVoice() {
    var files = [];
    qs.forEach(function (li) {
      var n = li.getAttribute('data-n'), r = recs[n]; if (!r) return;
      files.push(new File([r.b], 'MIDDLEWARE-Q' + (n.length < 2 ? '0' + n : n) + '.' + ext(r.t), { type: base(r.t) }));
    });
    if (!files.length) return;
    var data = { files: files };
    try { if (!navigator.canShare(data)) return; } catch (e) { return; }
    navigator.share(data).then(function () {}, function () {});   // the sheet is its own feedback, and he can cancel it; nothing to say either way
  }
  if (VOICE) {
    qs.forEach(function (li) {
      var v = li.querySelector('.voice'), btn = micOf(li), box = recBox(li);
      if (!v || !btn) return;
      v.hidden = false;
      var sec = doc.createElement('span'); sec.className = 'sec'; btn.appendChild(sec);
      btn.addEventListener('click', function () {
        if (live) { var same = live.li === li; stopRec(); if (same) return; }   // a tap on another mic ends this one first; the next tap starts it
        else startRec(li);
      });
      var del = box && box.querySelector('.del');
      if (del) del.addEventListener('click', function () { dropRec(li); changed(); });
    });
    if (sendVoice) sendVoice.addEventListener('click', shareVoice);
    recAll(function (all) {
      qs.forEach(function (li) { var r = all[li.getAttribute('data-n')]; if (r && r.b) setRec(li, r.b, r.t); });
      refresh();
    });
  }
  window.__voice = { on: VOICE, mime: MIME };

  var l0 = 'ar';
  try { l0 = localStorage.getItem(LKEY) === 'en' ? 'en' : 'ar'; } catch (e) {}
  apply(l0);
  window.__setLang = apply;
  window.__compose = compose;
  window.__collect = collect;
})();
