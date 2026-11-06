// stretch.js: «لذتها بمطتها». A slab of mozzarella; press on it and pull, and strands of cheese follow the pointer.
// Each strand is a verlet chain anchored in the slab. Cheese is plastic, not elastic: a strand grows longer as it is
// pulled, thins in the middle, and snaps when it passes its own length, one at a time. Let go and they fall back.
// The button pulls it for a keyboard or a reader who would rather watch. Reduced motion: the button shows the
// stretched cheese at once, without the travel.

const box = document.querySelector('[data-stretch]');

function start() {
  if (!box) return;
  const canvas = box.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const lenOut = box.querySelector('[data-len]');
  const bestOut = box.querySelector('[data-bestout]');
  const wordOut = box.querySelector('[data-word]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = 9, M = 22;
  let W = 0, H = 0, dpr = 1, slab = null, strands = [], grab = null, best = 0, raf = 0, auto = null;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const sw = Math.min(W * 0.62, 420), sh = Math.min(H * 0.2, 120);
    slab = { x: (W - sw) / 2, y: H * 0.86 - sh, w: sw, h: sh };
    if (!raf) paint();
  }

  const anchorsOf = () => Array.from({ length: N }, (_, i) => ({ x: slab.x + slab.w * (0.3 + 0.4 * i / (N - 1)), y: slab.y + 8 }));
  const cm = (px) => Math.round(px / slab.w * 14);        // the slab stands for a 14 cm block

  function begin(x, y) {
    grab = { x, y };
    strands = anchorsOf().map((a, i) => {
      const pts = Array.from({ length: M }, (_, k) => {
        const f = k / (M - 1);
        return { x: a.x + (x - a.x) * f, y: a.y + (y - a.y) * f, px: a.x + (x - a.x) * f, py: a.y + (y - a.y) * f };
      });
      return { a, pts, rest: Math.max(2, Math.hypot(x - a.x, y - a.y) / (M - 1)), on: true,
               off: (i - (N - 1) / 2), max: H * (0.5 + Math.random() * 0.55), thick: 11 + Math.random() * 9 };
    });
    box.setAttribute('data-used', '');
    loop();
  }
  function release() {
    grab = null;
    for (const s of strands) s.on = false;
  }

  function sim(dt) {
    const g = 1500 * dt * dt;
    let longest = 0;
    for (const s of strands) {
      const end = s.pts[M - 1];
      if (s.on && grab) {
        const len = Math.hypot(grab.x - s.a.x, grab.y - s.a.y);
        const conv = Math.max(0, 1 - len / (H * 0.45));
        end.x = grab.x + s.off * 5 * conv; end.y = grab.y + Math.abs(s.off) * 1.5 * conv;
        s.rest = Math.max(s.rest * 0.97, len / (M - 1));        // plastic: it follows the pull and holds taut
        if (len > s.max) { s.on = false; flash(); }             // past its own length: it snaps
        longest = Math.max(longest, len);
      } else {
        s.rest *= 0.93;                                           // a let-go strand shrinks back into the slab
      }
      for (let k = 1; k < M; k++) {
        const p = s.pts[k];
        if (k === M - 1 && s.on && grab) continue;
        const vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g;
      }
      for (let it = 0; it < 14; it++) {
        s.pts[0].x = s.a.x; s.pts[0].y = s.a.y;
        for (let k = 0; k < M - 1; k++) {
          const p = s.pts[k], q = s.pts[k + 1];
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1e-6;
          const diff = (d - s.rest) / d;
          const fixedQ = k + 1 === M - 1 && s.on && grab;
          const wp = k === 0 ? 0 : (fixedQ ? 1 : 0.5), wq = fixedQ ? 0 : (k === 0 ? 1 : 0.5);
          p.x += dx * diff * wp; p.y += dy * diff * wp;
          q.x -= dx * diff * wq; q.y -= dy * diff * wq;
        }
        if (!s.on) for (const p of s.pts) if (p.y > slab.y + 4 && p.x > slab.x && p.x < slab.x + slab.w) p.y = slab.y + 4;  // a let-go strand lies on the slab
      }
    }
    strands = strands.filter((s) => s.on || s.rest > 0.6);
    return longest;
  }

  let flashT = 0;
  function flash() { flashT = 1; if (!strands.some((s) => s.on)) { wordOut.textContent = box.dataset.snap; } }

  function paintSlab() {
    const { x, y, w, h } = slab;
    ctx.save();
    ctx.fillStyle = 'rgba(7, 26, 62, .22)';
    ctx.filter = 'blur(14px)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 10, w * 0.52, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const r = 22;
    const body = ctx.createLinearGradient(0, y, 0, y + h);
    body.addColorStop(0, '#FFF6DD'); body.addColorStop(0.55, '#F8E8BD'); body.addColorStop(1, '#EED39A');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    const top = ctx.createLinearGradient(0, y, 0, y + h * 0.35);
    top.addColorStop(0, 'rgba(255, 255, 255, .9)'); top.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.roundRect(x + 6, y + 4, w - 12, h * 0.4, [r - 6, r - 6, 8, 8]); ctx.fill();
    ctx.strokeStyle = 'rgba(176, 132, 52, .35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
    // the packet's label band, as on New Park's mozzarella block
    ctx.fillStyle = '#0A5FB0';
    ctx.beginPath(); ctx.roundRect(x + w * 0.06, y + h * 0.56, w * 0.88, h * 0.26, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.font = `700 ${Math.round(h * 0.15)}px Manrope, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MOZZARELLA', x + w / 2, y + h * 0.695);
  }

  function paintStrand(s, pass) {
    const pts = s.pts;
    const total = pts.reduce((a, p, k) => k ? a + Math.hypot(p.x - pts[k - 1].x, p.y - pts[k - 1].y) : 0, 0);
    const t0 = s.thick * Math.min(1, Math.sqrt(30 / Math.max(30, total)) * 1.9);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < M - 1; k++) {
      const f = (k + 0.5) / (M - 1);
      const neck = 0.3 + 0.7 * Math.pow(Math.abs(f - 0.5) * 2, 1.4);     // thin in the middle, full at each end
      const base = f < 0.18 ? 1 + (0.18 - f) * 4 : 1;                    // it widens into the slab
      const w = Math.max(0.9, t0 * neck * base * (s.on ? 1 : 0.85));
      const p = pts[k], q = pts[k + 1];
      ctx.beginPath();
      if (pass === 0) { ctx.lineWidth = w + 2.4; ctx.strokeStyle = 'rgba(190, 142, 58, .55)'; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
      else if (pass === 1) { ctx.lineWidth = w; ctx.strokeStyle = '#F7E3AE'; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
      else { const o = w * 0.2; ctx.lineWidth = Math.max(0.6, w * 0.32); ctx.strokeStyle = 'rgba(255, 252, 238, .95)'; ctx.moveTo(p.x - o, p.y - o); ctx.lineTo(q.x - o, q.y - o); }
      ctx.stroke();
    }
  }

  function paintPiece(x, y) {                       // the torn piece being lifted
    ctx.save();
    ctx.translate(x, y - 8); ctx.rotate(-0.08);
    ctx.fillStyle = 'rgba(7, 26, 62, .14)'; ctx.filter = 'blur(6px)';
    ctx.beginPath(); ctx.ellipse(4, 26, 36, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.filter = 'none';
    const g = ctx.createLinearGradient(0, -18, 0, 20);
    g.addColorStop(0, '#FFF7DF'); g.addColorStop(1, '#EBCF8E');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(176, 128, 46, .55)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-34, -10); ctx.quadraticCurveTo(-30, -20, -14, -18); ctx.lineTo(18, -19); ctx.quadraticCurveTo(34, -18, 35, -6);
    ctx.lineTo(33, 8); ctx.lineTo(26, 14); ctx.lineTo(18, 9); ctx.lineTo(10, 16); ctx.lineTo(0, 10); ctx.lineTo(-9, 17);
    ctx.lineTo(-18, 10); ctx.lineTo(-27, 15); ctx.quadraticCurveTo(-36, 6, -34, -10); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, .7)';
    ctx.beginPath(); ctx.ellipse(-8, -11, 16, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function paint() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    paintSlab();
    for (const pass of [0, 1, 2]) for (const s of strands) paintStrand(s, pass);
    if (grab && strands.some((s) => s.on)) paintPiece(grab.x, grab.y);
  }

  let lastT = 0;
  function loop() {
    if (raf) return;
    lastT = performance.now();
    const tick = (now) => {
      const dt = Math.min(1 / 30, (now - lastT) / 1000); lastT = now;
      if (auto) auto(now);
      const longest = sim(dt);
      if (grab && strands.some((s) => s.on)) {
        const c = cm(Math.max(0, slab.y - grab.y));
        lenOut.textContent = c;
        wordOut.textContent = box.dataset.readout;
        if (c > best) { best = c; bestOut.textContent = ` · ${box.dataset.best} ${best} cm`; }
      }
      paint();
      if (strands.length || grab) raf = requestAnimationFrame(tick);
      else { raf = 0; }
    };
    raf = requestAnimationFrame(tick);
  }

  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = pos(e);
    if (y < slab.y - 90 || x < slab.x - 40 || x > slab.x + slab.w + 40) return;
    canvas.setPointerCapture(e.pointerId);
    auto = null;
    begin(x, Math.min(y, slab.y));
  });
  canvas.addEventListener('pointermove', (e) => { if (grab && !auto) { const [x, y] = pos(e); grab.x = x; grab.y = Math.min(y, slab.y + 2); } });
  const up = () => { if (grab && !auto) release(); };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  box.querySelector('[data-auto]').addEventListener('click', () => {
    const sx = slab.x + slab.w / 2, sy = slab.y;
    begin(sx, sy);
    if (reduce) {                                   // no travel: the cheese, stretched, at once
      grab.y = H * 0.18;
      for (const s of strands) s.max = Infinity;
      for (let i = 0; i < 120; i++) sim(1 / 60);
      paint();
      const c = cm(slab.y - grab.y); lenOut.textContent = c; best = Math.max(best, c);
      bestOut.textContent = ` · ${box.dataset.best} ${best} cm`;
      setTimeout(() => { release(); loop(); }, 1600);
      return;
    }
    const t0 = performance.now();
    auto = (now) => {
      const f = Math.min(1, (now - t0) / 2200);
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      grab.x = sx + Math.sin(f * Math.PI * 2) * 26;
      grab.y = sy - e * (sy - H * 0.06);
      if (f >= 1) { auto = null; release(); }
    };
  });

  new ResizeObserver(resize).observe(canvas);
  resize();
  box.dataset.ready = '1';
}

try { start(); } catch (err) { console.warn('stretch: not drawn', err); }
