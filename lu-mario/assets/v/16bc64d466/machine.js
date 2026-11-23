// The opening: a biscuit, a cream, a biscuit — each band slides on its own, and the pairing
// always lands on a product that exists. Nothing here knows a product by name: the catalogue
// arrives as JSON written by the build from content/catalog.json.

const root = document.querySelector('[data-mx]');
if (root) init(root);

function init(root) {
  const data = JSON.parse(root.querySelector('[data-mx-data]').textContent);
  const M = data.machine;
  const assets = root.dataset.assets;
  const stack = root.querySelector('[data-stack]');
  const bands = {
    top: root.querySelector('.mx-band--top'),
    cream: root.querySelector('.mx-band--cream'),
    bottom: root.querySelector('.mx-band--bottom'),
  };
  const pack = root.querySelector('[data-pack]');
  const packImg = pack.querySelector('img');
  const card = root.querySelector('[data-card]');
  const more = root.querySelector('[data-more]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('still');

  const key = (b, c) => `${b}|${c || 'none'}`;
  const table = new Map();
  for (const p of M.products) {
    const k = key(p.base, p.cream);
    if (!table.has(k)) table.set(k, []);
    table.get(k).push(p);
  }
  const creamIds = [...M.creams.map((c) => c.id), 'none'];
  const baseIds = M.bases.map((b) => b.id);
  const creamsFor = (b) => creamIds.filter((c) => table.has(key(b, c)));
  const basesFor = (c) => baseIds.filter((b) => table.has(key(b, c)));

  const first = M.products.find((p) => p.id === data.start) || M.products[0];
  const state = { base: first.base, cream: first.cream || 'none', k: 0 };

  // ── moving a band ──
  const faces = (band) => [...band.children];
  const indexOf = (band, id) => faces(band).findIndex((f) => f.dataset.id === id);
  const ready = (band, i) => [i - 1, i, i + 1].forEach((j) => faces(band)[j]?.classList.add('is-ready'));

  function go(band, id, smooth = true) {
    const i = indexOf(band, id);
    if (i < 0) return;
    ready(band, i);
    const left = faces(band)[i].offsetLeft;
    if (Math.abs(band.scrollLeft - left) < 2) return;
    band._target = i;
    clearTimeout(band._t);
    band._t = setTimeout(() => { band._target = null; }, 1100);
    band.scrollTo({ left, behavior: smooth && !reduce ? 'smooth' : 'instant' });
  }
  const at = (band) => Math.max(0, Math.min(faces(band).length - 1, Math.round(band.scrollLeft / Math.max(1, band.clientWidth))));

  // ── the state, and what it shows ──
  function setBase(id) {
    if (!baseIds.includes(id)) return;
    state.base = id;
    if (!table.has(key(id, state.cream))) state.cream = creamsFor(id)[0];
    state.k = 0;
    render();
  }
  function setCream(id) {
    if (!creamIds.includes(id)) return;
    state.cream = id;
    if (!table.has(key(state.base, id))) state.base = basesFor(id)[0];
    state.k = 0;
    render();
  }

  function render(smooth = true) {
    go(bands.top, state.base, smooth);
    go(bands.bottom, state.base, smooth);
    go(bands.cream, state.cream, smooth);
    stack.classList.toggle('is-plain', state.cream === 'none');
    for (const input of root.querySelectorAll('input[name="mx-base"]')) {
      input.checked = input.value === state.base;
      input.nextElementSibling.classList.toggle('is-off', !table.has(key(input.value, state.cream)));
    }
    for (const input of root.querySelectorAll('input[name="mx-cream"]')) {
      input.checked = input.value === state.cream;
      input.nextElementSibling.classList.toggle('is-off', !table.has(key(state.base, input.value)));
    }
    show();
  }

  function show() {
    const list = table.get(key(state.base, state.cream)) || [];
    const p = list[state.k % list.length];
    if (!p) return;
    if (pack.dataset.id !== p.id) {
      pack.dataset.id = p.id;
      pack.href = p.url;
      packImg.srcset = p.pack.map((v) => `${assets}${v.src} ${v.w}w`).join(', ');
      packImg.src = assets + p.pack[p.pack.length - 1].src;
      packImg.width = p.w;
      packImg.height = p.h;
      packImg.alt = p.alt;
      pack.classList.remove('is-swap');
      void pack.offsetWidth;
      pack.classList.add('is-swap');
    }
    card.querySelector('[data-r]').textContent = p.range;
    card.querySelector('[data-n]').textContent = p.name;
    card.querySelector('[data-l]').textContent = p.line;
    card.querySelector('[data-cta]').href = p.url;
    more.hidden = list.length < 2;
    if (list.length > 1) {
      more.querySelector('[data-of]').textContent = data.of.replace('{n}', (state.k % list.length) + 1).replace('{m}', list.length);
    }
    if (root.dataset.product && root.dataset.product !== p.id && !reduce) {
      stack.classList.remove('is-press');
      void stack.offsetWidth;
      stack.classList.add('is-press');
    }
    root.dataset.product = p.id;
    root.dispatchEvent(new CustomEvent('mx:change', { detail: { product: p.id, base: state.base, cream: state.cream } }));
  }

  // ── listening ──
  for (const [name, band] of Object.entries(bands)) {
    let timer;
    band.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const i = at(band);
        if (band._target != null) {
          if (i === band._target) band._target = null;
          return;
        }
        if (band.classList.contains('is-dragging')) return;
        const id = faces(band)[i].dataset.id;
        if (name === 'cream') { if (id !== state.cream) setCream(id); } else if (id !== state.base) setBase(id);
      }, 110);
    }, { passive: true });

    // a mouse drags it like a finger does
    let drag = null;
    band.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: band.scrollLeft, t: performance.now(), moved: 0 };
      band.setPointerCapture(e.pointerId);
      band.classList.add('is-dragging');
    });
    band.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      band.scrollLeft = drag.left - dx;
    });
    const end = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const fast = Math.abs(dx) / Math.max(1, performance.now() - drag.t) > 0.45;
      const start = Math.round(drag.left / Math.max(1, band.clientWidth));
      let i = at(band);
      if (i === start && (fast || Math.abs(dx) > band.clientWidth * 0.12)) i = start + (dx < 0 ? 1 : -1);
      i = Math.max(0, Math.min(faces(band).length - 1, i));
      drag = null;
      band.classList.remove('is-dragging');
      const id = faces(band)[i].dataset.id;
      band._target = null;
      if (name === 'cream') setCream(id); else setBase(id);
      // the band may already be where it started: bring it back to its face
      go(band, name === 'cream' ? state.cream : state.base);
    };
    band.addEventListener('pointerup', end);
    band.addEventListener('pointercancel', end);
  }

  root.querySelector('[data-picks]').addEventListener('change', (e) => {
    if (e.target.name === 'mx-base') setBase(e.target.value);
    if (e.target.name === 'mx-cream') setCream(e.target.value);
  });
  more.addEventListener('click', () => { state.k += 1; show(); });
  addEventListener('resize', () => render(false));

  // the other textures arrive once the page is idle, so the first swipe finds them
  const warm = () => Object.values(bands).forEach((b) => faces(b).forEach((f) => f.classList.add('is-ready')));
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(warm);

  render(false);

  // one small nudge of the cream, so the bands read as things that slide
  if (!reduce) {
    let touched = false;
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => root.addEventListener(ev, () => { touched = true; }, { once: true, passive: true }));
    setTimeout(() => {
      if (touched || document.hidden) return;
      const b = bands.cream;
      const home = b.scrollLeft;
      b._target = at(b);
      b.classList.add('is-dragging');
      b.scrollTo({ left: home + b.clientWidth * 0.16, behavior: 'smooth' });
      setTimeout(() => {
        b.scrollTo({ left: home, behavior: 'smooth' });
        setTimeout(() => { b.classList.remove('is-dragging'); b._target = null; }, 600);
      }, 520);
    }, 2600);
  }
}
