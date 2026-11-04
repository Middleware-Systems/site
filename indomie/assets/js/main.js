// main.js — the motion and the toys of v3 (DESIGN §4). Everything here is an enhancement: without it the page reads
// top to bottom with every word, the still bowl, every step of the timer and the packs in a scrolling row.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const rtl = html.dir === 'rtl';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (still) html.classList.add('still');

// ── words that rise, things that arrive ───────────────────────────────────────────────────────────────────────
for (const el of $$('[data-split]')) {
  let i = 0;
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) { frag.append(p); continue; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = p; inner.style.setProperty('--i', i++);
          w.append(inner); frag.append(w);
        }
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(el);
}
const seen = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } }),
  { rootMargin: '0px 0px -12% 0px' });
$$('[data-split], [data-rise]').forEach((el) => seen.observe(el));

// ── the bar: the menu on a phone ──────────────────────────────────────────────────────────────────────────────
const burger = $('.top-burger'), sheet = $('#sheet');
burger?.addEventListener('click', () => {
  const open = burger.getAttribute('aria-expanded') !== 'true';
  burger.setAttribute('aria-expanded', open); sheet.hidden = !open; document.body.style.overflow = open ? 'hidden' : '';
});
sheet?.addEventListener('click', (e) => { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); sheet.hidden = true; document.body.style.overflow = ''; } });

// ── the preview: show or hide what waits for confirmation ─────────────────────────────────────────────────────
const pvb = $('.pv-btn');
pvb?.addEventListener('click', () => {
  const on = html.classList.toggle('show-claims');
  pvb.setAttribute('aria-pressed', on); pvb.title = on ? pvb.dataset.hide : pvb.dataset.show;
});

// ── the hero: the bowl you pull from ──────────────────────────────────────────────────────────────────────────
const hero = $('[data-hero]');
if (hero) {
  const themes = JSON.parse($('[data-themes]', hero)?.textContent || '{}');
  const canvas = $('[data-gl]', hero);
  let bowl = null;
  const setTheme = (slug, push = true) => {
    const t = themes[slug]; if (!t) return;
    hero.style.setProperty('--bg', t.bg); hero.style.setProperty('--fg', t.fg); hero.style.setProperty('--ac', t.accent); hero.style.setProperty('--word', t.word);
    hero.dataset.theme = slug;
    $$('[data-flavour]', hero).forEach((b) => b.setAttribute('aria-pressed', b.dataset.flavour === slug));
    if (push && bowl) bowl.theme(t);
  };
  $$('[data-flavour]', hero).forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.flavour)));
  const gl = !saveData && canvas && (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
  if (gl) {
    const start = () => import('./noodles.js').then(({ mountNoodles }) => {
      const t = themes[hero.dataset.theme] || {};
      bowl = mountNoodles(canvas, { still, hit: $('[data-hit]', hero), bowl: t.bowl, sticks: t.sticks, tint: t.tint,
        onLift: () => hero.classList.add('lifted') });
      hero.classList.add('gl-on');
    }).catch((err) => { console.warn('the bowl stays a picture:', err); });
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 900 }); else setTimeout(start, 200);
  }
  const word = $('[data-word] span', hero);
  if (word && !still) addEventListener('scroll', () => {
    const y = Math.min(scrollY, innerHeight);
    word.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 - y / innerHeight * 0.08})`;
  }, { passive: true });
}

// ── the timer: three minutes, run by the scroll ───────────────────────────────────────────────────────────────
const timer = $('[data-timer]');
if (timer && !still) {
  const clock = $('[data-clock]', timer), steps = $$('[data-step]', timer), done = $('[data-done]', timer), bar = $('[data-bar]', timer);
  const total = +clock.dataset.seconds || 180;
  const label = clock.querySelector('.cl') || clock;
  const tick = () => {
    const r = timer.getBoundingClientRect(), span = r.height - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / span));
    const left = Math.round(total * (1 - Math.min(1, p / 0.86)));
    label.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    steps.forEach((s, i) => s.classList.toggle('on', p > [0.04, 0.3, 0.56][i]));
    done.classList.toggle('on', p > 0.86);
    bar.style.setProperty('--p', p.toFixed(4));
  };
  addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick); tick();
}

// ── the world's packs: a colour chart that travels sideways ───────────────────────────────────────────────────
const globe = $('[data-globe]');
if (globe && !still) {
  const deck = $('[data-deck]', globe);
  let travel = 0;
  const measure = () => {
    travel = Math.max(0, deck.scrollWidth - innerWidth);
    globe.style.setProperty('--travel', `${travel}px`);
  };
  const move = () => {
    const r = globe.getBoundingClientRect(), span = r.height - innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    deck.style.setProperty('--x', `${(rtl ? 1 : -1) * p * travel}px`);
  };
  measure(); move();
  addEventListener('resize', () => { measure(); move(); });
  addEventListener('scroll', move, { passive: true });
  $$('img', deck).forEach((im) => im.complete || im.addEventListener('load', () => { measure(); move(); }, { once: true }));
}

// ── the recipe index: the dish follows the pointer ────────────────────────────────────────────────────────────
const rfloat = $('[data-rfloat]');
if (rfloat && fine && !still) {
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
  const loop = () => { x += (tx - x) * 0.18; y += (ty - y) * 0.18; rfloat.style.left = `${x}px`; rfloat.style.top = `${y}px`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0; };
  $$('[data-rlist] a').forEach((a) => {
    a.addEventListener('mouseenter', (e) => { rfloat.style.backgroundImage = `url("${a.dataset.img}")`; rfloat.classList.add('on'); x = tx = e.clientX; y = ty = e.clientY; });
    a.addEventListener('mouseleave', () => rfloat.classList.remove('on'));
    a.addEventListener('mousemove', (e) => { tx = e.clientX + (rtl ? -170 : 170); ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
  });
}

// ── the cursor ────────────────────────────────────────────────────────────────────────────────────────────────
const cur = $('.cursor');
if (cur && fine && !still) {
  const label = $('b', cur), hint = $('[data-hint] .hand')?.textContent || '';
  let x = -100, y = -100, tx = -100, ty = -100;
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    const t = e.target.closest?.('[data-cursor], [data-hit]');
    cur.classList.toggle('big', !!t);
    label.textContent = t ? (t.dataset.cursor || hint) : '';
  }, { passive: true });
  (function loop() { x += (tx - x) * 0.22; y += (ty - y) * 0.22; cur.style.transform = `translate3d(${x}px, ${y}px, 0)`; requestAnimationFrame(loop); })();
}
