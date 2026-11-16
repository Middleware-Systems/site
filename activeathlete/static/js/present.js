/* Two ways to present a product, made in the browser from its own photographs (15 Nov 2026). No video: two pictures,
   a small JSON and this file.

   «Step in» — the product photograph the page opens on becomes the same product worn. The garment bends, point for
   point, onto the worn one (a thin-plate spline fitted by tools/present_morph.py to the two outlines and the seams a
   person can name on both), the body grows out of it under a line of light, and the camera pulls back. The slider
   plays it back and forth.

   «Pull it» — press on the cloth and pull. The knit gives under the finger, opens to grey where it stretches (as black
   knit does), and springs back when you let go. A grid of springs over the photograph; only the cloth answers.

   «Photographs» — the gallery as it is everywhere else in the shop.

   The gallery's own pictures are the textures: the first figure's srcset is the garment alone, the second's the garment
   worn, so the static copy's rewritten addresses are the ones used. Without WebGL the chooser hides and the gallery is
   the ordinary one. */
(function () {
  "use strict";
  var fig = document.querySelector("figure[data-present]"); if (!fig) return;
  var bar = document.getElementById("present-bar"), gallery = fig.parentNode, col = gallery.parentNode;
  var row = document.getElementById("present-ui");
  var figs = gallery.querySelectorAll("figure");
  var imgA = figs[0] && figs[0].querySelector("img"), imgB = figs[1] && figs[1].querySelector("img");
  var cv = fig.querySelector(".present-canvas"), range = document.getElementById("present-range");
  var play = document.getElementById("present-play");
  var live = document.getElementById("present-live");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = cv && (cv.getContext("webgl", { antialias: true, premultipliedAlpha: false }) || cv.getContext("experimental-webgl"));

  function off(why) {                       // the ordinary gallery, said out loud in the console
    if (window.console) console.warn("present: " + why + " — showing the photographs");
    if (bar) bar.hidden = true;
    if (row) row.hidden = true;
    var note = document.getElementById("present-note"); if (note) note.hidden = true;
    fig.setAttribute("data-mode", "photo");
  }
  if (!gl || !imgA || !imgB) { off(!gl ? "no WebGL" : "the gallery needs its first two pictures"); return; }

  // ------------------------------------------------------------------ pictures at the size they will be drawn
  function pick(img, scale) {
    var set = (img.getAttribute("srcset") || "").split(",").map(function (s) {
      var b = s.trim().split(/\s+/); return { u: b[0], w: parseInt(b[1], 10) || 0 };
    }).filter(function (c) { return c.u && c.w; }).sort(function (a, b) { return a.w - b.w; });
    if (!set.length) return img.currentSrc || img.src;
    var need = fig.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2) * scale;
    for (var i = 0; i < set.length; i++) if (set[i].w >= need) return set[i].u;
    return set[set.length - 1].u;
  }
  function load(src) {
    return new Promise(function (ok, no) {
      var i = new Image(); i.decoding = "async";
      i.onload = function () { ok(i); }; i.onerror = function () { no(new Error("could not load " + src)); }; i.src = src;
    });
  }

  // ------------------------------------------------------------------ GL helpers
  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function texture(img, alpha) {
    var t = gl.createTexture(), f = alpha ? gl.RGBA : gl.RGB; gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, alpha ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);   // the field is data, not a picture
    gl.texImage2D(gl.TEXTURE_2D, 0, f, f, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function buffer(data, usage) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW); return b;
  }
  function attrib(p, name, buf, n) {
    var loc = gl.getAttribLocation(p, name); if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
  }
  function grid(nx, ny) {                    // triangle indices for an nx × ny vertex grid
    var Ix = new (nx * ny > 65535 ? Uint32Array : Uint16Array)((nx - 1) * (ny - 1) * 6), k = 0;
    for (var y = 0; y < ny - 1; y++) for (var x = 0; x < nx - 1; x++) {
      var i = y * nx + x; Ix[k++] = i; Ix[k++] = i + 1; Ix[k++] = i + nx; Ix[k++] = i + 1; Ix[k++] = i + nx + 1; Ix[k++] = i + nx;
    }
    return Ix;
  }
  var big = gl.getExtension("OES_element_index_uint");

  // ------------------------------------------------------------------ «Step in»
  var STEP_VS = "attribute vec2 aA; attribute vec2 aB; uniform float uE; uniform vec3 uZ; varying vec2 vA; varying vec2 vB;" +
    "void main(){ vec2 b = uZ.x * aB + uZ.yz; vec2 p = mix(aA, b, uE); vA = aA; vB = aB;" +
    " gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0); }";
  var STEP_FS = "precision highp float; uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tF;" +
    "uniform float uE; uniform float uR; uniform vec3 uT; varying vec2 vA; varying vec2 vB;" +
    "void main(){" +
    " vec3 a = texture2D(tA, clamp(vA, 0.0, 1.0)).rgb; vec3 b = texture2D(tB, clamp(vB, 0.0, 1.0)).rgb;" +
    " vec3 f = texture2D(tF, clamp(vB, 0.0, 1.0)).rgb;" +
    " float inB = step(0.0, vB.x) * step(vB.x, 1.0) * step(0.0, vB.y) * step(vB.y, 1.0);" +
    " float jog = f.r * inB; float per = f.g * inB; float d = f.b;" +
    " float mj = smoothstep(0.22, 0.86, uE); float mbg = smoothstep(0.08, 0.92, uE);" +
    " float mb = 1.0 - smoothstep(uR - 0.07, uR, d);" +
    // behind the body, before it appears: the worn photograph's own studio with him painted out (the field's alpha,
    // tools/present_morph.py), so the two photographs' backdrops never show the body's shape early
    " vec3 grey = texture2D(tF, clamp(vB, 0.0, 1.0)).a * uT;" +
    " vec3 bg = mix(a, mix(b, grey, smoothstep(0.0, 0.3, per) * (1.0 - mb)), mbg); vec3 body = mix(mix(a, grey, mbg), b, mb); vec3 cloth = mix(a, b, mj);" +
    " vec3 c = mix(bg, mix(body, cloth, jog), smoothstep(0.04, 0.55, per));" +
    " float x = (d - uR) / 0.007; float glow = smoothstep(0.85, 1.0, per) * (1.0 - jog) * exp(-x * x) * smoothstep(0.0, 0.06, uR) * (1.0 - smoothstep(1.0, 1.12, uR));" +
    " c += vec3(1.0, 0.9, 0.62) * glow * 0.34;" +
    " gl_FragColor = vec4(c, 1.0); }";

  function tps(m, ax, ay) {                  // the spline at one point (A's frame → B's frame)
    var C = m.ctrl, W = m.w, A = m.aff, bx = A[0][0] + A[1][0] * ax + A[2][0] * ay, by = A[0][1] + A[1][1] * ax + A[2][1] * ay;
    for (var i = 0; i < C.length; i++) {
      var dx = ax - C[i][0], dy = ay - C[i][1], r2 = dx * dx + dy * dy;
      if (r2 > 0) { var u = 0.5 * r2 * Math.log(r2); bx += W[i][0] * u; by += W[i][1] * u; }
    }
    return [bx, by];
  }

  var S = { mode: null, p: 0, playing: false, t0: 0, played: false, ready: {}, pulled: false };
  var step = null, pull = null, meta = null;

  function ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function sine(t) { t = Math.max(0, Math.min(1, t)); return 0.5 - 0.5 * Math.cos(Math.PI * t); }
  // one progress p (0 → 1) drives the three movements: the garment bends, the body grows, the camera pulls back
  function parts(p) {
    return { e: ease(p / 0.38), r: -0.06 + 1.22 * sine((p - 0.2) / 0.56), z: ease((p - 0.52) / 0.48) };
  }

  function buildStep(A, B, F) {
    var ax = meta.axis, n = ax.length, pa = new Float32Array(n * n * 2), pb = new Float32Array(n * n * 2), k = 0;
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var b = tps(meta, ax[x], ax[y]); pa[k] = ax[x]; pb[k] = b[0]; pa[k + 1] = ax[y]; pb[k + 1] = b[1]; k += 2;
    }
    var p = program(STEP_VS, STEP_FS), idx = grid(n, n);
    if (idx instanceof Uint32Array && !big) throw new Error("the mesh needs 32-bit indices");
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    return { p: p, a: buffer(pa), b: buffer(pb), ib: ib, count: idx.length, type: idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
             tA: texture(A), tB: texture(B), tF: texture(F, true), uT: gl.getUniformLocation(p, "uT"),
             uE: gl.getUniformLocation(p, "uE"), uR: gl.getUniformLocation(p, "uR"), uZ: gl.getUniformLocation(p, "uZ") };
  }
  function drawStep() {
    var q = parts(S.p), s = meta.s + (1 - meta.s) * q.z;
    gl.useProgram(step.p);
    attrib(step.p, "aA", step.a, 2); attrib(step.p, "aB", step.b, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, step.ib);
    [["tA", step.tA], ["tB", step.tB], ["tF", step.tF]].forEach(function (t, i) {
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t[1]); gl.uniform1i(gl.getUniformLocation(step.p, t[0]), i);
    });
    gl.uniform1f(step.uE, q.e); gl.uniform1f(step.uR, q.r); gl.uniform3fv(step.uT, meta.tint);
    gl.uniform3f(step.uZ, s, meta.t[0] * (1 - q.z), meta.t[1] * (1 - q.z));
    gl.drawElements(gl.TRIANGLES, step.count, step.type, 0);
  }

  // ------------------------------------------------------------------ «Pull it»
  var NX = 45, NY = 56;                      // the springs: about one every 32 px of a 1440 px picture
  var PULL_VS = "attribute vec2 aP; attribute vec2 aU; attribute float aS; attribute float aL; varying vec2 vU; varying float vS; varying float vL;" +
    "void main(){ vU = aU; vS = aS; vL = aL; gl_Position = vec4(aP.x * 2.0 - 1.0, 1.0 - aP.y * 2.0, 0.0, 1.0); }";
  // the cloth lifts toward you where it is pulled: lit on the side facing the studio's key light (top left), in shade
  // on the other; and where the knit is stretched it opens a little toward grey
  var PULL_FS = "precision highp float; uniform sampler2D tA; varying vec2 vU; varying float vS; varying float vL;" +
    "void main(){ vec3 c = texture2D(tA, vU).rgb; float L = dot(c, vec3(0.2126, 0.7152, 0.0722));" +
    " float cloth = 1.0 - smoothstep(0.26, 0.40, L); float s = clamp(vS, 0.0, 1.0) * cloth;" +
    " c = mix(c, c * 1.18 + vec3(0.07, 0.07, 0.068), s * 0.7);" +
    " c *= mix(1.0, clamp(1.0 + vL, 0.55, 1.6), cloth);" +
    " gl_FragColor = vec4(c, 1.0); }";

  function buildPull(A) {
    var n = NX * NY, rest = new Float32Array(n * 2), uv = new Float32Array(n * 2), k = 0;
    for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) {
      rest[k] = uv[k] = x / (NX - 1); rest[k + 1] = uv[k + 1] = y / (NY - 1); k += 2;
    }
    // where the cloth is: the dark of the photograph, read once at the springs' own spacing
    var c = document.createElement("canvas"); c.width = NX; c.height = NY;
    var x2 = c.getContext("2d"); x2.drawImage(A, 0, 0, NX, NY);
    var px = x2.getImageData(0, 0, NX, NY).data, cloth = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var L = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
      cloth[i] = 1 - Math.max(0, Math.min(1, (L - 0.26) / 0.14));
    }
    var p = program(PULL_VS, PULL_FS), idx = grid(NX, NY);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    var pos = new Float32Array(rest), strain = new Float32Array(n), light = new Float32Array(n);
    return { p: p, rest: rest, pos: pos, u: new Float32Array(n * 2), v: new Float32Array(n * 2), cloth: cloth, strain: strain, light: light,
             bp: buffer(pos, gl.DYNAMIC_DRAW), bu: buffer(uv), bs: buffer(strain, gl.DYNAMIC_DRAW), bl: buffer(light, gl.DYNAMIC_DRAW), ib: ib, count: idx.length,
             tA: texture(A), grab: null, w: new Float32Array(n), moving: false };
  }

  var MAXD = 0.065;                          // the farthest the knit goes (a fraction of the picture), however hard you pull
  function physics(P, dt) {
    var K = 520, KR = 34, C = 11, KG = 1400, u = P.u, v = P.v, n = NX * NY, energy = 0;
    var gx = 0, gy = 0;
    if (P.grab) {
      var dx = P.grab.x - P.grab.x0, dy = P.grab.y - P.grab.y0, d = Math.hypot(dx, dy);
      if (d > 0) { var f = MAXD * Math.tanh(d / MAXD) / d; gx = dx * f; gy = dy * f; }
    }
    for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) {
      var i = y * NX + x, j = i * 2;
      if (x === 0 || y === 0 || x === NX - 1 || y === NY - 1) { u[j] = u[j + 1] = v[j] = v[j + 1] = 0; continue; }
      var lx = u[j - 2] + u[j + 2] + u[j - NX * 2] + u[j + NX * 2] - 4 * u[j];
      var ly = u[j - 1] + u[j + 3] + u[j - NX * 2 + 1] + u[j + NX * 2 + 1] - 4 * u[j + 1];
      var fx = K * lx - KR * u[j] - C * v[j], fy = K * ly - KR * u[j + 1] - C * v[j + 1];
      if (P.grab && P.w[i] > 0.002) { fx += KG * P.w[i] * (gx * P.w[i] - u[j]); fy += KG * P.w[i] * (gy * P.w[i] - u[j + 1]); }
      v[j] += fx * dt; v[j + 1] += fy * dt;
    }
    for (i = 0; i < n * 2; i++) { u[i] += v[i] * dt; energy += Math.abs(v[i]) + Math.abs(u[i]); }
    return energy;
  }
  function stretchOf(P) {
    var pos = P.pos, rest = P.rest, u = P.u, s = P.strain, hx = 1 / (NX - 1), hy = 1 / (NY - 1);
    for (var i = 0, n = NX * NY; i < n; i++) { pos[i * 2] = rest[i * 2] + u[i * 2]; pos[i * 2 + 1] = rest[i * 2 + 1] + u[i * 2 + 1]; }
    for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) {
      var i2 = y * NX + x, j = i2 * 2, ex = 0, ey = 0;
      if (x < NX - 1) ex = Math.hypot(pos[j + 2] - pos[j], pos[j + 3] - pos[j + 1]) / hx - 1;
      else ex = Math.hypot(pos[j] - pos[j - 2], pos[j + 1] - pos[j - 1]) / hx - 1;
      if (y < NY - 1) ey = Math.hypot(pos[j + NX * 2] - pos[j], pos[j + NX * 2 + 1] - pos[j + 1]) / hy - 1;
      else ey = Math.hypot(pos[j] - pos[j - NX * 2], pos[j + 1] - pos[j - NX * 2 + 1]) / hy - 1;
      s[i2] = Math.max(0, Math.max(ex, ey)) * 4;
    }
    // the tent: height is how far the cloth was drawn out; its slope, against a light from the top left, shades it
    var h = P.h || (P.h = new Float32Array(NX * NY)), Lt = P.light;
    for (i = 0; i < NX * NY; i++) h[i] = Math.hypot(u[i * 2], u[i * 2 + 1]) / MAXD;
    for (y = 0; y < NY; y++) for (x = 0; x < NX; x++) {
      var k = y * NX + x, hx = (h[k + (x < NX - 1 ? 1 : 0)] - h[k - (x > 0 ? 1 : 0)]), hy = (h[k + (y < NY - 1 ? NX : 0)] - h[k - (y > 0 ? NX : 0)]);
      Lt[k] = (hx + hy) * 0.9;                        // facing the key light (up and left) brightens, facing away darkens
    }
  }
  function drawPull() {
    var P = pull; stretchOf(P);
    gl.useProgram(P.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.bp); gl.bufferSubData(gl.ARRAY_BUFFER, 0, P.pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.bs); gl.bufferSubData(gl.ARRAY_BUFFER, 0, P.strain);
    gl.bindBuffer(gl.ARRAY_BUFFER, P.bl); gl.bufferSubData(gl.ARRAY_BUFFER, 0, P.light);
    attrib(P.p, "aP", P.bp, 2); attrib(P.p, "aU", P.bu, 2); attrib(P.p, "aS", P.bs, 1); attrib(P.p, "aL", P.bl, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, P.ib);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, P.tA); gl.uniform1i(gl.getUniformLocation(P.p, "tA"), 0);
    gl.drawElements(gl.TRIANGLES, P.count, gl.UNSIGNED_SHORT, 0);
  }
  function grabAt(x, y) {                    // the cloth under the finger, weighted by distance; the backdrop never answers
    var P = pull, i0 = Math.round(y * (NY - 1)) * NX + Math.round(x * (NX - 1));
    var here = P.cloth[Math.max(0, Math.min(NX * NY - 1, i0))];
    if (here < 0.5) return false;
    var sig = 0.055;
    for (var yy = 0; yy < NY; yy++) for (var xx = 0; xx < NX; xx++) {
      var i = yy * NX + xx, dx = xx / (NX - 1) - x, dy = (yy / (NY - 1) - y) * 1.25;
      P.w[i] = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig)) * P.cloth[i];
    }
    P.grab = { x0: x, y0: y, x: x, y: y };
    return true;
  }

  // ------------------------------------------------------------------ drawing and the loop
  function size() {
    var r = fig.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
  }
  function draw() {
    if (S.mode === "step" && step) drawStep();
    else if (S.mode === "pull" && pull) drawPull();
  }
  var raf = 0, last = 0, DUR = 3800, HOLD = 600;
  function frame(now) {
    raf = 0;
    if (S.mode === "step" && S.playing) {
      var t = now - S.t0;
      S.p = Math.max(0, Math.min(1, (t - HOLD) / DUR));
      if (range) range.value = String(Math.round(S.p * 1000));
      if (S.p >= 1) { S.playing = false; S.played = true; said("The Tapered Jogger, worn."); setPlay(); }
    }
    if (S.mode === "pull" && pull) {
      var dt = Math.min(0.033, (now - (last || now)) / 1000) || 1 / 60, e = 0;
      for (var k = 0; k < 4; k++) e = physics(pull, dt / 4);
      pull.moving = !!pull.grab || e > 0.002;
    }
    last = now;
    draw();
    if ((S.mode === "step" && S.playing) || (S.mode === "pull" && pull && pull.moving)) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function said(t) { if (live) live.textContent = t; }
  function setPlay() {
    if (!play) return;
    var again = S.p >= 1 || S.played;
    play.setAttribute("aria-label", S.playing ? "Pause" : again ? "Play again" : "Play");
    play.dataset.state = S.playing ? "pause" : again ? "again" : "play";
  }
  function start() {
    if (!step) return;
    if (S.p >= 1) S.p = 0;
    S.playing = true; S.t0 = performance.now() - (S.p > 0 ? HOLD + S.p * DUR : 0);
    setPlay(); kick();
  }

  // ------------------------------------------------------------------ modes
  function setMode(m, quiet) {
    if (["step", "pull", "photo"].indexOf(m) < 0) m = "step";
    S.mode = m; fig.setAttribute("data-mode", m); col.setAttribute("data-mode", m);
    if (bar) bar.querySelectorAll("[data-mode]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === m)); });
    if (m !== "step") { S.playing = false; setPlay(); }
    cv.setAttribute("tabindex", m === "photo" ? "-1" : "0");
    cv.setAttribute("aria-label", m === "pull"
      ? "The Tapered Jogger. Press and pull the fabric to stretch it; with the keyboard, hold an arrow key."
      : "The Tapered Jogger, from the jogger alone to the jogger worn.");
    if (m !== "photo") { size(); kick(); }
    if (!quiet) said(m === "step" ? "Step in." : m === "pull" ? "Pull it: press and pull the fabric." : "Photographs.");
    if (m === "step" && !S.played && !reduce && seen) start();
    try { history.replaceState(history.state, "", location.pathname + (m === "step" ? "" : "?present=" + m) + location.hash); } catch (e) { /* a sandboxed frame */ }
  }
  if (bar) bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode);
  });

  // the step: the slider, the button, a drag with a mouse (on a phone the slider; the picture still swipes the gallery)
  if (range) range.addEventListener("input", function () { S.playing = false; S.p = +range.value / 1000; setPlay(); kick(); });
  if (play) play.addEventListener("click", function () { if (S.playing) { S.playing = false; setPlay(); } else start(); });

  var drag = null;
  cv.addEventListener("click", function (e) { e.stopPropagation(); });   // the picture is not the zoom here
  cv.addEventListener("pointerdown", function (e) {
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (S.mode === "pull" && pull) {
      if (!grabAt(x, y)) return;
      cv.setPointerCapture(e.pointerId); drag = { id: e.pointerId }; fig.classList.add("grabbing");
      if (!S.pulled) { S.pulled = true; col.classList.add("pulled"); }
      e.preventDefault(); kick();
    } else if (S.mode === "step" && e.pointerType === "mouse") {
      cv.setPointerCapture(e.pointerId); drag = { id: e.pointerId, x: e.clientX, p: S.p }; S.playing = false; setPlay();
    }
  });
  cv.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var r = cv.getBoundingClientRect();
    if (S.mode === "pull" && pull && pull.grab) {
      pull.grab.x = (e.clientX - r.left) / r.width; pull.grab.y = (e.clientY - r.top) / r.height; kick();
    } else if (S.mode === "step") {
      S.p = Math.max(0, Math.min(1, drag.p + (e.clientX - drag.x) / r.width)); if (range) range.value = String(Math.round(S.p * 1000)); kick();
    }
  });
  function release(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    drag = null; fig.classList.remove("grabbing");
    if (pull) { pull.grab = null; kick(); }
  }
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);

  // the keyboard: in «Pull it», hold an arrow to pull the knee that way; in «Step in», the arrows move the slider
  var KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  cv.addEventListener("keydown", function (e) {
    var k = KEYS[e.key]; if (!k) return;
    e.preventDefault();
    if (S.mode === "pull" && pull) {
      if (!pull.grab) { grabAt(0.32, 0.52); S.pulled = true; col.classList.add("pulled"); }
      pull.grab.x = pull.grab.x0 + k[0] * 0.12; pull.grab.y = pull.grab.y0 + k[1] * 0.12; kick();
    } else if (S.mode === "step") {
      S.playing = false; S.p = Math.max(0, Math.min(1, S.p + k[0] * 0.05 + k[1] * 0.05));
      if (range) range.value = String(Math.round(S.p * 1000)); setPlay(); kick();
    }
  });
  cv.addEventListener("keyup", function (e) { if (KEYS[e.key] && pull && pull.grab) { pull.grab = null; kick(); } });

  window.addEventListener("resize", function () { if (S.mode !== "photo") { size(); kick(); } });

  // ------------------------------------------------------------------ start: the pictures, the morph, then the first view
  var seen = false;
  var params = new URLSearchParams(location.search);
  setMode(params.get("present") || "step", true);
  Promise.all([
    load(imgA.currentSrc && /-1440\./.test(imgA.currentSrc) ? imgA.currentSrc : pick(imgA, 1)),
    load(pick(imgB, 1.5)),
    load(fig.dataset.field),
    fetch(fig.dataset.morph).then(function (r) { if (!r.ok) throw new Error("morph " + r.status); return r.json(); })
  ]).then(function (got) {
    meta = got[3];
    step = buildStep(got[0], got[1], got[2]);
    pull = buildPull(got[0]);
    fig.classList.add("present-on");
    if (bar) bar.removeAttribute("data-wait");
    if (row) row.removeAttribute("data-wait");
    var note = document.getElementById("present-note"); if (note) note.removeAttribute("data-wait");
    size(); draw();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        // most of it in view — of the picture, or of the screen when the picture is taller than the screen
        var enough = 0.6 * Math.min(en.boundingClientRect.height, window.innerHeight);
        if (en.isIntersecting && en.intersectionRect.height >= enough && !seen) {
          seen = true; io.disconnect();
          if (S.mode === "step" && !reduce && !S.played) start();
        }
      });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
    io.observe(fig);
  }).catch(function (err) { off(err && err.message || String(err)); });
  window.__present = S;                        // for the tests: the state, never a way to drive the page
})();
