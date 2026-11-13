// The opening. The 2 of B2M's mark is drawn in points, and it reads as a question mark that ends in a point.
// Scroll, and every point falls into the full stop of the headline: the question becomes the point.
// The shape is sampled from assets/marks/qmark.png, cut from the mark itself (tools/assets.py): nothing is redrawn.
// Without WebGL 2, or when stillness is asked for, the same points are drawn once on a 2D canvas.

const VS = `#version 300 es
precision highp float;
in vec2 a_q;
in vec3 a_s;
in float a_k;
uniform vec2 u_res, u_c, u_p, u_to;
uniform float u_t, u_form, u_fall, u_h, u_size, u_mirror, u_tr, u_stir;
out float v_k;
out float v_a;
void main() {
  vec2 cloud = a_s.xy * u_res + 22.0 * vec2(sin(u_t * .31 + a_s.z * 6.283), cos(u_t * .27 + a_s.x * 6.283));
  vec2 q = u_c + vec2(a_q.x * u_mirror, a_q.y) * u_h;
  q += (0.45 + 7.0 * u_stir) * vec2(sin(u_t * 1.3 + a_s.z * 37.0), cos(u_t * 1.1 + a_s.x * 41.0));
  float f = clamp(u_form * 1.7 - a_s.z * .7, 0., 1.);
  f = f * f * (3. - 2. * f);
  vec2 p = mix(cloud, q, f);
  vec2 d = p - u_p;
  p += normalize(d + vec2(1e-3)) * 58.0 * exp(-dot(d, d) / 15000.0) * (1. - u_fall) * f;
  float order = a_q.y + .5;                        // 0 at the top of the 2, 1 at its foot
  float g = clamp(u_fall * 2.0 - (1. - order), 0., 1.);
  g = g * g * (3. - 2. * g);
  float ang = a_s.x * 6.2832;
  vec2 to = u_to + sqrt(a_s.y) * u_tr * vec2(cos(ang), sin(ang));
  vec2 mid = mix(p, to, .5) + vec2((a_s.z - .5) * 170.0, -70.0 * (1. - order));
  p = mix(mix(p, mid, g), mix(mid, to, g), g);
  gl_Position = vec4(p.x / u_res.x * 2. - 1., 1. - p.y / u_res.y * 2., 0., 1.);
  gl_PointSize = u_size * mix(.5 + .5 * f, 1.25, g);
  v_k = max(a_k * f, g);
  v_a = mix(.25, 1., f);
}`;

const FS = `#version 300 es
precision mediump float;
in float v_k;
in float v_a;
out vec4 o;
void main() {
  float r = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .4, r) * v_a;
  vec3 col = mix(vec3(.918, .851, .749), vec3(1., .176, .471), v_k);
  o = vec4(col * a, a);
}`;

function loadMask(src) {
  return new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0);
      ok({ w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data });
    };
    im.onerror = no;
    im.src = src;
  });
}

// points on an even screen, like a print: `step` is the pitch in mask pixels
function sample(mask, step) {
  const q = [], k = [];
  let row = 0;
  for (let y = step / 2; y < mask.h; y += step * .866, row++) {
    for (let x = step / 2 + (row % 2 ? step / 2 : 0); x < mask.w; x += step) {
      const i = ((y | 0) * mask.w + (x | 0)) * 4;
      if (mask.d[i + 3] < 128) continue;
      q.push((x - mask.w / 2) / mask.h, (y - mask.h / 2) / mask.h);
      k.push(mask.d[i + 1] > 128 ? 1 : 0);
    }
  }
  return { q, k, n: k.length };
}

export async function hero(root) {
  let cv = root.querySelector('canvas');
  const h1 = root.querySelector('.hero-h');
  const ask = root.querySelector('.hero-ask');
  if (!cv || !h1) return;
  const rtl = document.documentElement.dir === 'rtl';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mask;
  try { mask = await loadMask(cv.dataset.qmark); } catch (e) { return; }

  const L = { w: 0, h: 0, cx: 0, cy: 0, qh: 0, tx: 0, ty: 0, tr: 12, size: 4, dpr: 1 };
  let pts = null, pitch = 0;

  function layout() {
    const r = root.getBoundingClientRect();
    L.w = r.width; L.h = r.height;
    L.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const hr = h1.getBoundingClientRect(), ar = ask ? ask.getBoundingClientRect() : hr;
    const narrow = L.w < 760;
    const hd = document.querySelector('[data-header]');
    // the question sits on the headline. On a wide screen the mark stands beside it, from the header down to the
    // headline; on a narrow one it stands above the question
    const top = (hd ? hd.offsetHeight : 70) + (narrow ? 8 : 18), bottom = (narrow ? ar.top : hr.top) - r.top - (narrow ? 10 : 0);
    const room = Math.max(bottom - top, 120);
    L.qh = Math.min(room * (narrow ? .9 : .94), L.w * (narrow ? .56 : .42) * (mask.h / mask.w), 680);
    const fx = narrow ? .7 : .77, half = L.qh * (mask.w / mask.h) / 2 + 14;
    L.cx = Math.min(L.w - half, Math.max(half, L.w * (rtl ? 1 - fx : fx)));
    L.cy = top + room / 2;
    const dots = h1.querySelectorAll('.dt-p');
    const last = dots[dots.length - 1];
    if (last) {
      const d = last.getBoundingClientRect();
      L.tx = d.left + d.width / 2 - r.left; L.ty = d.top + d.height / 2 - r.top; L.tr = d.width / 2;
    } else { L.tx = rtl ? 40 : L.w - 40; L.ty = bottom; L.tr = 10; }
    const want = Math.max(4.6, Math.min(7.5, L.qh / 88));       // pitch on screen, px
    if (!pts || Math.abs(want - pitch) / want > .12) {
      pitch = want;
      pts = sample(mask, pitch / (L.qh / mask.h));
      return true;
    }
    return false;
  }

  function draw2d() {
    layout();
    cv.width = Math.round(L.w * L.dpr); cv.height = Math.round(L.h * L.dpr);
    const x = cv.getContext('2d');
    x.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    x.clearRect(0, 0, L.w, L.h);
    const rad = pitch * .31;
    for (let pass = 0; pass < 2; pass++) {
      x.fillStyle = pass ? '#ff2d78' : '#ead9bf';
      x.beginPath();
      for (let i = 0; i < pts.n; i++) {
        if (pts.k[i] !== pass) continue;
        const px = L.cx + pts.q[i * 2] * (rtl ? -1 : 1) * L.qh, py = L.cy + pts.q[i * 2 + 1] * L.qh;
        x.moveTo(px + rad, py); x.arc(px, py, rad, 0, 6.2832);
      }
      x.fill();
    }
  }

  const gl = still ? null : cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) {
    draw2d();
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw2d, 150); });
    root.classList.add('is-still');
    return;
  }

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  let dead = false;
  // a canvas that has had a WebGL context cannot draw in 2D: a fresh one takes its place
  const to2d = () => { dead = true; const k = cv.cloneNode(false); cv.replaceWith(k); cv = k; draw2d(); root.classList.remove('is-live'); root.classList.add('is-still'); };
  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); to2d(); });
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { to2d(); return; }
  gl.useProgram(pr);
  const U = {};
  for (const n of ['u_res', 'u_c', 'u_p', 'u_to', 'u_t', 'u_form', 'u_fall', 'u_h', 'u_size', 'u_mirror', 'u_tr', 'u_stir']) U[n] = gl.getUniformLocation(pr, n);
  const bufs = {};
  function upload() {
    const seeds = new Float32Array(pts.n * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const put = (name, data, size) => {
      const loc = gl.getAttribLocation(pr, name);
      bufs[name] = bufs[name] || gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs[name]);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    put('a_q', new Float32Array(pts.q), 2);
    put('a_k', new Float32Array(pts.k), 1);
    put('a_s', seeds, 3);
  }
  function resize() {
    const fresh = layout();
    cv.width = Math.round(L.w * L.dpr); cv.height = Math.round(L.h * L.dpr);
    gl.viewport(0, 0, cv.width, cv.height);
    if (fresh) upload();
  }
  resize();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let px = -9999, py = -9999, form = 0, fall = 0, stir = 0, seen = true, t0 = performance.now(), raf = 0;
  root.addEventListener('pointermove', (e) => { const r = root.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; }, { passive: true });
  root.addEventListener('pointerleave', () => { px = py = -9999; });
  document.addEventListener('b2m:ask', () => { stir = 1; });
  new IntersectionObserver((es) => { seen = es[0].isIntersecting; if (seen && !raf) raf = requestAnimationFrame(frame); }).observe(root);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => (dead ? draw2d() : resize()), 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!dead) resize(); });
  let paused = false, held = 0, prev = 0;
  document.addEventListener('b2m:pause', (e) => { paused = e.detail; });
  // a test can hold the opening at any moment: ?fall=0.6
  const hold = new URLSearchParams(location.search).get('fall');

  function frame(now) {
    raf = 0;
    if (dead || !seen || document.hidden) return;
    if (paused) t0 = now - held * 1000;
    const t = held = (now - t0) / 1000;
    const k = Math.min(3, ((now - prev) || 16.7) / 16.7);      // frames of a 60 Hz screen since the last one
    prev = now;
    form += (1 - form) * (1 - Math.pow(1 - .035, k));
    const goal = hold !== null ? +hold : Math.min(1, Math.max(0, window.scrollY / (L.h * .5)));
    fall += (goal - fall) * (1 - Math.pow(1 - .12, k));
    stir *= Math.pow(.94, k);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.u_res, L.w, L.h);
    gl.uniform2f(U.u_c, L.cx, L.cy);
    gl.uniform2f(U.u_p, px, py);
    gl.uniform2f(U.u_to, L.tx, L.ty);
    gl.uniform1f(U.u_t, t);
    gl.uniform1f(U.u_form, Math.min(1, form * 1.02));
    gl.uniform1f(U.u_fall, fall);
    gl.uniform1f(U.u_h, L.qh);
    gl.uniform1f(U.u_size, pitch * .7 * L.dpr);
    gl.uniform1f(U.u_mirror, rtl ? -1 : 1);
    gl.uniform1f(U.u_tr, L.tr * .9);
    gl.uniform1f(U.u_stir, stir);
    gl.drawArrays(gl.POINTS, 0, pts.n);
    root.classList.toggle('is-fallen', fall > .985);
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) raf = requestAnimationFrame(frame); });
  raf = requestAnimationFrame(frame);
  root.classList.add('is-live');
}
