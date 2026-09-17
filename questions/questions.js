/* MIDDLEWARE — questions.js (17 Sep 2026)
   Fourteen questions, answered on a phone. Nothing leaves the page until he taps send: the answers
   live in localStorage under one key, and the send button is a wa.me link whose text is rebuilt on
   every keystroke. ES5 on purpose — the phones this is for are not new. No network, no library. */
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
    return { t: t ? t.value.replace(/\s+$/, '') : '', c: c ? parseInt(c.value, 10) : -1 };
  }
  function answered(v) { return !!(v.t || v.c >= 0); }
  function chipText(li, i, l) {
    var lab = li.querySelectorAll('.chips label')[i]; if (!lab) return '';
    var s = lab.querySelector('.i18n[lang="' + l + '"]'); return s ? s.textContent : '';
  }
  function collect() {
    var out = {};
    qs.forEach(function (li) { var v = qval(li); if (answered(v)) out[li.getAttribute('data-n')] = v; });
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
    refresh();
  });
  if (toggle) toggle.addEventListener('click', function () { apply(lang() === 'ar' ? 'en' : 'ar'); });

  var l0 = 'ar';
  try { l0 = localStorage.getItem(LKEY) === 'en' ? 'en' : 'ar'; } catch (e) {}
  apply(l0);
  window.__setLang = apply;
  window.__compose = compose;
  window.__collect = collect;
})();
