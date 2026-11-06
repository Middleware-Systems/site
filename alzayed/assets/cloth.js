/*
  cloth.js: the house cloth. An indigo Z-twill (the diagonal runs like the middle stroke of a Z, as most of the
  world's denim and workwear drill does) with the house mark woven into it as a jacquard figure in the reverse
  (S) twill, weft-faced. Both faces are indigo: the figure shows only by how its threads take the light, the way a
  tone-on-tone jacquard does. The pointer is a raking lamp; with no pointer it drifts on its own.

  Every thread is computed per pixel: which thread lies on top at each crossing (the weave), the float's arch along
  its length, the yarn's round section across it, its Z-twist striation, Kajiya-Kay highlights along the thread.
  The figure's edge is quantised to whole crossings, so it steps like a woven edge, never like print.

  Canvases: <canvas data-cloth> (the hero, live) and any <canvas data-cloth data-swatch="..."> (still swatches are
  pre-rendered images; see tools/still.py). URL parameters used only by tools/still.py to render stills:
  ?light=x,y (fixed lamp, 0..1), ?palette=indigo|ink|greige, ?t=seconds.
*/
(() => {
  "use strict";
  const canvas = document.querySelector("canvas[data-cloth]");
  if (!canvas) return;
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fixedLight = params.get("light");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: !!fixedLight, powerPreference: "high-performance" });
  if (!gl) { root.classList.add("no-webgl"); return; }

  const PALETTES = {
    // linear-light colours of the two yarns: warp (the face of the ground), weft (the face of the figure)
    indigo: { warp: [0.0090, 0.0100, 0.0380], weft: [0.0105, 0.0112, 0.0400], spec: [0.30, 0.33, 0.55], amb: 0.50 },
    ink:    { warp: [0.0060, 0.0060, 0.0085], weft: [0.0075, 0.0075, 0.0100], spec: [0.34, 0.34, 0.38], amb: 0.55 },
    greige: { warp: [0.150, 0.132, 0.102], weft: [0.165, 0.150, 0.120], spec: [0.30, 0.28, 0.24], amb: 0.50 },
  };
  const palette = PALETTES[params.get("palette")] || PALETTES[canvas.dataset.palette] || PALETTES.indigo;

  const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `
precision highp float;
uniform vec2 uRes;          // canvas, device px
uniform float uDpr;
uniform float uTime;
uniform vec3 uLight;        // lamp: device px (y down) and height
uniform sampler2D uMotif;   // the mark, one tile
uniform float uPitch;       // one crossing, device px
uniform float uTile;        // one motif tile, device px
uniform vec3 uWarp, uWeft, uSpec;
uniform float uAmb;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// a few broad folds that breathe: the cloth is draped, not flat. Returns the height's gradient.
vec2 drape(vec2 q) {
  float t = uTime;
  vec2 g = vec2(0.0);
  vec2 d; float k, a, s;
  // three soft folds, 600–1300 css px long, the strongest running down and to the left, like cloth hung from a corner
  d = normalize(vec2(0.86, 0.50));  k = 0.0090 / uDpr; s = dot(q, d) * k + t * 0.10;        g += d * cos(s) * 0.55;
  d = normalize(vec2(-0.30, 0.95)); k = 0.0061 / uDpr; s = dot(q, d) * k - t * 0.06 + 1.7;  g += d * cos(s) * 0.30;
  d = normalize(vec2(0.97, -0.24)); k = 0.0048 / uDpr; s = dot(q, d) * k + t * 0.04 + 4.1;  g += d * cos(s) * 0.40;
  return g;
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);     // device px, y down
  vec2 cell = floor(q / uPitch);
  vec2 f = fract(q / uPitch);

  // the figure: the mark in a half-drop repeat, read at the crossing's centre (a woven edge steps by threads)
  vec2 mc = (cell + 0.5) * uPitch / uTile;
  float col = floor(mc.x);
  vec2 m = vec2(fract(mc.x), fract(mc.y + 0.5 * mod(col, 2.0)));
  float fig = step(0.5, texture2D(uMotif, m).r);

  float zt = mod(cell.x + cell.y, 4.0);          // ground: Z-twill, the warp over three wefts, under one
  float sa = mod(cell.x - 2.0 * cell.y, 5.0);    // figure: 5-end sateen, weft-faced: the weft floats over four
  float warpUp = fig < 0.5 ? step(zt, 2.5) : step(sa, 0.5);

  // where we are on the float that lies on top: along it (0..1 over the whole float) and across it (-1..1)
  float along, across, idx;
  if (warpUp > 0.5) {
    float k = fig < 0.5 ? zt : 0.0; float span = fig < 0.5 ? 3.0 : 1.0;
    along = (k + f.y) / span; across = f.x * 2.0 - 1.0; idx = cell.x;
  } else {
    float k = fig < 0.5 ? 0.0 : sa - 1.0; float span = fig < 0.5 ? 1.0 : 4.0;
    along = (k + f.x) / span; across = f.y * 2.0 - 1.0; idx = cell.y + 917.0;
  }
  float a = along * 2.0 - 1.0;

  // the yarn: round across, arched along; Z-twist striation; a little irregularity from thread to thread
  vec3 nl = normalize(vec3(across * 0.55, a * 0.26, 1.0));   // in the thread's frame (x across, y along)
  vec3 n = warpUp > 0.5 ? vec3(nl.x, nl.y, nl.z) : vec3(nl.y, nl.x, nl.z);
  vec3 T = warpUp > 0.5 ? normalize(vec3(0.0, 1.0, -a * 0.5)) : normalize(vec3(1.0, 0.0, -a * 0.5));
  vec2 g = drape(q);
  n = normalize(n + vec3(-g, 0.0));
  T = normalize(T - dot(T, n) * n * 0.35);

  float alongPx = warpUp > 0.5 ? q.y : q.x;
  float stri = 0.94 + 0.06 * sin((across * 0.8 + alongPx / uPitch * 2.6) * 6.2832);
  float slub = 0.975 + 0.025 * hash(vec2(idx, 3.1)) + 0.015 * sin(alongPx / uPitch * 0.21 + idx * 1.7);
  float edge = smoothstep(1.0, 0.62, abs(across));            // the gap between threads, in shadow
  float ends = smoothstep(1.0, 0.80, abs(a));                 // where the float dives under
  vec3 albedo = (warpUp > 0.5 ? uWarp : uWeft) * stri * slub;

  // the lamp
  vec3 P = vec3(q, 0.0);
  vec3 L = normalize(uLight - P);
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float diff = max(dot(n, L), 0.0);
  float th = dot(T, H);
  float sinTH = sqrt(max(0.0, 1.0 - th * th));
  float spec = pow(sinTH, 70.0) * 0.50 + pow(sinTH, 10.0) * 0.16;
  float dist = length(uLight.xy - q) / max(uRes.x, uRes.y);
  float att = 1.25 / (1.0 + dist * dist * 9.0);

  float wrap = max(0.0, (dot(n, L) + 0.35) / 1.35);
  vec3 c = albedo * (uAmb * 0.22 + wrap * 2.7 * att);
  c += uSpec * spec * att * (0.55 + 0.45 * diff);
  c *= mix(0.64, 1.0, edge * ends);

  // a soft vignette, filmic tone, gamma, and a dither against banding
  vec2 uv = q / uRes;
  float vig = 1.0 - 0.55 * pow(length((uv - 0.5) * vec2(1.0, 0.82)) * 1.35, 2.0);
  c *= vig;
  c = 1.0 - exp(-c * 1.6);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(q + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("cloth: " + gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("cloth: " + gl.getProgramInfoLog(prog));
  } catch (e) { console.warn(e.message); root.classList.add("no-webgl"); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uRes", "uDpr", "uTime", "uLight", "uMotif", "uPitch", "uTile", "uWarp", "uWeft", "uSpec", "uAmb"].forEach(k => U[k] = gl.getUniformLocation(prog, k));

  // the motif: the mark's own outline (brand/build.py → data-mark on the canvas), drawn once into a tile
  const markD = JSON.parse(canvas.dataset.mark || "[]");
  const mb = JSON.parse(canvas.dataset.markBounds || "[0,0,1,1]");
  const T = 256, tile = document.createElement("canvas"); tile.width = tile.height = T;
  const cx = tile.getContext("2d");
  cx.fillStyle = "#000"; cx.fillRect(0, 0, T, T);
  const slitD = canvas.dataset.markSlit || "";
  const mw = mb[2] - mb[0], mh = mb[3] - mb[1], s = (T * 0.50) / mh;
  cx.save(); cx.translate(T / 2 - (mb[0] + mw / 2) * s, T / 2 - (mb[1] + mh / 2) * s); cx.scale(s, s);
  cx.fillStyle = "#fff"; cx.strokeStyle = "#fff"; cx.lineJoin = "miter"; cx.lineWidth = 5.4 / s;   // ≈ 2 threads more
  markD.forEach(d => { const p = new Path2D(d); cx.fill(p, "nonzero"); cx.stroke(p); });
  if (slitD) { cx.fillStyle = "#000"; cx.fill(new Path2D(slitD)); }                           // the slit, re-cut
  cx.restore();
  const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uMotif, 0);
  gl.uniform3fv(U.uWarp, palette.warp); gl.uniform3fv(U.uWeft, palette.weft); gl.uniform3fv(U.uSpec, palette.spec); gl.uniform1f(U.uAmb, palette.amb);

  // adaptive resolution: a device that cannot keep ~35 frames a second draws the cloth at a lower scale (down to half),
  // so the page around it — a menu jump, a scroll — is never held up by the shader (seen 6 Nov in software rendering)
  let W = 0, Hh = 0, dpr = 1, scale = 1, lastFrame = 0;
  const intervals = [];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr)); Hh = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; }
    gl.viewport(0, 0, W, Hh);
    gl.uniform2f(U.uRes, W, Hh); gl.uniform1f(U.uDpr, dpr);
    // one crossing is a whole number of device pixels: a fractional pitch drifts against the pixel grid and beats
    // into moiré seams (measured: a 26-level step every few hundred px at 3.1 px)
    const pitch = Math.max(3, Math.round((r.width < 700 ? 2.8 : 3.1) * dpr));
    gl.uniform1f(U.uPitch, pitch);
    gl.uniform1f(U.uTile, pitch * Math.round((r.width < 700 ? 190 : 270) * dpr / pitch));
  }

  // the lamp: where the pointer is, eased; with no pointer, a slow drift
  const lamp = { x: 0.28, y: 0.22, tx: 0.28, ty: 0.22, active: false, last: 0 };
  if (fixedLight) { const [lx, ly] = fixedLight.split(",").map(Number); lamp.x = lamp.tx = lx; lamp.y = lamp.ty = ly; }
  const host = canvas.closest("[data-cloth-host]") || canvas;
  function aim(e) {
    const r = canvas.getBoundingClientRect();
    lamp.tx = (e.clientX - r.left) / r.width; lamp.ty = (e.clientY - r.top) / r.height;
    lamp.active = true; lamp.last = performance.now();
    root.classList.add("cloth-lit");
    if (reduced && !running) frame(performance.now());
  }
  if (!fixedLight) {
    host.addEventListener("pointermove", aim, { passive: true });
    host.addEventListener("pointerdown", aim, { passive: true });
  }

  let t0 = performance.now(), running = false, visible = true, raf = 0;
  const tFixed = params.has("t") ? parseFloat(params.get("t")) : null;
  function frame(now) {
    raf = 0;
    if (running && lastFrame) {
      intervals.push(now - lastFrame);
      if (intervals.length >= 20) {
        const m = intervals.sort((a, b) => a - b)[10];
        intervals.length = 0;
        if (m > 28 && scale > 0.5) { scale = Math.max(0.5, scale * 0.75); resize(); canvas.dataset.scale = scale.toFixed(2); }
      }
    }
    lastFrame = running ? now : 0;
    const t = tFixed !== null ? tFixed : (reduced ? 12.0 : (now - t0) / 1000);
    if (!fixedLight) {
      const idle = !lamp.active || now - lamp.last > 2600;
      if (idle && !reduced) {
        lamp.tx = 0.5 + 0.36 * Math.sin(t * 0.17) + 0.06 * Math.sin(t * 0.53);
        lamp.ty = 0.42 + 0.30 * Math.sin(t * 0.11 + 1.3);
      }
      const ease = reduced ? 1 : (idle ? 0.012 : 0.09);
      lamp.x += (lamp.tx - lamp.x) * ease; lamp.y += (lamp.ty - lamp.y) * ease;
    }
    gl.uniform1f(U.uTime, t);
    gl.uniform3f(U.uLight, lamp.x * W, lamp.y * Hh, Math.max(W, Hh) * 0.20);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (running && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; if (!raf) raf = requestAnimationFrame(frame); } }
  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  resize();
  window.addEventListener("resize", () => { resize(); if (!running) frame(performance.now()); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduced && !fixedLight) start(); else stop(); })
      .observe(canvas);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !reduced && !fixedLight) start(); });
  frame(performance.now());
  if (!reduced && !fixedLight) start();
  root.classList.add("cloth-ready");
  canvas.dataset.state = "drawn";
})();
