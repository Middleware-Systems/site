// Lu Mario — what every page does: the capsule header, the phone menu, things rising into
// view, the catalogue's filters, offers that end by themselves, and the trade form.

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

// ── rows a mouse can drag ──
document.querySelectorAll('[data-drag]').forEach((row) => {
  let d = null;
  row.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') d = { x: e.clientX, left: row.scrollLeft, moved: false }; });
  addEventListener('pointermove', (e) => {
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) { d.moved = true; row.style.scrollSnapType = 'none'; }
    row.scrollLeft = d.left - dx;
  });
  addEventListener('pointerup', () => { if (d) { row.style.scrollSnapType = ''; setTimeout(() => { d = null; }, 0); } });
  row.addEventListener('click', (e) => { if (d && d.moved) e.preventDefault(); }, true);
  row.addEventListener('dragstart', (e) => e.preventDefault());
});

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
