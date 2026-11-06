// milk.js: the hero is a surface of milk seen from above. A ripple field (two height buffers, the classic wave step)
// runs on the CPU at a coarse grid; WebGL2 shades it as a glossy white surface catching a soft light and the blue of
// the badge's ring. A pointer leaves a wake, a tap drops a drop, and a drop falls now and then on its own.
// Stops drawing when the hero is off screen or the tab is hidden. Reduced motion: one still frame, rings frozen.
// No WebGL2: the canvas is removed and the CSS still (.hero-still) stays.

const canvas = document.querySelector('[data-milk]');

function start() {
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = document.documentElement.dir === 'rtl';
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); hero.classList.add('no-milk'); return; }

  const VS = `#version 300 es
  in vec2 p; out vec2 uv;
  void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 uv; out vec4 o;
  uniform sampler2D uH; uniform vec2 uTexel; uniform vec2 uRes; uniform float uTime; uniform float uLight;
  float H(vec2 t) { return texture(uH, t).r; }
  void main() {
    vec2 t = vec2(uv.x, 1.0 - uv.y);
    float h = H(t);
    float hx = H(t + vec2(uTexel.x, 0.0)) - H(t - vec2(uTexel.x, 0.0));
    float hy = H(t + vec2(0.0, uTexel.y)) - H(t - vec2(0.0, uTexel.y));
    // a slow swell under everything, so the surface is never dead flat
    vec2 q = uv * vec2(uRes.x / uRes.y, 1.0);
    float sx = 0.010 * cos(q.x * 3.1 + uTime * 0.31) + 0.006 * cos(q.x * 5.3 - q.y * 2.0 + uTime * 0.23);
    float sy = 0.010 * cos(q.y * 3.7 - uTime * 0.27) + 0.006 * cos(q.y * 6.1 + q.x * 1.7 + uTime * 0.19);
    vec3 n = normalize(vec3(-hx * 2.6 - sx, hy * 2.6 - sy, 1.0));
    vec3 L = normalize(vec3(uLight * -0.5, 0.62, 0.75));
    vec3 V = vec3(0.0, 0.0, 1.0);
    float diff = dot(n, L) * 0.5 + 0.5;
    float spec = pow(max(dot(n, normalize(L + V)), 0.0), 220.0);
    float sheen = pow(max(dot(n, normalize(L + V)), 0.0), 18.0);
    vec3 milk = vec3(0.979, 0.968, 0.944);
    vec3 col = milk * (0.885 + 0.13 * diff);
    float slope = clamp((1.0 - n.z) * 9.0, 0.0, 1.0);
    col = mix(col, vec3(0.78, 0.86, 0.95), slope * 0.42);                 // the blue of the ring, caught on a slope
    col = mix(col, vec3(0.985, 0.95, 0.88), clamp(-h * 0.6, 0.0, 0.22));    // a warmer trough
    col += vec3(1.0) * spec * 0.85 + vec3(1.0, 0.99, 0.97) * sheen * 0.05;
    float vig = smoothstep(1.35, 0.25, length((uv - vec2(0.6, 0.55)) * vec2(uRes.x / uRes.y, 1.0)));
    col *= mix(0.925, 1.0, vig);
    o = vec4(col, 1.0);
  }`;

  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uTexel = U('uTexel'), uRes = U('uRes'), uTime = U('uTime'), uLight = U('uLight');
  gl.uniform1i(U('uH'), 0);
  gl.uniform1f(uLight, rtl ? -1 : 1);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let W = 0, Hh = 0, cur, prev, cw = 0, ch = 0, t0 = performance.now();
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
    ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    canvas.width = cw; canvas.height = ch;
    gl.viewport(0, 0, cw, ch);
    const w = Math.round(Math.min(260, Math.max(140, canvas.clientWidth / 6)));
    const h = Math.round(Math.max(60, w * canvas.clientHeight / canvas.clientWidth));   // square cells, so rings stay round
    if (w !== W || h !== Hh) {
      W = w; Hh = h; cur = new Float32Array(W * Hh); prev = new Float32Array(W * Hh);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, W, Hh, 0, gl.RED, gl.FLOAT, cur);
    }
    gl.uniform2f(uTexel, 1 / W, 1 / Hh);
    gl.uniform2f(uRes, cw, ch);
    if (cur) draw(performance.now());        // a resize clears the canvas; never leave it blank for a frame
  }

  function drop(fx, fy, r, amp) {           // fx, fy in 0..1 of the hero
    const cx = fx * (W - 1), cy = fy * (Hh - 1);
    const R = Math.max(1.5, r * W);
    const x0 = Math.max(1, Math.floor(cx - R)), x1 = Math.min(W - 2, Math.ceil(cx + R));
    const y0 = Math.max(1, Math.floor(cy - R)), y1 = Math.min(Hh - 2, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < R) cur[y * W + x] += amp * 0.5 * (1 + Math.cos(Math.PI * d / R));
    }
  }

  function step() {
    const damp = 0.988;
    for (let y = 1; y < Hh - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i]) * damp;
      }
    }
    const t = cur; cur = prev; prev = t;
  }

  function draw(now) {
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, Hh, gl.RED, gl.FLOAT, cur);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!canvas.dataset.drawn) canvas.dataset.drawn = '1';
  }

  resize();
  const side = rtl ? 0.28 : 0.72;            // drops fall away from the headline
  const float = hero.querySelector('[data-float]');
  const floatAt = () => {                    // the badge floating on the milk: where its centre sits, 0..1
    if (!float) return [side, 0.42];
    const a = float.getBoundingClientRect(), b = canvas.getBoundingClientRect();
    return [(a.left + a.width / 2 - b.left) / b.width, (a.top + a.height * 0.62 - b.top) / b.height];
  };
  if (reduce) {
    const [fx, fy] = floatAt();
    drop(fx, fy, 0.09, 3.2);
    drop(fx - (rtl ? -0.14 : 0.14), fy + 0.25, 0.03, 1.6);
    for (let i = 0; i < 70; i++) step();
    draw(performance.now());
    new ResizeObserver(() => { resize(); draw(performance.now()); }).observe(canvas);
    return;
  }

  let visible = true, running = false, last = 0, nextDrop = 0, nextBob = 0, lx = null, ly = null;
  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    running = true;
    if (now > nextDrop) {
      drop(side + (Math.random() - 0.5) * 0.5, 0.15 + Math.random() * 0.7, 0.016 + Math.random() * 0.014, 2.0 + Math.random());
      nextDrop = now + 1800 + Math.random() * 2200;
    }
    if (now > nextBob) {                     // the floating badge settles a little at the bottom of every bob
      const [fx, fy] = floatAt();
      drop(fx, fy, 0.075, 0.55);
      nextBob = now + 3500;
    }
    step();
    if (now - last > 22) step();             // a slower screen still sees the waves travel at the same pace
    last = now;
    draw(now);
    requestAnimationFrame(frame);
  }
  const go = () => { if (!running && visible && !document.hidden) requestAnimationFrame(frame); };

  // the opening: one drop, as if poured
  setTimeout(() => { const [fx, fy] = floatAt(); drop(fx, fy, 0.09, 3.2); }, 450);
  nextDrop = performance.now() + 2600;

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const [x, y] = pos(e);
    if (lx !== null) {
      const d = Math.hypot(x - lx, y - ly);
      const n = Math.min(8, Math.ceil(d * W / 3));
      for (let i = 1; i <= n; i++) drop(lx + (x - lx) * i / n, ly + (y - ly) * i / n, 0.011, Math.min(0.9, d * 40) / n * 2.2);
    }
    lx = x; ly = y;
  });
  hero.addEventListener('pointerleave', () => { lx = ly = null; });
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const [x, y] = pos(e);
    drop(x, y, 0.03, 2.8);
  });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; go(); }, { threshold: 0.01 }).observe(hero);
  document.addEventListener('visibilitychange', go);
  new ResizeObserver(() => resize()).observe(canvas);
  canvas.dataset.live = '1';
  go();
}

try { start(); } catch (err) {
  console.warn('milk: still image instead', err);
  canvas?.remove();
}
