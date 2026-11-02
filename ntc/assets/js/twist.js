/* twist.js — single yarn becomes two-ply as the visitor drags: two strands part and twist round each other.
   Drawn the same way as the brand's first loop study: each strand is split into runs by which one is in front
   (cos φ > 0), back runs drawn first, front runs over them with their own edge, so every crossing reads over/under. */
(() => {
  const lab = document.querySelector('[data-twist]');
  if (!lab) return;
  const svg = lab.querySelector('svg');
  const back = svg.querySelector('.y-back'), front = svg.querySelector('.y-front');
  const range = lab.querySelector('.yarn-range');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const X0 = 24, X1 = 616, N = 260, TURNS = 6.5;

  function centre(x) { return 112 + 16 * Math.sin((x - X0) / (X1 - X0) * Math.PI) - 6; }
  function el(name, attrs) { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function d(pts) { return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L'); }

  function render(t) {
    back.textContent = ''; front.textContent = '';
    const amp = 15 * t, w = 34 - 9 * t;
    const strands = t < 0.02 ? [0] : [0, 1];
    strands.forEach(s => {
      const runs = []; let run = [], depth = null;
      for (let i = 0; i < N; i++) {
        const x = X0 + (X1 - X0) * i / (N - 1);
        const phi = 2 * Math.PI * TURNS * i / (N - 1) + s * Math.PI;
        const y = centre(x) + amp * Math.sin(phi);
        const f = Math.cos(phi) > 0 || strands.length === 1;
        if (depth !== null && f !== depth) { run.push([x, y]); runs.push({ f: depth, pts: run }); run = []; }
        run.push([x, y]); depth = f;
      }
      runs.push({ f: depth, pts: run });
      runs.forEach(r => {
        const g = r.f ? front : back;
        const path = d(r.pts);
        g.appendChild(el('path', { d: path, class: 'y-edge', 'stroke-width': (w + 2.4).toFixed(1), 'stroke-linecap': 'butt' }));
        g.appendChild(el('path', { d: path, class: s ? 'y-b' : 'y-a', 'stroke-width': w.toFixed(1), 'stroke-linecap': 'butt' }));
        // fibres: short slanted hairlines across the strand, the spin of the yarn itself
        for (let k = 2; k < r.pts.length - 2; k += 4) {
          const [x, y] = r.pts[k];
          const a = 0.55, h = w * 0.42;
          g.appendChild(el('path', { d: `M${(x - Math.sin(a) * h).toFixed(1)} ${(y - Math.cos(a) * h).toFixed(1)} L${(x + Math.sin(a) * h).toFixed(1)} ${(y + Math.cos(a) * h).toFixed(1)}`, class: 'y-fibre' }));
        }
      });
    });
    // the frayed ends
    [X0, X1].forEach((x, i) => {
      for (let k = 0; k < 7; k++) {
        const y = centre(x) + (k - 3) * (w + amp) / 7;
        const dx = (i ? 1 : -1) * (8 + (k % 3) * 5);
        front.appendChild(el('path', { d: `M${x} ${y.toFixed(1)} q${dx / 2} ${(k - 3) * 1.5} ${dx} ${(k - 3) * 2.4}`, class: 'y-fibre', 'stroke-width': 1.2 }));
      }
    });
    lab.dataset.mode = t < 0.5 ? 'single' : 'twisted';
  }

  range.addEventListener('input', () => render(range.value / 100));
  render(range.value / 100);
  if (!reduce) {
    let done = false;
    new IntersectionObserver((es, io) => {
      if (done || !es[0].isIntersecting) return;
      done = true; io.disconnect();
      const t0 = performance.now(), dur = 1800;
      range.value = 0; render(0);
      (function step(now) {
        const u = Math.min(1, (now - t0 - 400) / dur);
        if (u > 0) { const e = 1 - Math.pow(1 - u, 3); range.value = Math.round(e * 100); render(e); }
        if (u < 1) requestAnimationFrame(step);
      })(t0);
    }, { threshold: 0.6 }).observe(lab);
  }
})();
