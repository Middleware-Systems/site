// B2M · Brinji to Marketing — everything that answers a visitor. No words here: every word comes from the page.
document.documentElement.classList.add('ready');      // the script has started: the stylesheet's safety net stands down
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rtl = document.documentElement.dir === 'rtl';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ── header and menu ── */
(() => {
  const hd = $('[data-header]'), btn = $('[data-menu-open]'), menu = $('[data-menu]');
  if (!hd) return;
  const solid = () => hd.classList.toggle('is-solid', scrollY > 24);
  solid();
  addEventListener('scroll', solid, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const li = (document.activeElement && document.activeElement.closest('.has-sub')) || $('.has-sub:hover');
    if (!li) return;
    const back = (ev) => {
      if (ev.type === 'focusout' && li.contains(ev.relatedTarget)) return;
      li.classList.remove('is-shut'); li.removeEventListener('pointerleave', back); li.removeEventListener('focusout', back);
    };
    li.addEventListener('pointerleave', back); li.addEventListener('focusout', back);
    if (li.contains(document.activeElement)) $('a', li).focus();
    li.classList.add('is-shut');
  });
  if (!btn || !menu) return;
  const set = (open) => {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    for (const el of [$('main'), $('.ft')]) if (el) el.inert = open;      // nothing behind the open menu takes focus
    if (open) { const a = $('a', menu); a && a.focus(); }
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) set(false); });
})();

/* ── the points land on the letters ── */
(() => {
  const heads = $$('.dt[data-dt]');
  const land = (el) => el.classList.add('is-in');
  if (!('IntersectionObserver' in window) || still) { heads.forEach(land); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { land(e.target); io.unobserve(e.target); } }), { threshold: .3, rootMargin: '0px 0px -8% 0px' });
  heads.forEach((el) => { if (el.dataset.dt === 'now') requestAnimationFrame(() => requestAnimationFrame(() => land(el))); else io.observe(el); });
})();

/* ── the opening ── */
(() => {
  const root = $('[data-hero]');
  if (!root) return;
  import(new URL('./hero.js' + new URL(import.meta.url).search, import.meta.url)).then((m) => m.hero(root)).catch(() => {});
  let paused = false;
  const pb = $('[data-pause]', root);
  if (pb) pb.addEventListener('click', () => {
    paused = !paused;
    pb.setAttribute('aria-pressed', String(paused));
    document.dispatchEvent(new CustomEvent('b2m:pause', { detail: paused }));
  });
  const slot = $('[data-asks]', root), asks = $$('[data-ask]', root).map((e) => e.textContent);
  if (!slot || asks.length < 2 || still) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden || paused) return;
    slot.classList.add('is-out');
    setTimeout(() => {
      i = (i + 1) % asks.length;
      slot.textContent = asks[i];
      slot.classList.remove('is-out');
      document.dispatchEvent(new CustomEvent('b2m:ask'));
    }, 360);
  }, 3400);
})();

/* ── the line: from the question mark to the point ── */
(() => {
  const sec = $('[data-line]');
  if (!sec) return;
  const track = $('.track', sec), rail = $('.track-rail', sec), stations = $$('[data-station]', sec);
  let thr = [];
  const measure = () => {
    const r = rail.getBoundingClientRect(), vertical = r.height > r.width;
    thr = stations.map((s) => {
      const b = $('.st-ring', s).getBoundingClientRect();
      if (vertical) return (b.top + b.height / 2 - r.top) / r.height;
      const x = b.left + b.width / 2;
      return rtl ? (r.right - x) / r.width : (x - r.left) / r.width;
    });
  };
  const update = () => {
    const r = track.getBoundingClientRect(), vh = innerHeight;
    const p = still ? 1 : clamp((vh * .92 - r.top) / (vh * .5));      // whole by the time the row is mid-screen
    track.style.setProperty('--p', p.toFixed(4));
    stations.forEach((s, i) => s.classList.toggle('is-on', p >= thr[i] - .004));
    track.classList.toggle('is-done', p > .995);
  };
  measure(); update();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); update(); });
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', () => { measure(); update(); });
})();

/* ── the services: a question opens its picture from its own point ── */
(() => {
  const sec = $('[data-services]');
  if (!sec) return;
  const rows = $$('[data-sv]', sec), figs = $$('[data-fig]', sec);
  let cur = 0;
  rows[0] && rows[0].classList.add('is-on');
  const show = (i) => {
    if (i === cur || !figs[i]) return;
    figs.forEach((f) => f.classList.remove('was-on'));
    figs[cur].classList.remove('is-on'); figs[cur].classList.add('was-on');
    rows[cur].classList.remove('is-on');
    cur = i;
    figs[i].classList.add('is-on'); rows[i].classList.add('is-on');
  };
  rows.forEach((r, i) => { r.addEventListener('pointerenter', () => show(i)); r.addEventListener('focus', () => show(i)); });
  if (figs.length && 'IntersectionObserver' in window) new IntersectionObserver((es, io) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    if (matchMedia('(min-width: 900px)').matches) figs.forEach((f) => { const im = $('img', f); if (im) im.loading = 'eager'; });
  }, { rootMargin: '600px 0px' }).observe(sec);
})();

/* ── a service's picture opens from its point ── */
$$('.svc-pic[data-open]').forEach((f) => {
  const img = $('img', f), go = () => requestAnimationFrame(() => f.classList.add('is-in'));
  if (!img || img.complete) go(); else { img.addEventListener('load', go); img.addEventListener('error', go); }
});

/* ── a page's head: one device drawn in points — the mark, its 2, a photograph as a print ── */
$$('canvas[data-dots]').forEach((cv) => {
  const kind = cv.dataset.dots, im = new Image();
  const off = document.createElement('canvas'), ox = off.getContext('2d', { willReadFrequently: true });
  function draw() {
    const r = cv.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W || !H || !im.naturalWidth) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    const iw = im.naturalWidth, ih = im.naturalHeight;
    if (kind === 'photo') {
      // the photograph, screened in light points on the ink, fading toward the words
      const cell = Math.max(5, W / 84), rowH = cell * .866, cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / rowH) + 1;
      const k = Math.max(W / iw, H / ih);
      off.width = cols; off.height = rows;
      let px;
      try { ox.drawImage(im, (iw - W / k) / 2, (ih - H / k) / 2, W / k, H / k, 0, 0, cols, rows); px = ox.getImageData(0, 0, cols, rows).data; } catch (e) { return; }
      x.fillStyle = '#ead9bf'; x.beginPath();
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const q = (j * cols + i) * 4, lum = (0.2126 * px[q] + 0.7152 * px[q + 1] + 0.0722 * px[q + 2]) / 255;
        const fx = (i + (j % 2 ? .5 : 0)) * cell / W, edge = clamp((rtl ? 1 - fx : fx) * 1.5 - .12);
        const rad = cell * .56 * Math.sqrt(clamp(lum * 1.15 - .06)) * edge;
        if (rad < .35) continue;
        const cx = (i + (j % 2 ? .5 : 0)) * cell, cy = j * rowH;
        x.moveTo(cx + rad, cy); x.arc(cx, cy, rad, 0, 6.2832);
      }
      x.globalAlpha = .62; x.fill(); x.globalAlpha = 1;
      return;
    }
    // a mask: red is letter, green is the point
    off.width = iw; off.height = ih;
    ox.clearRect(0, 0, iw, ih); ox.drawImage(im, 0, 0);
    const d = ox.getImageData(0, 0, iw, ih).data;
    const k = Math.min(H * .78 / ih, W * .86 / iw), gw = iw * k, gh = ih * k;
    const x0 = rtl ? W * .06 : W - gw - W * .06, y0 = (H - gh) / 2;
    const pitch = Math.max(4.4, Math.min(8, gh / 44)), rad = pitch * .33, step = pitch / k;
    for (let pass = 0; pass < 2; pass++) {
      if (pass && kind === 'nodot') break;
      x.fillStyle = pass ? '#ff2d78' : '#ead9bf';
      x.globalAlpha = pass ? 1 : .8;
      x.beginPath();
      let row = 0;
      for (let my = step / 2; my < ih; my += step * .866, row++) for (let mx = step / 2 + (row % 2 ? step / 2 : 0); mx < iw; mx += step) {
        const q = ((my | 0) * iw + (mx | 0)) * 4;
        if (d[q + 3] < 128 || (d[q + 1] > 128 ? 1 : 0) !== pass) continue;
        const px = x0 + (rtl && kind !== 'mark' ? iw - mx : mx) * k, py = y0 + my * k;
        x.moveTo(px + rad, py); x.arc(px, py, rad, 0, 6.2832);
      }
      x.fill();
    }
    x.globalAlpha = 1;
  }
  im.onload = draw;
  im.src = cv.dataset.src;
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 120); });
});

/* ── made: the photograph as a print, and a lens that shows it true ── */
$$('[data-halftone]').forEach((root) => {
  const stage = $('.ht-stage', root), cv = $('.ht-cv', root), lens = $('[data-ht-lens]', root);
  const imgs = $$('[data-ht-src]', root), tabs = $$('[data-ht-step]', root);
  const off = document.createElement('canvas'), ox = off.getContext('2d', { willReadFrequently: true });
  let cur = 0, W = 0, H = 0, lx = rtl ? .34 : .66, ly = .52, geo = null;
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--teal').trim() || '#015650', ground = css.getPropertyValue('--paper-2').trim() || '#e9e0d2';

  function place() {
    if (!geo) return;
    const s = lens.offsetWidth, x = lx * W, y = ly * H;
    lens.style.transform = `translate(${x - s / 2}px, ${y - s / 2}px)`;
    lens.style.backgroundSize = `${geo.bw}px ${geo.bh}px`;
    lens.style.backgroundPosition = `${geo.ox - (x - s / 2)}px ${geo.oy - (y - s / 2)}px`;
  }
  function draw() {
    const img = imgs[cur];
    if (!img || !img.complete || !img.naturalWidth) return;
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    if (!W || !H) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = Math.max(5, W / 98), rowH = cell * .866;
    const cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / rowH) + 1;
    const iw = img.naturalWidth, ih = img.naturalHeight, k = Math.max(W / iw, H / ih);
    geo = { bw: iw * k, bh: ih * k, ox: (W - iw * k) / 2, oy: (H - ih * k) / 2 };
    off.width = cols; off.height = rows;
    let d;
    try {
      ox.drawImage(img, -geo.ox / k, -geo.oy / k, W / k, H / k, 0, 0, cols, rows);
      d = ox.getImageData(0, 0, cols, rows).data;
    } catch (e) { return; }
    x.fillStyle = ground; x.fillRect(0, 0, W, H);
    x.fillStyle = ink; x.beginPath();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const q = (j * cols + i) * 4;
        const lum = (0.2126 * d[q] + 0.7152 * d[q + 1] + 0.0722 * d[q + 2]) / 255;
        const dark = clamp((1 - lum - .06) * 1.12);
        if (dark < .02) continue;
        const rad = cell * .6 * Math.sqrt(dark);
        const cx = (i + (j % 2 ? .5 : 0)) * cell, cy = j * rowH;
        x.moveTo(cx + rad, cy); x.arc(cx, cy, rad, 0, 6.2832);
      }
    }
    x.fill();
    lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    root.classList.add('is-ready');
    place();
  }
  function pick(i, focus) {
    if (!imgs[i]) return;
    cur = i;
    tabs.forEach((t, n) => { t.setAttribute('aria-selected', n === i ? 'true' : 'false'); t.tabIndex = n === i ? 0 : -1; });
    imgs.forEach((im, n) => { im.classList.toggle('is-on', n === i); if (n === i) im.removeAttribute('aria-hidden'); else im.setAttribute('aria-hidden', 'true'); });
    stage.setAttribute('aria-labelledby', tabs[i].id);
    if (focus) tabs[i].focus();
    const img = imgs[i];
    if (img.complete && img.naturalWidth) draw(); else { img.loading = 'eager'; img.addEventListener('load', draw, { once: true }); }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(i));
    t.addEventListener('keydown', (e) => {
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { e.preventDefault(); pick((i + 1) % tabs.length, true); }
      if (e.key === back) { e.preventDefault(); pick((i - 1 + tabs.length) % tabs.length, true); }
    });
  });
  const to = (e) => { const r = stage.getBoundingClientRect(); lx = clamp((e.clientX - r.left) / r.width); ly = clamp((e.clientY - r.top) / r.height); place(); };
  stage.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') to(e); });
  stage.addEventListener('click', (e) => { if (e.target !== lens) to(e); });
  let drag = false;
  lens.addEventListener('pointerdown', (e) => { drag = true; lens.setPointerCapture(e.pointerId); e.preventDefault(); });
  lens.addEventListener('pointermove', (e) => { if (drag) to(e); });
  lens.addEventListener('pointerup', () => { drag = false; });
  lens.addEventListener('pointercancel', () => { drag = false; });
  lens.addEventListener('keydown', (e) => {
    const step = .04, m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!m) return;
    e.preventDefault(); lx = clamp(lx + m[0]); ly = clamp(ly + m[1]); place();
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 120); });
  pick(0);
});

/* ── business intelligence: scattered points settle into a line ── */
(() => {
  const sec = $('[data-bi]');
  if (!sec) return;
  const cv = $('.bi-cv', sec), btn = $('[data-bi-toggle]', sec), lab = btn && $('span', btn);
  const N = 150, pts = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) {
    const tx = .05 + .9 * (i / (N - 1)), e = tx * tx * (3 - 2 * tx), stray = rnd() < .13;
    pts.push({ nx: .04 + .92 * rnd(), ny: .06 + .88 * rnd(), tx, ty: .86 - .7 * e + (rnd() - .5) * .07, stray, d: tx * .55 + rnd() * .12, s: 0 });
  }
  let goal = 0, W = 0, H = 0, raf = 0, last = 0;
  const size = () => {
    const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const X = (v) => (rtl ? 1 - v : v) * W;
  function draw(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    const x = cv.getContext('2d');
    x.clearRect(0, 0, W, H);
    let moving = false, lead = 0;
    for (const p of pts) {
      const want = p.stray ? 0 : goal;
      const gate = goal ? clamp((clock - p.d) * 2.2) : 1;
      const tgt = want * gate;
      const ds = (tgt - p.s) * Math.min(1, dt * 5.5);
      if (Math.abs(tgt - p.s) > .002) moving = true;
      p.s += ds;
      const e = p.s * p.s * (3 - 2 * p.s);
      const px = X(p.nx + (p.tx - p.nx) * e), py = (p.ny + (p.ty - p.ny) * e) * H;
      x.globalAlpha = p.stray ? .32 + .25 * (1 - goalEase) : .55 + .45 * e;
      x.fillStyle = '#ead9bf';
      x.beginPath(); x.arc(px, py, Math.max(2.6, W / 180), 0, 6.2832); x.fill();
      if (!p.stray) lead = Math.max(lead, e * p.tx);
    }
    goalEase += (goal - goalEase) * Math.min(1, dt * 3);
    if (goal) clock += dt; else clock = 0;
    if (Math.abs(goal - goalEase) > .004) moving = true;
    // the line the points agree on, and the point it arrives at
    if (goalEase > .02) {
      x.globalAlpha = goalEase;
      x.strokeStyle = '#f4efe7'; x.lineWidth = Math.max(2, W / 320); x.lineCap = 'round'; x.beginPath();
      const end = .05 + .9 * clamp(lead / .95);
      for (let i = 0; i <= 60; i++) {
        const tx = .05 + (end - .05) * (i / 60), e = tx * tx * (3 - 2 * tx);
        const px = X(tx), py = (.86 - .7 * e) * H;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
      const e = end * end * (3 - 2 * end), r = Math.max(9, W / 44) * clamp((lead - .8) / .15);
      if (r > .5) { x.globalAlpha = 1; x.fillStyle = '#ff2d78'; x.beginPath(); x.arc(X(end), (.86 - .7 * e) * H, r, 0, 6.2832); x.fill(); }
    }
    x.globalAlpha = 1;
    if (moving) raf = requestAnimationFrame(draw);
  }
  let clock = 0, goalEase = 0;
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(draw); } };
  const set = (g) => {
    goal = g; clock = 0;
    if (lab) lab.textContent = g ? btn.dataset.b : btn.dataset.a;
    if (still) { pts.forEach((p) => { p.s = p.stray ? 0 : g; }); goalEase = g; clock = 9; }
    kick();
  };
  size(); set(0);
  btn && btn.addEventListener('click', () => set(goal ? 0 : 1));
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { set(1); io.disconnect(); } }, { threshold: .5 }).observe(cv);
  addEventListener('resize', () => { size(); kick(); });
})();

/* ── the space: one room, four ways to sit ── */
(() => {
  const root = $('[data-room]');
  if (!root) return;
  const plan = $('[data-room-plan]', root), line = $('[data-room-line]', root), tabs = $$('[data-room-tab]', root), panel = $('#room-panel', root);
  const row = (y, xs) => xs.map((x) => [x, y]);
  const LAY = {
    focus: { tb: [[50, 50, 46, 22]], lead: [79, 50], st: [...row(26, [32, 41, 50, 59, 68]), ...row(74, [32, 41, 50, 59, 68]), [21, 50]] },
    training: { tb: [[50, 8, 38, 3]], lead: [50, 21], st: [...row(43, [29, 43, 57, 71]), ...row(61, [29, 43, 57, 71]), ...row(79, [36, 50, 64])] },
    workshop: { tb: [[24, 38, 13, 18], [50, 68, 13, 18], [76, 38, 13, 18]], lead: [50, 30], st: [[13, 38], [35, 38], [24, 19], [24, 57], [39, 68], [61, 68], [50, 49], [50, 87], [65, 38], [87, 38], [76, 57]] },
    meeting: { tb: [[50, 50, 62, 16]], lead: [50, 31], st: [...row(31, [24, 37, 63, 76]), ...row(69, [20, 32, 44, 56, 68, 80]), [12, 50]] },
  };
  const tbs = [0, 1, 2].map(() => { const i = document.createElement('i'); i.className = 'tb'; plan.appendChild(i); return i; });
  const sts = Array.from({ length: 12 }, (_, n) => { const i = document.createElement('i'); i.className = 'st' + (n === 11 ? ' is-lead' : ''); plan.appendChild(i); return i; });
  const fx = (x) => (rtl ? 100 - x : x);
  function show(id, focus) {
    const L = LAY[id];
    if (!L) return;
    tbs.forEach((el, n) => {
      const t = L.tb[n];
      el.style.cssText = t ? `left:${fx(t[0])}%;top:${t[1]}%;width:${t[2]}%;height:${t[3]}%;opacity:1` : `left:50%;top:50%;width:0;height:0;opacity:0`;
    });
    sts.forEach((el, n) => { const p = n === 11 ? L.lead : L.st[n]; el.style.left = fx(p[0]) + '%'; el.style.top = p[1] + '%'; });
    tabs.forEach((t) => {
      const on = t.dataset.roomTab === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      if (on) { line.textContent = t.dataset.line; panel.setAttribute('aria-labelledby', t.id); if (focus) t.focus(); }
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.roomTab));
    t.addEventListener('keydown', (e) => {
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { e.preventDefault(); show(tabs[(i + 1) % tabs.length].dataset.roomTab, true); }
      if (e.key === back) { e.preventDefault(); show(tabs[(i - 1 + tabs.length) % tabs.length].dataset.roomTab, true); }
    });
  });
  show(tabs[0].dataset.roomTab);
})();

/* ── a message, written here and sent from the visitor's own email ── */
$$('[data-compose]').forEach((form) => {
  const kind = form.dataset.compose, ready = $('[data-ready]', form), out = $('[data-ready-text]', form), copy = $('[data-copy]', form);
  const val = (n) => { const el = form.elements[n]; return el ? String(el.value || '').trim() : ''; };
  if (kind === 'contact') {
    const box = form.elements.question, radios = $$('input[name="topic"]', form);
    let filled = '';
    const choose = (r) => { if (!box.value.trim() || box.value.trim() === filled) { box.value = r.dataset.q; filled = r.dataset.q; } };
    radios.forEach((r) => r.addEventListener('change', () => choose(r)));
    const topic = new URLSearchParams(location.search).get('topic');
    const pre = topic && radios.find((r) => r.value === topic);
    if (pre) { pre.checked = true; choose(pre); }
  }
  if (kind === 'apply') {
    $$('[data-role]').forEach((a) => a.addEventListener('click', () => { const s = form.elements.role; [...s.options].forEach((o) => { if (o.textContent === a.dataset.role) s.value = o.value; }); }));
  }
  form.noValidate = true;
  $$('[required]', form).forEach((el) => el.addEventListener('input', () => {
    if (!el.value.trim()) return;
    const f = el.closest('.field'), msg = $('.err', f);
    f.classList.remove('is-bad');
    if (msg) msg.hidden = true;
    el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby');
  }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let first = null;
    $$('[required]', form).forEach((el) => {
      const f = el.closest('.field'), bad = !el.value.trim();
      f.classList.toggle('is-bad', bad);
      const msg = $('.err', f);
      if (msg) { msg.hidden = !bad; if (!msg.id) msg.id = el.id + '-err'; if (bad) el.setAttribute('aria-describedby', msg.id); else el.removeAttribute('aria-describedby'); }
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && !first) first = el;
    });
    if (first) { first.focus(); return; }
    let subject, body;
    if (kind === 'contact') {
      const r = form.querySelector('input[name="topic"]:checked');
      subject = form.dataset.subject.replace('{label}', r ? r.dataset.label : form.dataset.general);
      body = `${val('question')}\n\n${form.dataset.from}: ${val('name')}${val('company') ? ', ' + val('company') : ''}\n${val('reach')}`;
    } else {
      subject = form.dataset.subject.replace('{label}', val('role'));
      body = `${val('role')} · ${val('craft')}\n${val('name')}\n${val('link')}${val('note') ? '\n\n' + val('note') : ''}`;
    }
    out.textContent = body;
    ready.hidden = false;
    ready.focus();
    ready.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
    location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  copy && copy.addEventListener('click', async () => {
    const lab = $('span', copy), was = lab.textContent;
    try { await navigator.clipboard.writeText(out.textContent); } catch (e) {
      const r = document.createRange(); r.selectNodeContents(out); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy');
    }
    lab.textContent = copy.dataset.done;
    setTimeout(() => { lab.textContent = was; }, 1800);
  });
});

/* ── the office clock ── */
$$('[data-clock]').forEach((el) => {
  const tick = () => {
    try { el.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: el.dataset.clock }).format(new Date()); } catch (e) { el.textContent = ''; }
  };
  tick(); setInterval(tick, 30000);
});
