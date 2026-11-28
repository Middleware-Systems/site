// Lu Mario — what every page does: the header, the phone menu, things rising into view, the
// ranges index's pack, tiles that turn over, the opening's packs leaning toward the pointer, the
// catalogue's filters, offers that end by themselves, and the trade form.

const html = document.documentElement;
// ?still shows the page at rest: for a photograph, a print, or a check
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('still');
if (reduce) html.classList.add('still');
if (new URLSearchParams(location.search).has('still')) document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });

// ── remember the language a visitor chose ──
document.querySelectorAll('a[hreflang]').forEach((a) => a.addEventListener('click', () => {
  try { localStorage.setItem('lm-lang', a.hreflang); } catch (e) { /* private mode */ }
}));
try { localStorage.setItem('lm-lang', html.lang); } catch (e) { /* private mode */ }

// ── the header leaves when you read down and returns when you look up ──
const head = document.querySelector('[data-head]');
if (head) {
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (!html.classList.contains('menu-open')) head.classList.toggle('is-away', y > 320 && y > last + 4);
    if (y < last - 4 || y < 320) head.classList.remove('is-away');
    last = y;
  }, { passive: true });
  head.addEventListener('focusin', () => head.classList.remove('is-away'));
}

// ── the phone menu ──
const burger = document.querySelector('[data-burger]');
const sheet = document.querySelector('[data-sheet]');
if (burger && sheet) {
  const label = burger.querySelector('.sr');
  const set = (open) => {
    html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    label.textContent = open ? label.dataset.close : label.dataset.open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) sheet.querySelector('a')?.focus({ preventScroll: true });
  };
  burger.addEventListener('click', () => set(!html.classList.contains('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && html.classList.contains('menu-open')) { set(false); burger.focus(); } });
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', (m) => { if (m.matches) set(false); });
}

// ── rising into view ──
const rise = [...document.querySelectorAll('[data-rise],[data-press]')];
if (rise.length) {
  // siblings arrive one after another
  const seen = new Map();
  rise.forEach((el) => {
    if (!el.hasAttribute('data-rise') || el.style.getPropertyValue('--i')) return;
    const n = seen.get(el.parentElement) || 0;
    el.style.setProperty('--i', Math.min(n, 6));
    seen.set(el.parentElement, n + 1);
  });
  if (reduce || !('IntersectionObserver' in window)) rise.forEach((el) => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rise.forEach((el) => io.observe(el));
  }
}

// ── the ranges index: the pack of the row under the pointer or the focus ──
const index = document.querySelector('[data-index]');
if (index) {
  const rows = [...index.querySelectorAll('.ix-row')];
  const shots = [...index.querySelectorAll('[data-shot]')];
  const show = (id) => {
    rows.forEach((r) => r.classList.toggle('is-on', r.dataset.range === id));
    shots.forEach((s) => s.classList.toggle('is-on', s.dataset.shot === id));
  };
  rows.forEach((r) => {
    r.addEventListener('pointerenter', () => show(r.dataset.range));
    r.addEventListener('focus', () => show(r.dataset.range));
  });
  // the packs waiting behind the first are fetched once the index is near, so the first one shown is already there
  const stage = index.querySelector('.ix-stage');
  const fetchAll = () => shots.forEach((s) => { const i = s.querySelector('img'); if (i) i.loading = 'eager'; });
  if (stage && getComputedStyle(stage).display !== 'none') {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { fetchAll(); io.disconnect(); } }, { rootMargin: '400px 0px' });
      io.observe(stage);
    } else fetchAll();
  }
}

// ── a tile turns over like the pack in a hand: its back says what is inside ──
document.addEventListener('click', (e) => {
  const b = e.target.closest('.tile .turn');
  if (!b) return;
  const tile = b.closest('.tile');
  const on = !tile.classList.contains('is-turned');
  tile.classList.toggle('is-turned', on);
  b.setAttribute('aria-pressed', String(on));
  tile.querySelector('.face').inert = on;
  tile.querySelector('.back').inert = !on;
});

// ── the opening's packs lean a little toward the pointer, as if held ──
const hero = document.querySelector('[data-hero]');
const trio = hero && hero.querySelector('.trio');
if (trio && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    trio.style.setProperty('--tx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    trio.style.setProperty('--ty', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => { trio.style.setProperty('--tx', 0); trio.style.setProperty('--ty', 0); });
}

// ── the catalogue's filters ──
const cat = document.querySelector('[data-catalog]');
if (cat) {
  const tiles = [...cat.querySelectorAll('.tile')];
  const count = cat.querySelector('[data-count]');
  const empty = cat.querySelector('[data-empty]');
  const list = cat.querySelector('[data-tiles]');
  const pick = { range: '', cream: '' };
  const q = new URLSearchParams(location.search);
  for (const k of ['range', 'cream']) {
    const v = q.get(k) || '';
    if (v && cat.querySelector(`[data-f="${k}"][data-v="${CSS.escape(v)}"]`)) pick[k] = v;
  }
  const apply = (push) => {
    let n = 0;
    tiles.forEach((t) => {
      const ok = (!pick.range || t.dataset.range === pick.range) && (!pick.cream || t.dataset.cream === pick.cream);
      t.classList.toggle('is-out', !ok);
      if (ok) n += 1;
    });
    count.textContent = n;
    empty.hidden = n > 0;
    list.hidden = n === 0;
    cat.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(pick[b.dataset.f] === b.dataset.v)));
    if (push) {
      const u = new URL(location.href);
      for (const k of ['range', 'cream']) { if (pick[k]) u.searchParams.set(k, pick[k]); else u.searchParams.delete(k); }
      history.replaceState(null, '', u);
    }
  };
  cat.addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (b) { pick[b.dataset.f] = b.dataset.v; apply(true); }
    if (e.target.closest('[data-reset]')) { pick.range = ''; pick.cream = ''; apply(true); }
  });
  apply(false);
}

// ── what is new: kinds, and offers that end by themselves ──
const today = new Date().toISOString().slice(0, 10);
document.querySelectorAll('[data-until]').forEach((el) => {
  if (el.dataset.until >= today) return;
  const tag = el.querySelector('.tag');
  if (tag && tag.dataset.ended) { tag.textContent = tag.dataset.ended; tag.className = 'tag tag--ended'; }
  el.dataset.ended = '';
});
const newslist = document.querySelector('[data-newslist]');
if (newslist) {
  newslist.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    newslist.querySelectorAll('[data-k]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    newslist.querySelectorAll('.ncard').forEach((c) => { c.hidden = !!b.dataset.k && c.dataset.kind !== b.dataset.k; });
  });
}

// ── the trade form: it writes the email, the visitor sends it ──
const form = document.querySelector('[data-enquiry]');
if (form) {
  const want = new URLSearchParams(location.search).get('interest');
  if (want) form.querySelectorAll('input[name="interest"]').forEach((i) => { if (i.dataset.id === want) i.checked = true; });
  const bad = (input, on) => {
    const f = input.closest('.field');
    f.classList.toggle('is-bad', on);
    const err = f.querySelector('.err');
    if (err) err.textContent = on ? form.dataset.required : '';
    input.setAttribute('aria-invalid', String(on));
  };
  form.addEventListener('input', (e) => { if (e.target.required && e.target.value.trim()) bad(e.target, false); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let firstBad = null;
    form.querySelectorAll('[required]').forEach((i) => {
      const miss = !i.value.trim();
      bad(i, miss);
      if (miss && !firstBad) firstBad = i;
    });
    if (firstBad) { firstBad.focus(); return; }
    const lines = [];
    form.querySelectorAll('input:not([type=checkbox]),select,textarea').forEach((i) => {
      if (i.value.trim()) lines.push(`${i.dataset.label}: ${i.value.trim()}`);
    });
    const picked = [...form.querySelectorAll('input[name="interest"]:checked')].map((i) => i.value);
    if (picked.length) lines.push(`${form.querySelector('fieldset legend').textContent}: ${picked.join(' · ')}`);
    const url = `mailto:${form.dataset.to}?subject=${encodeURIComponent(form.dataset.subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    form.dataset.sent = url;
    location.href = url;
  });
}
