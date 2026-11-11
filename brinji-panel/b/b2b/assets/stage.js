// The stage (DESIGN §3): the numeral is reprinted as one point per point of sale, and the scroll carries every point
// out of it, nearest-to-Adra first, into the field of Syria. WebGL2 draws the morph; without it — or under reduced
// motion or Save-Data — a canvas 2D draws the finished field once. Nothing counts, nothing loops after it settles.

const LIME = [147 / 255, 213 / 255, 0];
const T500 = [81 / 255, 148 / 255, 140 / 255];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export async function stage(root) {
  const data = JSON.parse(document.getElementById('stage-data').textContent);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const pin = root.querySelector('[data-pin]');
  const canvas = root.querySelector('[data-canvas]');
  const hero = root.querySelector('[data-hero] svg');
  const map = root.querySelector('[data-map]');
  const net = root.querySelector('[data-net]');

  let gl = null;
  if (!reduce && !saveData) {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  }
  const res = await fetch(data.bin);
  if (!res.ok) throw new Error('field.bin ' + res.status);
  const raw = new Uint16Array(await res.arrayBuffer());
  const N = raw.length / 2;
  if (N !== data.n) throw new Error(`field.bin carries ${N} points, the page says ${data.n}`);   // fail loudly

  // the field in the map's own 0..1 box, in departure order; and each point's local density (its colour)
  const ux = new Float32Array(N), uy = new Float32Array(N), dens = new Float32Array(N);
  for (let i = 0; i < N; i++) { ux[i] = raw[2 * i] / 65535; uy[i] = raw[2 * i + 1] / 65535; }
  {
    const G = 120, grid = new Uint16Array(G * G);
    const cell = i => Math.min(G - 1, (ux[i] * G) | 0) + Math.min(G - 1, (uy[i] * G) | 0) * G;
    for (let i = 0; i < N; i++) grid[cell(i)]++;
    const sorted = Array.from(grid).filter(v => v).sort((a, b) => a - b);
    const top = Math.log1p(sorted[Math.floor(sorted.length * 0.97)] || 1);
    for (let i = 0; i < N; i++) dens[i] = clamp(Math.log1p(grid[cell(i)]) / top);
  }

  // the live stage is three screens taller than the still one: switching to it under a reader who has already left the
  // cover would carry them away from what they were reading, so a late arrival gets the still field instead
  if (!gl || scrollY > 40) return still(root, map, ux, uy, dens);
  root.classList.add('is-live');
  return live({ root, pin, canvas, gl, hero, map, net, N, ux, uy, dens });
}

// ── the still: the finished field, drawn once into the map ────────────────────────────────────────────────────────
function still(root, map, ux, uy, dens) {
  root.classList.add('still');
  const c = document.createElement('canvas');
  c.className = 'map__still';
  c.setAttribute('aria-hidden', 'true');
  map.prepend(c);
  const draw = () => {
    const r = map.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    const s = Math.max(1, Math.round((r.width < 500 ? 1 : 1.3) * dpr));
    for (let i = 0; i < ux.length; i++) {
      const t = dens[i];
      ctx.fillStyle = `rgb(${(T500[0] + (LIME[0] - T500[0]) * t) * 255 | 0},${(T500[1] + (LIME[1] - T500[1]) * t) * 255 | 0},${(T500[2] + (LIME[2] - T500[2]) * t) * 255 | 0})`;
      ctx.fillRect(Math.round(ux[i] * c.width), Math.round(uy[i] * c.height), s, s);
    }
  };
  draw();
  new ResizeObserver(draw).observe(map);
}

// ── live: WebGL2 ───────────────────────────────────────────────────────────────────────────────────────────────────
const VS = `#version 300 es
in vec2 a_start; in vec2 a_end; in vec2 a_meta;     // meta: departure (0..1), density (0..1)
uniform vec2 u_res; uniform float u_dpr, u_p, u_sweep, u_s0, u_s1;
out vec3 v_col; out float v_side;
float ease(float t) { return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }
void main() {
  float t = clamp((u_p - a_meta.x * .58) / .42, 0., 1.);
  float e = ease(t);
  vec2 d = a_end - a_start;
  vec2 n = normalize(vec2(-d.y, d.x) + 1e-5);
  float bend = (fract(a_meta.x * 7919.) - .5) * .28 * length(d);          // a gentle arc, its side and depth per point
  vec2 p = mix(a_start, a_end, e) + n * bend * sin(3.14159 * e);
  vec2 clip = p / u_res * 2. - 1.;
  gl_Position = vec4(clip.x, -clip.y, 0., 1.);
  bool printed = u_p > 0. || a_start.y <= u_sweep;
  v_side = mix(u_s0, u_s1, e) * u_dpr;                                  // the square's side, in device pixels
  gl_PointSize = printed ? ceil(v_side) + 2. : 0.;                       // a sprite with a pixel of margin all round
  vec3 dc = mix(vec3(${T500.join(',')}), vec3(${LIME.join(',')}), a_meta.y);
  v_col = mix(vec3(${LIME.join(',')}), dc, e);
}`;
// each point is an exact square of side v_side, anti-aliased, wherever it falls between pixels — so a fractional pitch
// reads as an even grid instead of gaps that alternate one and two pixels
const FS = `#version 300 es
precision mediump float;
in vec3 v_col; in float v_side; out vec4 o;
void main() {
  float span = ceil(v_side) + 2.;
  vec2 q = abs((gl_PointCoord - .5) * span);
  vec2 c = clamp(v_side * .5 + .5 - q, 0., 1.);
  float a = c.x * c.y;
  if (a <= 0.) discard;
  o = vec4(v_col * a, a);
}`;

function live({ root, pin, canvas, gl, hero, map, net, N, ux, uy, dens }) {
  const prog = program(gl, VS, FS);
  gl.useProgram(prog);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { res: U('u_res'), dpr: U('u_dpr'), p: U('u_p'), sweep: U('u_sweep'), s0: U('u_s0'), s1: U('u_s1') };
  const buf = (name, size) => {
    const b = gl.createBuffer();
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  };
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const bStart = buf('a_start', 2), bEnd = buf('a_end', 2), bMeta = buf('a_meta', 2);
  const meta = new Float32Array(2 * N);
  for (let i = 0; i < N; i++) { meta[2 * i] = i / N; meta[2 * i + 1] = dens[i]; }
  gl.bindBuffer(gl.ARRAY_BUFFER, bMeta);
  gl.bufferData(gl.ARRAY_BUFFER, meta, gl.STATIC_DRAW);

  let W = 0, H = 0, dpr = 1, s0 = 2, s1 = 1.2, dotted = false, p = 0, sweep = -1, printing = false, lost = false;

  function layout() {
    const r = pin.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // the end: the map's box inside the pinned viewport
    const m = map.getBoundingClientRect();
    const end = new Float32Array(2 * N);
    const ox = m.left - r.left, oy = m.top - r.top;
    for (let i = 0; i < N; i++) { end[2 * i] = ox + ux[i] * m.width; end[2 * i + 1] = oy + uy[i] * m.height; }
    s1 = m.width < 520 ? 1.1 : 1.35;
    // the start: the numeral's ink, sampled where it is drawn
    const start = sampleNumeral(hero, r, N);
    dotted = start.pitch >= 1.6 && start.pitch * dpr >= 3;
    s0 = dotted ? start.pitch * .86 : 1;
    // the "3" flows west and the zeros east: pair both sets by x, keep the field's departure order
    const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => end[2 * a] - end[2 * b] || end[2 * a + 1] - end[2 * b + 1]);
    const sorted = new Float32Array(2 * N);
    for (let k = 0; k < N; k++) { const i = order[k]; sorted[2 * i] = start.xy[2 * k]; sorted[2 * i + 1] = start.xy[2 * k + 1]; }
    gl.bindBuffer(gl.ARRAY_BUFFER, bStart); gl.bufferData(gl.ARRAY_BUFFER, sorted, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bEnd); gl.bufferData(gl.ARRAY_BUFFER, end, gl.STATIC_DRAW);
    frame();
  }

  function progress() {
    const r = root.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - H));
  }

  function frame() {
    if (lost) return;
    const pr = progress();
    p = clamp((pr - .1) / .62);
    const cover = 1 - clamp((pr - .03) / .2);
    const lines = clamp((pr - .56) / .24);
    const nv = clamp((pr - .62) / .2);
    root.style.setProperty('--cover', cover.toFixed(3));
    root.style.setProperty('--cover-pe', cover > .5 ? 'auto' : 'none');
    root.style.setProperty('--lines', lines.toFixed(3));
    root.style.setProperty('--net', nv.toFixed(3));
    net.classList.toggle('on', nv > .5);
    const show = dotted ? (sweep >= 0 || p > 0) : p > 0;
    root.classList.toggle('has-points', show && (p > 0 || !printing));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!show) return;
    gl.uniform2f(u.res, W, H);
    gl.uniform1f(u.dpr, dpr);
    gl.uniform1f(u.p, p);
    gl.uniform1f(u.sweep, p > 0 ? 1e6 : (sweep < 0 ? 1e6 : sweep));
    gl.uniform1f(u.s0, s0);
    gl.uniform1f(u.s1, s1);
    gl.drawArrays(gl.POINTS, 0, N);
  }

  // the reprint: a print head sweeps the numeral top to bottom, once, leaving points behind it (desktop only)
  function print() {
    const hr = hero.getBoundingClientRect(), r = pin.getBoundingClientRect();
    const top = hr.top - r.top, bottom = hr.bottom - r.top;
    const lockup = hero.parentElement;
    printing = true;
    const t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / 1100);
      sweep = top + (bottom - top + 40) * k;
      lockup.style.setProperty('--sweep', (k * 100).toFixed(2) + '%');
      lockup.classList.add('printing');
      if (k >= 1) { printing = false; lockup.classList.remove('printing'); lockup.classList.add('printed'); }
      frame();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; frame(); }); } };
  addEventListener('scroll', onScroll, { passive: true });
  new ResizeObserver(() => layout()).observe(pin);
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); lost = true;
    root.classList.remove('is-live', 'has-points');
    still(root, map, ux, uy, dens);
  });
  layout();
  if (dotted && progress() === 0) print(); else sweep = 1e6;
}

// one point per point of sale inside the numeral's ink — a grid at the pitch that holds exactly N cells, or (where the
// pitch would be too fine to read, as on a phone) N samples of the ink
function sampleNumeral(svg, pinRect, N) {
  const r = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const d = svg.querySelector('path').getAttribute('d');
  const S = 1;                                     // sample at CSS pixels
  const w = Math.max(1, Math.round(r.width * S)), h = Math.max(1, Math.round(r.height * S));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const k = r.height / vb.height;
  ctx.setTransform(k * S, 0, 0, k * S, -vb.x * k * S, -vb.y * k * S);
  ctx.fill(new Path2D(d));
  const a = ctx.getImageData(0, 0, w, h).data;
  const ox = r.left - pinRect.left, oy = r.top - pinRect.top;
  let ink = 0;
  for (let i = 3; i < a.length; i += 4) if (a[i] > 127) ink++;
  const inkAt = (x, y) => a[((y | 0) * w + (x | 0)) * 4 + 3] > 127;
  let pitch = Math.sqrt(ink / (S * S) / N);
  const xy = new Float32Array(2 * N);
  if (pitch >= 1.6) {
    // bisect the pitch: the largest grid that still holds N cells, so only a handful are dropped
    const grid = q => { const c = []; for (let y = q / 2; y < h; y += q) for (let x = q / 2; x < w; x += q) if (inkAt(x, y)) c.push(x, y); return c; };
    let lo = pitch * .85, hi = pitch * 1.1, cells = grid(lo);
    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) / 2, c = grid(mid);
      if (c.length / 2 >= N) { lo = mid; cells = c; } else hi = mid;
    }
    pitch = lo;
    // the surplus comes off the glyph's edge (a cell with an empty neighbour), where a missing point cannot be seen
    const have = cells.length / 2;
    let surplus = have - N;
    const keep = new Uint8Array(have).fill(1);
    if (surplus > 0) {
      const edge = [];
      for (let j = 0; j < have; j++) {
        const x = cells[2 * j], y = cells[2 * j + 1];
        if (!inkAt(x + pitch, y) || !inkAt(x - pitch, y) || !inkAt(x, y + pitch) || !inkAt(x, y - pitch)) edge.push(j);
      }
      const step = edge.length / surplus;
      for (let k = 0; k < surplus && k < edge.length; k++) keep[edge[Math.floor(k * step)]] = 0;
      surplus -= Math.min(surplus, edge.length);
      for (let j = have - 1; surplus > 0 && j >= 0; j--) if (keep[j]) { keep[j] = 0; surplus--; }
    }
    for (let j = 0, i = 0; j < have && i < N; j++) {
      if (!keep[j]) continue;
      xy[2 * i] = ox + cells[2 * j] / S; xy[2 * i + 1] = oy + cells[2 * j + 1] / S; i++;
    }
  } else {
    const px = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 127) px.push(x, y);
    let seed = 3600;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const m = px.length / 2;
    for (let i = 0; i < N; i++) {
      const j = Math.floor(rnd() * m);
      xy[2 * i] = ox + (px[2 * j] + rnd()) / S; xy[2 * i + 1] = oy + (px[2 * j + 1] + rnd()) / S;
    }
  }
  // sort by x (then y) so the pairing with the field runs west to east
  const idx = Array.from({ length: N }, (_, i) => i).sort((i, j) => xy[2 * i] - xy[2 * j] || xy[2 * i + 1] - xy[2 * j + 1]);
  const out = new Float32Array(2 * N);
  idx.forEach((i, k) => { out[2 * k] = xy[2 * i]; out[2 * k + 1] = xy[2 * i + 1]; });
  return { xy: out, pitch };
}

function program(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
