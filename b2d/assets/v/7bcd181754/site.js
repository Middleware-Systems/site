// B2D — everything that answers a visitor.
// One clock runs the site: the wall clock, divided by the plant's own rates (content/figures.json,
// handed over by the build in #plant). The bar, the counters, the header's beat line, the sound and
// the opening (hero.js) all read it, so they agree to the millisecond.
const doc = document, html = doc.documentElement;
const $ = (s, r = doc) => r.querySelector(s);
const $$ = (s, r = doc) => [...r.querySelectorAll(s)];
let plant = {};
try { plant = JSON.parse($('#plant').textContent); } catch { /* no plant: the page still reads */ }
const BAR = plant.bar || 2400, BEAT = plant.beat || 600, LINES = plant.lines || [];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rtl = html.dir === 'rtl';
const nf = new Intl.NumberFormat('en-US');
html.classList.add('js');

// when this visitor arrived: once per visit, kept from page to page
let arrived = Date.now();
try {
  const v = +sessionStorage.getItem('b2d-arrived');
  if (v && arrived - v < 6 * 3600e3 && v <= arrived) arrived = v; else sessionStorage.setItem('b2d-arrived', String(arrived));
} catch { /* private mode: count from this page */ }

// CSS animations start on the beat, not when the page happened to load
html.style.setProperty('--beat-d', `${-(Date.now() % BEAT)}ms`);
html.style.setProperty('--swing-d', `${-(Date.now() % (2 * BEAT))}ms`);

/* ───────── header, menu ───────── */
const hd = $('[data-hd]');
if (hd) {
  const solid = () => hd.classList.toggle('is-solid', scrollY > 10);
  solid(); addEventListener('scroll', solid, { passive: true });
  const items = $$('.nav-item', hd);
  const closeAll = (but) => items.forEach((li) => { if (li !== but) { li.classList.remove('is-open'); $('.nav-more', li)?.setAttribute('aria-expanded', 'false'); } });
  items.forEach((li) => {
    const b = $('.nav-more', li); if (!b) return;
    b.addEventListener('click', (e) => { e.stopPropagation(); const open = !li.classList.contains('is-open'); closeAll(li); li.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open)); });
  });
  doc.addEventListener('click', (e) => { if (!e.target.closest('.nav-item')) closeAll(); });
  const burger = $('[data-burger]'), drawer = $('#drawer');
  const setDrawer = (open) => {
    hd.classList.toggle('is-open', open); drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open)); html.style.overflow = open ? 'hidden' : '';
    if (open) $('a', drawer)?.focus();
  };
  burger?.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAll(); if (drawer?.classList.contains('is-open')) { setDrawer(false); burger.focus(); } } });
  matchMedia('(min-width:1181px)').addEventListener('change', (e) => { if (e.matches) setDrawer(false); });
}

/* ───────── the bar, the beat line, the counters ───────── */
const bars = $$('[data-bar]').map((el) => ({
  el, cursor: $('.bar-cursor i', el), track: $('.bar-cursor', el), width: 0,
  rows: $$('.bar-row', el).map((r) => ({ r, n: +r.dataset.n || 1, ticks: $$('.bar-ticks i', r), last: -1 })),
}));
const beatDot = $('.beatline i'), beatTrack = $('.beatline');
let beatW = 0;
const measure = () => { bars.forEach((b) => { b.width = b.track ? b.track.clientWidth : 0; }); beatW = beatTrack ? beatTrack.clientWidth : 0; };
measure(); addEventListener('resize', measure, { passive: true });
if (window.ResizeObserver) { const ro = new ResizeObserver(measure); bars.forEach((b) => ro.observe(b.el)); }
const dirn = rtl ? -1 : 1;

const counters = $$('[data-count]').map((el) => ({ el, per: 3600000 / (LINES.find((l) => l.id === el.dataset.count)?.perHour || 1), shown: -1 }));
const sinceEl = $$('[data-since-time]');
let sinceShown = -1;

function paint(now) {
  const phase = (now % BAR) / BAR;
  for (const b of bars) {
    if (b.cursor) b.cursor.style.transform = `translateX(${(phase * b.width * dirn).toFixed(1)}px)`;
    for (const row of b.rows) {
      const i = Math.floor(phase * row.n);
      if (i !== row.last) { row.ticks[row.last]?.classList.remove('on'); row.ticks[i]?.classList.add('on'); row.last = i; }
    }
  }
  if (beatDot) beatDot.style.transform = `translateX(${(phase * beatW * dirn).toFixed(1)}px)`;
  const dt = now - arrived;
  for (const c of counters) { const n = Math.floor(dt / c.per); if (n !== c.shown) { c.shown = n; c.el.textContent = nf.format(n); } }
  const s = Math.floor(dt / 1000);
  if (s !== sinceShown) { sinceShown = s; const t = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; sinceEl.forEach((e) => { e.textContent = t; }); }
}
if (reduced) { paint(Date.now()); setInterval(() => { if (!doc.hidden) paint(Date.now()); }, 1000); }
else { const loop = () => { if (!doc.hidden) paint(Date.now()); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }

// a row of the bar can be heard and seen alone
let solo = null;
$$('.bar-row[role=button]').forEach((row) => {
  const pick = () => {
    solo = solo === row.dataset.line ? null : row.dataset.line;
    $$('.bar-row[role=button]').forEach((r) => { const on = r.dataset.line === solo; r.classList.toggle('is-on', on); r.setAttribute('aria-pressed', String(on)); r.closest('.bar').classList.toggle('is-solo', !!solo); });
  };
  row.addEventListener('click', pick);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
});

/* ───────── the sound of the three lines ───────── */
let ac = null, master = null, noise = null, timer = 0, soundOn = false;
const sched = {};                                             // per line: the last unit already scheduled
function voice(line, k, when) {
  const perBeat = Math.max(1, Math.round(line.perBar / (BAR / BEAT)));
  const g = ac.createGain(); g.connect(master);
  if (line.format === 'glass') {                              // a clink: two partials, a short ring
    for (const [f, a] of [[2637, 0.09], [3951, 0.05]]) {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + (Math.sin(k * 12.9898) * 0.004));
      const og = ac.createGain(); og.gain.setValueAtTime(0, when); og.gain.linearRampToValueAtTime(a, when + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);
      o.connect(og).connect(g); o.start(when); o.stop(when + 0.36);
    }
  } else if (line.format === 'carton') {                      // a soft knock
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(210, when); o.frequency.exponentialRampToValueAtTime(96, when + 0.09);
    const og = ac.createGain(); og.gain.setValueAtTime(0.0001, when); og.gain.linearRampToValueAtTime(0.16, when + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    o.connect(og).connect(g); o.start(when); o.stop(when + 0.18);
  } else {                                                    // a tick; louder on the beat
    const onBeat = k % perBeat === 0, half = k % Math.max(1, perBeat / 2) === 0;
    const src = ac.createBufferSource(); src.buffer = noise;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = onBeat ? 5200 : 7600;
    const og = ac.createGain(); const a = onBeat ? 0.075 : half ? 0.042 : 0.02;
    og.gain.setValueAtTime(a, when); og.gain.exponentialRampToValueAtTime(0.0001, when + (onBeat ? 0.05 : 0.022));
    src.connect(hp).connect(og).connect(g); src.start(when, Math.random() * 0.1, 0.06);
  }
}
function pump() {
  const now = Date.now(), horizon = now + 160;
  for (const line of LINES) {
    const per = 3600000 / line.perHour;
    let k = Math.max(sched[line.id] ?? -1, Math.floor(now / per)) + 1;
    for (; k * per <= horizon; k++) { if (!solo || solo === line.id) voice(line, k, ac.currentTime + Math.max(0, (k * per - now) / 1000)); }
    sched[line.id] = k - 1;
  }
}
function setSound(on) {
  soundOn = on;
  if (on) {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.9;
      const comp = ac.createDynamicsCompressor(); master.connect(comp).connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    ac.resume(); for (const l of LINES) delete sched[l.id];
    clearInterval(timer); timer = setInterval(() => { if (!doc.hidden) pump(); }, 40); pump();
  } else { clearInterval(timer); ac?.suspend(); }
  $$('[data-sound]').forEach((b) => { b.setAttribute('aria-pressed', String(on)); const t = $('[data-sound-t]', b); if (t && b.dataset.on) t.textContent = on ? b.dataset.on : b.dataset.off; });
}
$$('[data-sound]').forEach((b) => b.addEventListener('click', () => setSound(!soundOn)));
doc.addEventListener('visibilitychange', () => { if (ac && soundOn) (doc.hidden ? ac.suspend() : ac.resume()); });

/* ───────── arriving on the page ───────── */
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  $$('[data-rv]').forEach((el) => io.observe(el));
} else $$('[data-rv]').forEach((el) => el.classList.add('is-in'));

/* ───────── how long is my run? ───────── */
$$('[data-calc]').forEach((form) => {
  const num = $('[data-calc-n]', form), range = $('[data-calc-range]', form), out = $('[data-calc-time]', form), sub = $('[data-calc-sub]', form), go = $('[data-calc-go]', form);
  const min = +form.dataset.min, max = +form.dataset.max, ratio = Math.log(max / min);
  const round = (x) => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / p) * p; };
  const W = form.dataset;
  function show() {
    const picked = $('input[name=format]:checked', form); if (!picked) return;
    const per = +picked.dataset.perHour, units = Math.min(max, Math.max(1, Math.round(+num.value || 0)));
    const mins = Math.round((units / per) * 60), h = Math.floor(mins / 60), m = mins % 60;
    out.textContent = h ? `${nf.format(h)} ${W.h}${m ? ` ${m} ${W.m}` : ''}` : `${Math.max(1, m)} ${W.m}`;
    sub.textContent = W.sub.replace('{units}', nf.format(units)).replace('{unit}', picked.dataset.unit).replace('{rate}', nf.format(per)).replace('{bars}', nf.format(Math.round((units / per) * 3600000 / BAR)));
    if (go) { const u = new URL(go.dataset.href, location.href); u.searchParams.set('door', 'manufacture'); u.searchParams.set('format', picked.value); u.searchParams.set('units', String(units)); go.href = u.pathname + u.search; }
  }
  range.addEventListener('input', () => { num.value = round(min * Math.exp(ratio * (+range.value / 1000))); show(); });
  num.addEventListener('input', () => { const v = Math.min(max, Math.max(min, +num.value || min)); range.value = Math.round(1000 * Math.log(v / min) / ratio); show(); });
  $$('input[name=format]', form).forEach((r) => r.addEventListener('change', show));
  form.addEventListener('submit', (e) => e.preventDefault());
  range.value = Math.round(1000 * Math.log((+num.value || min) / min) / ratio); show();
});

/* ───────── forms: they open the visitor's own email, addressed and written ───────── */
$$('form[data-mailto]').forEach((form) => {
  const q = new URLSearchParams(location.search);
  const door = q.get('door'); if (door) { const r = $(`input[name=door][value="${CSS.escape(door)}"]`, form); if (r) r.checked = true; }
  const run = $('[name=run]', form);
  if (run && q.get('format') && q.get('units')) {
    const fmt = $(`[data-format-name="${CSS.escape(q.get('format'))}"]`, form);
    run.value = `${fmt ? fmt.dataset.label : q.get('format')} · ${nf.format(+q.get('units') || 0)}`;
  }
  const errOf = (f) => $(`#${f.id}-err`, form);
  const check = (f) => {
    let msg = '';
    if (f.required && !f.value.trim()) msg = form.dataset.required;
    else if (f.type === 'email' && f.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim())) msg = form.dataset.email;
    f.setAttribute('aria-invalid', msg ? 'true' : 'false'); const e = errOf(f); if (e) e.textContent = msg;
    return !msg;
  };
  $$('input,textarea,select', form).forEach((f) => f.addEventListener('blur', () => { if (f.hasAttribute('aria-invalid')) check(f); }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = $$('input:not([type=radio]),textarea,select', form);
    const bad = fields.filter((f) => !check(f));
    if (bad.length) { bad[0].focus(); return; }
    const lines = [];
    const picked = $('input[name=door]:checked', form);
    if (picked) lines.push(`${form.dataset.doorLabel}: ${picked.dataset.label}`);
    fields.forEach((f) => { if (f.value.trim() && f.name !== 'message') lines.push(`${f.dataset.label}: ${f.value.trim()}`); });
    const msg = $('[name=message]', form); if (msg?.value.trim()) lines.push('', msg.value.trim());
    const subject = `${form.dataset.subject}${picked ? ` · ${picked.dataset.label}` : ''}`;
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    form.classList.add('is-sent'); $('.form-done', form)?.focus();
  });
});

/* ───────── news: company or product ───────── */
$$('[data-filters]').forEach((box) => {
  const cards = $$('[data-kind]', box.parentElement), empty = $('[data-empty]', box.parentElement);
  $$('button', box).forEach((b) => b.addEventListener('click', () => {
    $$('button', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    let shown = 0;
    cards.forEach((c) => { const ok = b.dataset.filter === 'all' || c.dataset.kind === b.dataset.filter; c.hidden = !ok; if (ok) shown++; });
    if (empty) empty.hidden = shown > 0;
  }));
});

/* ───────── the opening ───────── */
const hero = $('[data-hero]');
if (hero && !reduced) {
  const canvas = $('canvas', hero);
  let ok = false;
  try { const c = doc.createElement('canvas'); ok = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { ok = false; }
  if (ok && canvas) {
    const start = () => import('./hero.js').then((m) => m.mount(canvas, { lines: LINES, bar: BAR, onReady: () => hero.classList.add('is-live') })).catch(() => { /* the CSS lanes stay */ });
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 900 }); else setTimeout(start, 150);
  }
}
