// Indomie Syria v2 — the page's motion and its toys. Everything here is an enhancement: the page reads without it.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const still = document.documentElement.classList.contains('still');
const fine = matchMedia('(pointer: fine)').matches;

// ── the header: transparent over the hero, solid after it; the phone's menu ────────────────────────────────────────
const top = $('[data-top]');
const onScroll = () => top && top.classList.toggle('is-solid', scrollY > (document.body.classList.contains('home') ? innerHeight * 0.7 : 40));
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const menu = $('[data-menu]');
if (menu) {
  menu.addEventListener('click', e => {
    e.preventDefault();
    const open = !document.documentElement.classList.contains('menu-open');
    document.documentElement.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  $$('[data-sheet] a').forEach(a => a.addEventListener('click', () => { document.documentElement.classList.remove('menu-open'); menu.setAttribute('aria-expanded', 'false'); }));
}

// ── rise into view ──────────────────────────────────────────────────────────────────────────────────────────────────
$$('.sec-head, .tile, .step3, .card, .other, .build__copy, .share__in, .sealed__in').forEach(el => el.setAttribute('data-rise', ''));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('[data-rise]').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });

// ── the hero: the loop after first paint (never under Save-Data or reduced motion); things that float to the pointer ──
const hero = $('[data-hero]');
if (hero && !still) {
  const v = $('video', hero);
  const start = () => { v.src = v.dataset.src; v.play().then(() => v.classList.add('is-on')).catch(() => {}); };
  if (document.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', () => setTimeout(start, 300), { once: true });
}
const floats = $$('[data-float]');
if (floats.length && !still) {
  let mx = 0, my = 0, tx = 0, ty = 0;
  if (fine) addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  const base = floats.map(f => getComputedStyle(f).transform === 'none' ? '' : getComputedStyle(f).transform);
  const tick = () => {
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    const t = performance.now() / 1000;
    floats.forEach((f, i) => {
      const k = +f.dataset.float;
      const r = f.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const bob = Math.sin(t * (0.6 + i * .17) + i) * 10 * k;
      f.style.transform = `translate3d(${mx * 40 * k}px, ${my * 30 * k + bob}px, 0) ${base[i]}`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── the flavour worlds: scroll walks through them; the pack turns to the next one ─────────────────────────────────────
const fw = $('[data-fw]');
if (fw) {
  const stage = $('[data-fw-stage]', fw);
  const data = JSON.parse($('[data-fw-data]', fw).textContent);
  const scenes = $$('[data-scene]', fw), words = $$('[data-word]', fw), texts = $$('[data-text]', fw), dots = $$('[data-go]', fw);
  let cur = -1, pack = null;
  const set = i => {
    if (i === cur) return;
    const prev = cur; cur = i;
    const f = data[i];
    ['fb', 'ff', 'fa', 'fd'].forEach((k, j) => stage.style.setProperty('--' + k, [f.bg, f.fg, f.accent, f.deep][j]));
    scenes.forEach((s, j) => { s.classList.toggle('is-on', j === i); s.classList.toggle('is-out', j === prev); });
    words.forEach((w, j) => w.classList.toggle('is-on', j === i));
    texts.forEach((t, j) => t.classList.toggle('is-on', j === i));
    dots.forEach((d, j) => { d.classList.toggle('is-on', j === i); d.setAttribute('aria-selected', String(j === i)); });
    if (pack) pack.show(i);
  };
  set(0);
  if (still) {
    dots.forEach((d, j) => d.addEventListener('click', () => set(j)));
  } else {
    const step = () => {
      const r = fw.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight), 0, 0.9999);
      set(Math.floor(p * data.length));
    };
    addEventListener('scroll', step, { passive: true }); step();
    dots.forEach((d, j) => d.addEventListener('click', () => {
      const r = fw.getBoundingClientRect();
      const y = scrollY + r.top + (j + .5) / data.length * (r.height - innerHeight);
      scrollTo({ top: y, behavior: 'smooth' });
    }));
    // the ingredients drift toward the pointer, each layer by its depth
    if (fine) {
      const layers = $$('.fw-ing', fw);
      let mx = 0, my = 0, tx = 0, ty = 0;
      fw.addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
      const tick = () => {
        mx += (tx - mx) * .05; my += (ty - my) * .05;
        layers.forEach(l => { const d = +l.dataset.depth; l.style.translate = `${mx * -60 * d}px ${my * -40 * d}px`; });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
  // the 3D pack: only with WebGL2, never under Save-Data or reduced motion, after the page has painted
  const canvas = $('[data-pack]', fw);
  const gl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
  if (canvas && gl2 && !still) {
    const go = () => import('./pack.js').then(m => m.createPack(canvas, data, document.documentElement.lang)).then(p => { pack = p; pack.show(cur); }).catch(() => {});
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 1200);
  }
}

// ── a flavour's own page: its pack alone ──────────────────────────────────────────────────────────────────────────
const one = $('[data-pack-data]');
if (one && !still) {
  const canvas = one.previousElementSibling;
  const gl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
  if (gl2) {
    const go = () => import('./pack.js').then(m => m.createPack(canvas, JSON.parse(one.textContent), document.documentElement.lang)).catch(() => {});
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 1000);
  }
}

// ── build your bowl: toppings drop in; the card is drawn on the phone itself and shared or saved ────────────────────────
const build = $('[data-build]');
if (build) {
  const D = JSON.parse($('[data-build-data]', build).textContent);
  const on = $('[data-on]', build), hint = $('[data-hint]', build), share = $('[data-share]', build), again = $('[data-again]', build), dl = $('[data-download]', build);
  // where each topping lands on the bowl (fractions of the plate), and its tilt
  const SPOT = { egg: [.5, .44, -8], cheese: [.33, .6, 14], sausage: [.66, .62, -6], onion: [.38, .33, 22], chili: [.66, .34, -32], lemon: [.76, .5, 18] };
  const placed = new Map();
  const refresh = () => { share.disabled = placed.size === 0; hint.style.opacity = placed.size ? 0 : 1; dl.hidden = true; };
  $$('[data-topping]', build).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.topping;
    if (placed.has(k)) {
      const el = placed.get(k); placed.delete(k); b.setAttribute('aria-pressed', 'false');
      if (still) el.remove(); else el.animate([{ opacity: 1 }, { opacity: 0, transform: `translate(-50%,-140%) rotate(${SPOT[k][2] + 40}deg) scale(.6)` }], { duration: 380, easing: 'ease-in' }).onfinish = () => el.remove();
    } else {
      const [x, y, r] = SPOT[k];
      const img = new Image(); img.src = D.tops[k]; img.alt = '';
      img.style.left = x * 100 + '%'; img.style.top = y * 100 + '%'; img.style.setProperty('--rot', r + 'deg');
      on.appendChild(img); placed.set(k, img); b.setAttribute('aria-pressed', 'true');
      if (!still) img.animate([
        { transform: `translate(-50%, -260%) rotate(${r - 60}deg) scale(1.3)`, opacity: 0 },
        { transform: `translate(-50%, -50%) rotate(${r}deg) scale(.86)`, opacity: 1, offset: .62 },
        { transform: `translate(-50%, -62%) rotate(${r}deg) scale(1.06)`, offset: .8 },
        { transform: `translate(-50%, -50%) rotate(${r}deg) scale(1)` }], { duration: 720, easing: 'cubic-bezier(.3,.7,.3,1)' });
    }
    refresh();
  }));
  again.addEventListener('click', () => { placed.forEach(el => el.remove()); placed.clear(); $$('[data-topping]', build).forEach(b => b.setAttribute('aria-pressed', 'false')); refresh(); });
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  share.addEventListener('click', async () => {
    await document.fonts.ready;
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#D40203'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#FFC629'; g.beginPath(); g.arc(W / 2, 790, 470, 0, Math.PI * 2); g.fill();
    const rtl = D.dir === 'rtl';
    g.direction = D.dir; g.textAlign = 'center';
    g.fillStyle = '#FFFFFF'; g.font = '900 52px Rubik';
    g.fillText(D.name, W / 2, 130);
    g.fillStyle = '#FFC629'; g.font = `900 ${rtl ? 104 : 112}px Rubik`;
    g.fillText(D.line, W / 2, 250);
    const bowl = await load(D.bowl);
    const S = 820, bx = (W - S) / 2, by = 790 - S / 2;
    g.save(); g.shadowColor = 'rgba(34,16,10,.35)'; g.shadowBlur = 50; g.shadowOffsetY = 26; g.drawImage(bowl, bx, by, S, S); g.restore();
    for (const [k] of placed) {
      const [x, y, r] = SPOT[k]; const im = await load(D.tops[k]);
      const w = S * .22, h = w * im.height / im.width;
      g.save(); g.translate(bx + x * S, by + y * S); g.rotate(r * Math.PI / 180);
      g.shadowColor = 'rgba(34,16,10,.3)'; g.shadowBlur = 18; g.shadowOffsetY = 10; g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
    }
    g.fillStyle = '#FFFFFF'; g.font = '900 64px Rubik'; g.fillText(D.tag, W / 2, 1290);
    g.save(); g.translate(rtl ? 130 : W - 130, 1200); g.rotate(-0.06); g.fillStyle = '#FFFFFF';
    g.beginPath(); g.roundRect(-110, -44, 220, 76, 38); g.fill(); g.fillStyle = '#D40203'; g.font = '900 44px Rubik'; g.fillText(D.brand, 0, 14); g.restore();
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'my-indomie.png', { type: 'image/png' });
    dl.href = URL.createObjectURL(blob); dl.hidden = false;           // the picture is always there to save, share sheet or not
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], text: `${D.line} ${D.tag}` }).catch(() => {});
    } else {
      dl.click();
    }
  });
  refresh();
}

// ── tiles lean toward the pointer ───────────────────────────────────────────────────────────────────────────────────
if (fine && !still) $$('[data-tilt]').forEach(t => {
  t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    t.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
  });
  t.addEventListener('pointerleave', () => { t.style.transform = ''; });
});
