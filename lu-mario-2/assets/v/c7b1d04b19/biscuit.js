// Lu Mario — the biscuit you can turn. Their Digestive drawn in WebGL from the one picture of it the site already shows:
// the face is the picture, its relief read from the picture's own light and shade; the side is the picture's own rim,
// wrapped round; the underside is the same picture blurred past its letters. A finger or the mouse turns it, a double tap
// flips it, the arrow keys turn it and Enter flips it. Where WebGL is missing the picture stays, as it was.
// The centre and radius of the biscuit in its picture are measured by tools/build.py (data-cx, data-cy, data-r).

const stage = document.querySelector('[data-biscuit]');
if (stage) init(stage);

function init(stage) {
  const pic = stage.querySelector('img');
  const canvas = stage.querySelector('canvas');
  const flipBtn = document.querySelector('[data-flip]');
  const gl = canvas && canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl || !pic) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('still');
  const CX = +stage.dataset.cx, CY = +stage.dataset.cy, R = +stage.dataset.r * 0.972;   // inside the crumbly edge

  // ── geometry: a disc with a rounded edge, its axis toward the viewer ──
  const SEG = 128, H = 0.2, B = 0.055;                    // thickness and bevel, the radius being 1
  const prof = [[0.958, H / 2, 0], [0.99, H / 2 - B * 0.45, 1], [1, H / 2 - B, 2], [1, -H / 2 + B, 2], [0.99, -H / 2 + B * 0.45, 1], [0.958, -H / 2, 0]];
  const pos = [], nor = [], uv = [], part = [];
  const push = (p, n, t, k) => { pos.push(...p); nor.push(...n); uv.push(...t); part.push(k); };
  const faceUV = (x, y, back) => [CX + R * (back ? -x : x), CY - R * y];
  for (const back of [false, true]) {                     // the face and the underside
    const z = back ? -H / 2 : H / 2, nz = back ? -1 : 1, r0 = prof[0][0];
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
      const p0 = [0, 0], p1 = [Math.cos(a0) * r0, Math.sin(a0) * r0], p2 = [Math.cos(a1) * r0, Math.sin(a1) * r0];
      const tri = back ? [p0, p2, p1] : [p0, p1, p2];
      for (const [x, y] of tri) push([x, y, z], [0, 0, nz], faceUV(x, y, back), back ? 1 : 0);
    }
  }
  for (let j = 0; j < prof.length - 1; j++) {             // the rim, ring by ring
    const [ra, za, ka] = prof[j], [rb, zb] = prof[j + 1];
    const na = j < 2 ? [0.55, 0.83] : j > 2 ? [0.55, -0.83] : [1, 0];
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
      const q = (a, r, z) => [Math.cos(a) * r, Math.sin(a) * r, z];
      const n = (a) => [Math.cos(a) * na[0], Math.sin(a) * na[0], na[1]];
      const t = (a, d) => [CX + R * (0.95 - d) * Math.cos(a), CY - R * (0.95 - d) * Math.sin(a)];
      const da = ka === 2 ? 0.0 : 0.02, db = j === 2 ? 0.06 : 0.02;
      const v = [[q(a0, ra, za), n(a0), t(a0, da)], [q(a1, ra, za), n(a1), t(a1, da)], [q(a1, rb, zb), n(a1), t(a1, db)],
                 [q(a0, ra, za), n(a0), t(a0, da)], [q(a1, rb, zb), n(a1), t(a1, db)], [q(a0, rb, zb), n(a0), t(a0, db)]];
      for (const [p, nn, tt] of v) push(p, nn, tt, 2);
    }
  }

  const vs = `attribute vec3 p; attribute vec3 n; attribute vec2 t; attribute float k;
    uniform mat4 m; uniform mat4 proj; varying vec2 vT; varying vec3 vN; varying float vK;
    void main(){ vT=t; vK=k; vN=(m*vec4(n,0.)).xyz; gl_Position=proj*(m*vec4(p,1.)); }`;
  const fs = `precision mediump float;
    uniform sampler2D tex; uniform vec3 light; uniform vec3 tx; uniform vec3 ty; uniform float texel; uniform vec2 ctr;
    varying vec2 vT; varying vec3 vN; varying float vK;
    float lum(vec2 u){ return dot(texture2D(tex,u).rgb, vec3(.299,.587,.114)); }
    float hash(vec2 u){ return fract(sin(dot(u, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec3 N = normalize(vN); vec3 c;
      if (vK < .5) {
        c = texture2D(tex, vT).rgb;
        float hx = lum(vT+vec2(texel,0.)) - lum(vT-vec2(texel,0.));
        float hy = lum(vT+vec2(0.,texel)) - lum(vT-vec2(0.,texel));
        N = normalize(N - 5.5*(hx*tx - hy*ty));
      } else if (vK < 1.5) {
        // the underside: the biscuit's own colour, blurred past every letter, with a baked grain of its own
        vec2 u = ctr + (vT - ctr) * .55;
        c = texture2D(tex, u, 7.).rgb * 1.03;
        float g = hash(floor(vT*620.)) * .55 + hash(floor(vT*140.)) * .3 + hash(floor(vT*36.)) * .15;
        c *= .9 + g * .17;
        float rim = smoothstep(.36, .47, length((vT - ctr)));   // browner toward the edge, as a baked biscuit is
        c *= 1. - rim * .16;
      } else {
        c = texture2D(tex, vT).rgb * .86;
      }
      vec3 L = normalize(light);
      float d = max(dot(N, L), 0.);
      vec3 H = normalize(L + vec3(0.,0.,1.));
      float s = pow(max(dot(N, H), 0.), 28.) * .22;
      gl_FragColor = vec4(c*(.44 + .78*d) + s, 1.);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = (data, name, size) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  buf(pos, 'p', 3); buf(nor, 'n', 3); buf(uv, 't', 2); buf(part, 'k', 1);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uM = U('m'), uP = U('proj'), uL = U('light'), uTx = U('tx'), uTy = U('ty');
  gl.uniform1f(U('texel'), 1.5 / 1024);
  gl.uniform2f(U('ctr'), CX, CY);
  gl.enable(gl.DEPTH_TEST);

  // ── the picture as a texture (a power of two, so the underside can blur through its mipmaps) ──
  const ready = new Promise((ok) => { if (pic.complete && pic.naturalWidth) ok(); else pic.addEventListener('load', ok, { once: true }); });
  ready.then(() => {
    const c2 = document.createElement('canvas'); c2.width = c2.height = 1024;
    c2.getContext('2d').drawImage(pic, 0, 0, 1024, 1024);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c2);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    stage.classList.add('is-3d');
    stage.dataset.ready = '1';
    // the picture's description moves to the drawing a person can now turn, and the picture steps aside
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', pic.alt);
    canvas.removeAttribute('aria-hidden');
    canvas.tabIndex = 0;
    pic.setAttribute('aria-hidden', 'true');
    draw(); loop();
  });

  // ── matrices ──
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; };
  const rotX = (a) => [1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1];
  const rotY = (a) => [Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1];
  const persp = (f, near, far) => { const t = 1 / Math.tan(f / 2); return [t, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]; };

  // ── the state: where it faces, how it moves, where the light is ──
  const S = { yaw: 0, pitch: -0.18, vy: 0, vp: 0, light: [-0.55, 0.6, 0.9], drag: null, t0: performance.now(), idle: 0, flipTo: null };
  function draw() {
    const w = Math.round(canvas.clientWidth * Math.min(2, devicePixelRatio || 1));
    if (canvas.width !== w) { canvas.width = canvas.height = w; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const m = mul(rotX(S.pitch), rotY(S.yaw));
    const mv = m.slice(); mv[14] = -5.6;                      // the rotation, set back from the eye
    gl.uniformMatrix4fv(uM, false, mv);
    gl.uniformMatrix4fv(uP, false, persp(0.4, 0.1, 20));
    gl.uniform3fv(uTx, [m[0], m[1], m[2]]);
    gl.uniform3fv(uTy, [m[4], m[5], m[6]]);
    gl.uniform3fv(uL, S.light);
    gl.drawArrays(gl.TRIANGLES, 0, part.length);
    // what the page shows, said in words a test can read: which side faces the viewer, and how far it is turned
    const facing = Math.cos(S.yaw) * Math.cos(S.pitch);
    stage.dataset.side = facing >= 0 ? 'face' : 'back';
    stage.dataset.yaw = S.yaw.toFixed(3);
    stage.style.setProperty('--face', Math.abs(facing).toFixed(3));
  }

  let raf = 0, visible = true;
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible) return;
    raf = requestAnimationFrame((now) => {
      const dt = Math.min(0.05, (now - (loop.last || now)) / 1000); loop.last = now;
      if (S.flipTo !== null) {                                    // a flip: half a turn, eased
        const d = S.flipTo - S.yaw; S.yaw += d * Math.min(1, dt * 7);
        if (Math.abs(d) < 0.002) { S.yaw = S.flipTo; S.flipTo = null; }
      } else if (!S.drag) {
        S.yaw += S.vy * dt; S.pitch += S.vp * dt;               // the push of a release, dying away
        S.vy *= Math.pow(0.08, dt); S.vp *= Math.pow(0.002, dt);
        S.idle += dt;
        if (!still && S.idle > 1.2 && Math.abs(S.vy) < 0.25) {   // at rest it sways a little, so the light moves over the name
          const k = Math.min(1, (S.idle - 1.2) / 2), t = (now - S.t0) / 1000;
          const face = Math.round(S.yaw / Math.PI) * Math.PI;
          S.yaw += (face + Math.sin(t * 0.55) * 0.42 * k - S.yaw) * Math.min(1, dt * 1.6);
          S.pitch += (-0.18 + Math.sin(t * 0.37) * 0.16 * k - S.pitch) * Math.min(1, dt * 1.6);
        }
      }
      S.pitch = Math.max(-1.25, Math.min(1.25, S.pitch));
      draw();
      if (!still || S.drag || S.flipTo !== null || Math.abs(S.vy) > 0.01) loop();
    });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) loop(); }).observe(stage);
  }

  // ── a finger or the mouse ──
  canvas.addEventListener('pointerdown', (e) => {
    S.drag = { x: e.clientX, y: e.clientY, t: performance.now() }; S.flipTo = null; S.idle = 0;
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-held'); loop();
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (!S.drag) {                                            // the light follows the pointer
      if (e.pointerType === 'mouse') { S.light = [((e.clientX - r.left) / r.width - 0.5) * 2.2, -((e.clientY - r.top) / r.height - 0.5) * 2.2, 1]; if (still) draw(); }
      return;
    }
    const now = performance.now(), dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y, k = 3.4 / r.width;
    S.yaw += dx * k; S.pitch += dy * k;
    const dt = Math.max(16, now - S.drag.t) / 1000, cap = (v, m) => Math.max(-m, Math.min(m, v));
    S.vy = cap((dx * k) / dt, 7); S.vp = cap((dy * k) / dt, 1.5);
    S.drag = { x: e.clientX, y: e.clientY, t: now };
  });
  const release = () => { if (!S.drag) return; S.drag = null; S.idle = 0; canvas.classList.remove('is-held'); loop(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  const flip = () => { S.idle = 0; S.vy = 0; S.flipTo = (S.flipTo ?? Math.round(S.yaw / Math.PI) * Math.PI) + Math.PI; loop(); };
  canvas.addEventListener('dblclick', flip);
  if (flipBtn) flipBtn.addEventListener('click', flip);
  canvas.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [-0.35, 0], ArrowRight: [0.35, 0], ArrowUp: [0, -0.3], ArrowDown: [0, 0.3] }[e.key];
    if (step) { e.preventDefault(); S.yaw += step[0]; S.pitch += step[1]; S.idle = 0; loop(); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  });
  addEventListener('resize', () => draw());
}
