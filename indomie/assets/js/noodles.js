// noodles.js — the hero: a bowl of Indomie you can lift with chopsticks (DESIGN §3).
// Every strand is a rope of points (Verlet) on the CPU; the GPU draws it as a crinkled tube read from a float texture,
// so ninety-odd noodles cost one draw call. Drag up and the nearest strands come with the chopsticks; let go and they
// fall back and settle into the bowl. Left alone, the chopsticks lift a bundle by themselves now and then.
import * as THREE from './three.module.min.js?v=512c8b83df';

const BOWL = { R: 1.05, CY: 0.5, RIM: 0.32, T: 0.055 };            // the inner glaze is a sphere cap; rim height; wall
const TOP = (x, z) => 0.17 - 0.22 * (x * x + z * z);                  // the top of the noodle mass, a low dome

export function mountNoodles(canvas, opt = {}) {
  const lite = opt.lite ?? (matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 4) <= 4);
  const NS = lite ? 70 : 104, NP = 40, SEG = lite ? 110 : 160, RAD = lite ? 5 : 7, L = 0.07;
  const seedRand = mulberry(opt.seed ?? 7);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.6 : 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.03).texture;

  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(-2.5, 5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(2.5, 2.5, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x24160c, 0.55));

  // ── the bowl ─────────────────────────────────────────────────────────────────────────────────────────────────
  const bowl = new THREE.Group(); scene.add(bowl);
  const glazeIn = new THREE.MeshPhysicalMaterial({ color: 0xfbf6ee, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glazeOut = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(opt.bowl || '#e2231a'), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 });
  const [outerProfile, innerProfile] = bowlProfile();
  bowl.add(new THREE.Mesh(new THREE.LatheGeometry(outerProfile, 96), glazeOut));
  bowl.add(new THREE.Mesh(new THREE.LatheGeometry(innerProfile, 96), glazeIn));
  const broth = new THREE.Mesh(new THREE.CircleGeometry(0.87, 64),                     // the glaze's radius at the broth line
    new THREE.MeshPhysicalMaterial({ color: 0xc9781e, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.96 }));
  broth.rotation.x = -Math.PI / 2; broth.position.y = -0.06; bowl.add(broth);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({
    map: radialTex(), transparent: true, depthWrite: false, opacity: 0.55, color: opt.shadow || 0x000000 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.64; scene.add(shadow);

  // ── toppings: the fried egg, spring onion, chilli ──────────────────────────────────────────────────────────────
  const tops = new THREE.Group(); scene.add(tops);
  const egg = friedEgg(); egg.scale.setScalar(0.74); egg.position.set(-0.36, TOP(-0.36, 0.26) + 0.03, 0.26); egg.rotation.set(0.14, 0.6, -0.1);
  tops.add(egg);
  const dot = new THREE.Object3D(), col = new THREE.Color();
  const onion = new THREE.InstancedMesh(new THREE.TorusGeometry(0.021, 0.0075, 8, 16),
    new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }), lite ? 26 : 38);
  for (let i = 0; i < onion.count; i++) {
    const a = seedRand() * 6.283, r = 0.15 + Math.sqrt(seedRand()) * 0.62, x = Math.cos(a) * r, z = Math.sin(a) * r;
    dot.position.set(x, TOP(x, z) + 0.012, z); dot.rotation.set(Math.PI / 2 + (seedRand() - 0.5) * 0.8, 0, seedRand() * 6.283);
    dot.scale.setScalar(0.8 + seedRand() * 0.5); dot.updateMatrix(); onion.setMatrixAt(i, dot.matrix);
    onion.setColorAt(i, col.set(seedRand() < 0.55 ? '#4caf32' : '#bfe58a'));
  }
  tops.add(onion);
  const chili = new THREE.InstancedMesh(new THREE.BoxGeometry(0.026, 0.005, 0.017),
    new THREE.MeshPhysicalMaterial({ color: 0xd8220f, roughness: 0.35, clearcoat: 0.6 }), lite ? 40 : 70);
  for (let i = 0; i < chili.count; i++) {
    const a = seedRand() * 6.283, r = Math.sqrt(seedRand()) * 0.75, x = Math.cos(a) * r, z = Math.sin(a) * r;
    dot.position.set(x, TOP(x, z) + 0.01, z); dot.rotation.set((seedRand() - 0.5) * 0.6, seedRand() * 6.283, (seedRand() - 0.5) * 0.6);
    dot.scale.setScalar(0.7 + seedRand() * 0.8); dot.updateMatrix(); chili.setMatrixAt(i, dot.matrix);
  }
  tops.add(chili);

  // ── the strands: rest pose, state, the texture the GPU reads ─────────────────────────────────────────────────
  const N = NS * NP;
  const pos = new Float32Array(N * 3), prev = new Float32Array(N * 3), rest = new Float32Array(N * 3);
  const pin = new Int8Array(N), pinOff = new Float32Array(N * 3);
  const active = new Uint8Array(NS), relax = new Float32Array(NS);
  const bend = new Float32Array(N);                                     // rest distance from point i to i+2
  for (let s = 0; s < NS; s++) layStrand(s);
  pos.set(rest); prev.set(rest);
  const texData = new Float32Array(N * 4);
  const tex = new THREE.DataTexture(texData, NP, NS, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
  writeTex();

  function layStrand(s) {
    const r0 = Math.sqrt(seedRand()) * 0.78, a0 = seedRand() * Math.PI * 2;
    let x = Math.cos(a0) * r0, z = Math.sin(a0) * r0;
    const depth = Math.abs(gauss(seedRand)) * (s < NS * 0.6 ? 0.06 : 0.13) + 0.012;  // most strands near the top
    let th = seedRand() * Math.PI * 2, curv = (seedRand() - 0.5) * 0.6;
    for (let i = 0; i < NP; i++) {
      const k = (s * NP + i) * 3;
      const rr = Math.hypot(x, z), lim = 0.86;                          // inside the glaze and above the broth, always
      if (rr > lim) { x *= lim / rr; z *= lim / rr; }
      const floor = Math.max(-0.07, BOWL.CY - Math.sqrt(BOWL.R * BOWL.R - Math.min(x * x + z * z, 1.0)) + 0.05);
      rest[k] = x; rest[k + 1] = Math.max(floor, TOP(x, z) - depth + (seedRand() - 0.5) * 0.02); rest[k + 2] = z;
      curv += (seedRand() - 0.5) * 0.35; curv = Math.max(-0.7, Math.min(0.7, curv));
      th += curv;
      const r = Math.hypot(x, z);
      if (r > 0.7) {                                                    // near the glaze: turn back towards the middle
        const back = Math.atan2(-z, -x); let d = back - th;
        d = Math.atan2(Math.sin(d), Math.cos(d)); th += d * (r > 0.8 ? 0.8 : 0.35);
      }
      x += Math.cos(th) * L; z += Math.sin(th) * L;
    }
    for (let i = 0; i < NP - 2; i++) {
      const a = (s * NP + i) * 3, b = a + 6;
      bend[s * NP + i] = Math.hypot(rest[a] - rest[b], rest[a + 1] - rest[b + 1], rest[a + 2] - rest[b + 2]);
    }
  }

  function writeTex() {
    for (let p = 0; p < N; p++) {
      texData[p * 4] = pos[p * 3]; texData[p * 4 + 1] = pos[p * 3 + 1]; texData[p * 4 + 2] = pos[p * 3 + 2];
    }
    tex.needsUpdate = true;
  }

  // ── the noodle material: a physical material whose vertices come from the texture ────────────────────────────
  const geo = tubeGeometry(NS, SEG, RAD, seedRand);
  const noodleMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(opt.noodle || '#ffc848'), roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.16,
    sheen: 0.6, sheenColor: new THREE.Color('#fff0c0'), sheenRoughness: 0.4 });
  const uni = {
    uPts: { value: tex }, uNP: { value: NP }, uLen: { value: L * (NP - 1) }, uRad: { value: lite ? 0.0135 : 0.012 },
    uAmp: { value: 0.024 }, uLambda: { value: 0.105 }, uTint: { value: new THREE.Color(opt.tint || '#ec6a1c') },
  };
  noodleMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform highp sampler2D uPts; uniform float uNP, uLen, uRad, uAmp, uLambda;
attribute float aStrand, aT, aAng, aSeed;
varying vec3 vW; varying float vSeed, vT;
vec3 P(int i, int s) { i = clamp(i, 0, int(uNP) - 1); return texelFetch(uPts, ivec2(i, s), 0).xyz; }
vec3 curve(float t, int s) {
  float u = clamp(t, 0.0, 1.0) * (uNP - 1.0); int i = int(min(floor(u), uNP - 2.0)); float f = u - float(i);
  vec3 p1 = P(i, s), p2 = P(i + 1, s);
  vec3 p0 = i == 0 ? 2.0 * p1 - p2 : P(i - 1, s);
  vec3 p3 = i + 2 > int(uNP) - 1 ? 2.0 * p2 - p1 : P(i + 2, s);
  float f2 = f * f, f3 = f2 * f;
  return 0.5 * (2.0 * p1 + (p2 - p0) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f2 + (3.0 * p1 - p0 - 3.0 * p2 + p3) * f3);
}
void basis(vec3 n, out vec3 b1, out vec3 b2) {             // Frisvad: continuous for every direction but straight at -z
  if (n.z < -0.9999) { b1 = vec3(0.0, -1.0, 0.0); b2 = vec3(-1.0, 0.0, 0.0); return; }
  float a = 1.0 / (1.0 + n.z), b = -n.x * n.y * a;
  b1 = vec3(1.0 - n.x * n.x * a, b, -n.x); b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);
}
vec3 crinkle(float t, int s, float seed) {                  // the centre line plus the instant noodle's wave
  float dt = 0.004;
  vec3 c = curve(t, s), d = normalize(curve(t + dt, s) - curve(t - dt, s) + 1e-6);
  vec3 b1, b2; basis(d, b1, b2);
  vec3 w = cos(seed * 6.283) * b1 + sin(seed * 6.283) * b2;
  float ph = t * uLen / uLambda * 6.2832 + seed * 40.0;
  return c + w * sin(ph) * uAmp + cross(d, w) * sin(ph * 0.5 + seed * 9.0) * uAmp * 0.35;
}
vec3 nPos; vec3 nNor;`)
      .replace('#include <beginnormal_vertex>', `
  int sI = int(aStrand + 0.5);
  float dt = 0.5 / ${SEG.toFixed(1)};
  vec3 c0 = crinkle(aT, sI, aSeed), c1 = crinkle(aT + dt, sI, aSeed), cm = crinkle(aT - dt, sI, aSeed);
  vec3 tg = normalize(c1 - cm + 1e-6); vec3 e1, e2; basis(tg, e1, e2);
  vec3 radial = cos(aAng) * e1 + sin(aAng) * e2;
  float taper = smoothstep(0.0, 0.012, aT) * smoothstep(1.0, 0.988, aT);
  float rad = uRad * (0.88 + 0.24 * fract(aSeed * 17.0)) * max(taper, 0.25);
  nPos = c0 + radial * rad; nNor = radial;
  vW = nPos; vSeed = aSeed; vT = aT;
  vec3 objectNormal = nNor;`)
      .replace('#include <begin_vertex>', 'vec3 transformed = nPos;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uTint; varying vec3 vW; varying float vSeed, vT;
float h1(float n) { return fract(sin(n) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float top = 0.17 - 0.22 * dot(vW.xz, vW.xz);
  float deep = clamp((top - vW.y) / 0.26, 0.0, 1.0);                 // inside the mass: darker, the cheap occlusion
  float wall = smoothstep(0.62, 0.98, length(vW.xz)) * step(vW.y, 0.34);
  float sauce = smoothstep(0.3, 1.0, sin(vT * 31.0 + vSeed * 50.0) * 0.5 + 0.5) * 0.3;   // the seasoning oil, in long washes
  diffuseColor.rgb = mix(diffuseColor.rgb, uTint, sauce);
  diffuseColor.rgb *= (0.94 + 0.12 * fract(vSeed * 13.0)) * mix(1.0, 0.62, deep * deep) * (1.0 - 0.2 * wall);`);
  };
  const noodles = new THREE.Mesh(geo, noodleMat);
  noodles.frustumCulled = false; scene.add(noodles);

  // ── chopsticks ───────────────────────────────────────────────────────────────────────────────────────────────
  const stickMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(opt.sticks || '#2a1a12'), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const stickGeo = new THREE.CylinderGeometry(0.03, 0.011, 2.7, 16, 1); stickGeo.translate(0, 1.35, 0);  // tip at the origin
  const sticks = [new THREE.Mesh(stickGeo, stickMat), new THREE.Mesh(stickGeo, stickMat)];
  sticks.forEach((m) => scene.add(m));
  const UP = new THREE.Vector3(0, 1, 0), DIR = new THREE.Vector3(0.62, 1, 0.42).normalize();
  const restTip = new THREE.Vector3(-0.15, 0.62, 0.55);                // idle: hovering above the bowl
  const tip = restTip.clone(), tipGoal = restTip.clone();
  let gap = 0.13, gapGoal = 0.13;

  // ── steam ────────────────────────────────────────────────────────────────────────────────────────────────────
  const steamTex = puffTex();
  const puffs = [];
  for (let i = 0; i < (lite ? 10 : 16); i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    m.userData = { age: Math.random() * 5, life: 4 + Math.random() * 2, x: 0, z: 0, d: Math.random() * 6 };
    scene.add(m); puffs.push(m);
  }

  // ── the grab ─────────────────────────────────────────────────────────────────────────────────────────────────
  let held = [];                                                        // [point index, offset] while the sticks hold
  function grab(at) {
    const cand = [];
    for (let s = 0; s < NS; s++) {
      let best = 1e9, bi = -1;
      for (let i = 4; i < NP - 4; i++) {
        const k = (s * NP + i) * 3;
        const dx = pos[k] - at.x, dz = pos[k + 2] - at.z, dy = (pos[k + 1] - at.y) * 2.2;
        const d = dx * dx + dz * dz + dy * dy;
        if (d < best) { best = d; bi = i; }
      }
      cand.push([best, s, bi]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    held = cand.slice(0, lite ? 12 : 18).map(([, s, i], n, arr) => {
      const p = s * NP + i, f = arr.length > 1 ? n / (arr.length - 1) - 0.5 : 0;
      pin[p] = 1; active[s] = 1; relax[s] = 0;
      pinOff[p * 3] = f * 0.09; pinOff[p * 3 + 1] = (Math.random() - 0.5) * 0.03; pinOff[p * 3 + 2] = (Math.random() - 0.5) * 0.05;
      return p;
    });
    gapGoal = 0.035;
  }
  function drop() {
    for (const p of held) { pin[p] = 0; relax[(p / NP) | 0] = 0.0001; }
    held = []; gapGoal = 0.13;
  }

  // ── the physics step ─────────────────────────────────────────────────────────────────────────────────────────
  const G = 15, h = 1 / 120;
  function step() {
    for (let s = 0; s < NS; s++) {
      if (!active[s]) continue;
      if (relax[s] > 0) relax[s] = Math.min(1, relax[s] + h * 0.7);
      for (let i = 0; i < NP; i++) {
        const p = s * NP + i, k = p * 3;
        if (pin[p]) {
          pos[k] = prev[k] = tip.x + pinOff[k]; pos[k + 1] = prev[k + 1] = tip.y + pinOff[k + 1];
          pos[k + 2] = prev[k + 2] = tip.z + pinOff[k + 2]; continue;
        }
        const x = pos[k], y = pos[k + 1], z = pos[k + 2];
        const inside = y < TOP(x, z);
        const damp = inside ? 0.72 : 0.992;
        let vx = (x - prev[k]) * damp, vy = (y - prev[k + 1]) * damp, vz = (z - prev[k + 2]) * damp;
        let ax = 0, ay = inside ? -2 : -G, az = 0;
        if (relax[s] > 0) {                                             // released: find its place in the bowl again
          const kr = 60 * relax[s] * (inside ? 1 : 0.15);
          ax += (rest[k] - x) * kr; ay += (rest[k + 1] - y) * kr; az += (rest[k + 2] - z) * kr;
        }
        prev[k] = x; prev[k + 1] = y; prev[k + 2] = z;
        pos[k] = x + vx + ax * h * h; pos[k + 1] = y + vy + ay * h * h; pos[k + 2] = z + vz + az * h * h;
      }
      for (let it = 0; it < 10; it++) {
        for (let i = 0; i < NP - 1; i++) link(s * NP + i, s * NP + i + 1, L, 1);
        if (it % 2 === 0) for (let i = 0; i < NP - 2; i++) link(s * NP + i, s * NP + i + 2, bend[s * NP + i], 0.12);
        for (let i = 0; i < NP; i++) glaze(s * NP + i);
      }
      if (relax[s] >= 1) {                                              // settled: back to its rest pose exactly
        let far = 0;
        for (let i = 0; i < NP * 3; i++) far = Math.max(far, Math.abs(pos[s * NP * 3 + i] - rest[s * NP * 3 + i]));
        if (far < 0.004) { active[s] = 0; relax[s] = 0;
          pos.set(rest.subarray(s * NP * 3, (s + 1) * NP * 3), s * NP * 3); prev.set(rest.subarray(s * NP * 3, (s + 1) * NP * 3), s * NP * 3); }
      }
    }
  }
  function link(a, b, len, stiff) {
    const ka = a * 3, kb = b * 3;
    const dx = pos[kb] - pos[ka], dy = pos[kb + 1] - pos[ka + 1], dz = pos[kb + 2] - pos[ka + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const wa = pin[a] ? 0 : 1, wb = pin[b] ? 0 : 1, w = wa + wb;
    if (!w) return;
    const c = ((d - len) / d) * stiff / w;
    pos[ka] += dx * c * wa; pos[ka + 1] += dy * c * wa; pos[ka + 2] += dz * c * wa;
    pos[kb] -= dx * c * wb; pos[kb + 1] -= dy * c * wb; pos[kb + 2] -= dz * c * wb;
  }
  function glaze(p) {                                                   // stay inside the bowl's glaze
    if (pin[p]) return;
    const k = p * 3, x = pos[k], y = pos[k + 1], z = pos[k + 2];
    if (y > BOWL.RIM + 0.02) return;
    const dy = y - BOWL.CY, d = Math.sqrt(x * x + dy * dy + z * z), lim = BOWL.R - 0.02;
    if (d > lim && Math.hypot(x, z) < 1.04) { const f = lim / d; pos[k] = x * f; pos[k + 1] = BOWL.CY + dy * f; pos[k + 2] = z * f; }
    if (pos[k + 1] < -0.1) pos[k + 1] = -0.1;                          // the broth's floor
  }

  // ── input: drag on the bowl to lift ──────────────────────────────────────────────────────────────────────────
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.12);
  let drag = null, lastUser = -1e9;
  const hit = opt.hit || canvas;
  hit.addEventListener('pointerdown', (e) => {
    const p = onMass(e); if (!p) return;
    hit.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y0: e.clientY, x0: e.clientX, base: p };
    auto.on = false; tipGoal.set(p.x, 0.12, p.z); tip.copy(tipGoal); gap = 0.13; grab(tip);
    lastUser = performance.now(); opt.onLift?.();
  });
  hit.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const rect = canvas.getBoundingClientRect(), s = 3.4 / rect.height;
    const lift = Math.max(0, (drag.y0 - e.clientY) * s * 1.6);
    const dx = (e.clientX - drag.x0) * s * (document.dir === 'rtl' ? 1 : 1);
    tipGoal.set(clampR(drag.base.x + dx, drag.base.z, 0.7).x, 0.12 + Math.min(lift, 1.55), clampR(drag.base.x + dx, drag.base.z, 0.7).z);
    lastUser = performance.now();
  });
  const end = (e) => { if (!drag || e.pointerId !== drag.id) return; drag = null; drop(); lastUser = performance.now(); };
  hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
  function onMass(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, p)) return null;
    if (Math.hypot(p.x, p.z) > 1.15) return null;
    return clampR(p.x, p.z, 0.7).setY(0.12);
  }

  // ── left alone: the chopsticks lift a bundle by themselves ───────────────────────────────────────────────────
  const auto = { on: !opt.still, t: -1.2, a: 0 };
  function autoplay(dt) {
    if (!auto.on) { if (!drag && performance.now() - lastUser > 7000 && !opt.still) { auto.on = true; auto.t = -0.5; } return; }
    auto.t += dt;
    const T = 6.2, t = auto.t % T;
    if (auto.t < 0) { tipGoal.copy(restTip); return; }
    if (t < dt * 1.5 && !held.length) { auto.a = Math.random() * Math.PI * 2; }
    const bx = Math.cos(auto.a) * 0.25, bz = Math.sin(auto.a) * 0.18 + 0.05;
    if (t < 0.7) tipGoal.set(bx, 0.12, bz);                                          // down into the bowl
    else if (t < 0.75) { if (!held.length) { tip.set(bx, 0.12, bz); grab(tip); } }
    else if (t < 2.2) { const u = ease((t - 0.75) / 1.45); tipGoal.set(bx + u * 0.08, 0.12 + u * 1.35, bz - u * 0.05); }
    else if (t < 3.8) { const w = t - 2.2; tipGoal.set(bx + 0.08 + Math.sin(w * 2.4) * 0.05, 1.47 + Math.sin(w * 3.1) * 0.035, bz - 0.05); }
    else if (t < 3.86) { if (held.length) drop(); }
    else tipGoal.copy(restTip);
  }

  // ── sizing, the loop ─────────────────────────────────────────────────────────────────────────────────────────
  function frame() {
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh;
    const narrow = w / hh < 0.8;
    const view = opt.view || (narrow ? { y: 3.5, z: 6.6, look: 0.62, x: 0 } : { y: 3.3, z: 7.4, look: 0.86, x: 0 });
    camera.position.set(view.x, view.y, view.z); camera.lookAt(view.x, view.look, 0);
    camera.setViewOffset?.(w, hh, (opt.shift || 0) * w, 0, w, hh);
    camera.updateProjectionMatrix();
  }
  frame();
  const ro = new ResizeObserver(frame); ro.observe(canvas);

  const goal = { bowl: glazeOut.color.clone(), sticks: stickMat.color.clone(), tint: uni.uTint.value.clone() };
  let last = performance.now(), acc = 0, raf = 0, visible = true, alive = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); });
  io.observe(canvas);
  function loop(now) {
    raf = 0; if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    autoplay(dt);
    const k = 1 - Math.pow(0.015, dt);
    glazeOut.color.lerp(goal.bowl, k); stickMat.color.lerp(goal.sticks, k); uni.uTint.value.lerp(goal.tint, k);
    tip.lerp(tipGoal, 1 - Math.pow(0.0008, dt));
    gap += (gapGoal - gap) * (1 - Math.pow(0.001, dt));
    acc += dt; let n = 0;
    while (acc >= h && n < 6) { step(); acc -= h; n++; }
    if (n === 6) acc = 0;
    writeTex();
    placeSticks();
    steam(dt);
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(loop);
  }
  function placeSticks() {
    const q = new THREE.Quaternion().setFromUnitVectors(UP, DIR);
    const side = new THREE.Vector3().crossVectors(DIR, new THREE.Vector3(0, 0, 1)).normalize();
    sticks.forEach((m, i) => {
      m.quaternion.copy(q);
      m.position.copy(tip).addScaledVector(side, (i ? 1 : -1) * gap * 0.5).add(new THREE.Vector3(0, 0.01, 0));
    });
  }
  function steam(dt) {
    const lifting = held.length ? 1 : 0.5;
    for (const m of puffs) {
      const u = m.userData; u.age += dt;
      if (u.age > u.life) { u.age = 0; const a = Math.random() * 6.28, r = Math.random() * 0.55; u.x = Math.cos(a) * r; u.z = Math.sin(a) * r; }
      const k = u.age / u.life;
      m.position.set(u.x + Math.sin(u.age * 0.9 + u.d) * 0.12 * k, 0.2 + k * 2.1, u.z + Math.cos(u.age * 0.7 + u.d) * 0.08);
      const s = 0.5 + k * 1.3; m.scale.set(s, s, s);
      m.material.opacity = Math.sin(Math.PI * k) * 0.13 * lifting;
    }
  }

  if (opt.still) puffs.forEach((m) => { m.visible = false; });
  if (opt.still) {                                                      // a still: lift once, settle, draw one frame
    tip.set(0.15, 0.12, 0.05); grab(tip); tip.set(0.2, 1.4, 0); tipGoal.copy(tip);
    for (let i = 0; i < 600; i++) step();
    writeTex(); placeSticks(); renderer.render(scene, camera);
  } else { writeTex(); placeSticks(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); }   // a first frame now, the loop after

  return {
    theme(t) {                                                          // a flavour's colours, eased in, and a lift to greet it
      if (t.bowl) goal.bowl.set(t.bowl);
      if (t.sticks) goal.sticks.set(t.sticks);
      if (t.tint) goal.tint.set(t.tint);
      if (!drag && !opt.still) { if (held.length) drop(); auto.on = true; auto.t = 0.35; }
    },
    destroy() { alive = false; ro.disconnect(); io.disconnect(); renderer.dispose(); },
    renderer, scene, camera,
  };
}

// ── helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────
function bowlProfile() {                     // two lathe profiles; each runs so the lathe's normals face the viewer
  const { R, CY, RIM, T } = BOWL, aMax = Math.acos((CY - RIM) / R);
  const outer = [new THREE.Vector2(0.0001, -0.6), new THREE.Vector2(0.36, -0.6), new THREE.Vector2(0.4, -0.64),
    new THREE.Vector2(0.45, -0.64), new THREE.Vector2(0.47, -0.58)];
  for (let i = 0; i <= 40; i++) {
    const a = 0.44 + (aMax - 0.44) * (i / 40);
    outer.push(new THREE.Vector2((R + T) * Math.sin(a), CY - (R + T) * Math.cos(a)));
  }
  const rx = R * Math.sin(aMax) + T / 2;
  for (let i = 1; i <= 10; i++) {            // the lip, over the top
    const a = (i / 10) * Math.PI;
    outer.push(new THREE.Vector2(rx + Math.cos(a) * T / 2, RIM + Math.sin(a) * T / 2));
  }
  const inner = [];
  for (let i = 40; i >= 0; i--) {
    const a = aMax * (i / 40);
    inner.push(new THREE.Vector2(Math.max(0.0001, R * Math.sin(a)), CY - R * Math.cos(a)));
  }
  return [outer, inner];
}

function tubeGeometry(NS, SEG, RAD, rand) {
  const per = (SEG + 1) * (RAD + 1), n = NS * per;
  const strand = new Float32Array(n), t = new Float32Array(n), ang = new Float32Array(n), seed = new Float32Array(n);
  const idx = [];
  for (let s = 0; s < NS; s++) {
    const sd = rand();
    for (let i = 0; i <= SEG; i++) for (let j = 0; j <= RAD; j++) {
      const v = s * per + i * (RAD + 1) + j;
      strand[v] = s; t[v] = i / SEG; ang[v] = (j / RAD) * Math.PI * 2; seed[v] = sd;
    }
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = s * per + i * (RAD + 1) + j, b = a + RAD + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aStrand', new THREE.BufferAttribute(strand, 1));
  g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  g.setAttribute('aAng', new THREE.BufferAttribute(ang, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setIndex(n > 65535 ? new THREE.BufferAttribute(new Uint32Array(idx), 1) : new THREE.BufferAttribute(new Uint16Array(idx), 1));
  return g;
}

function studio() {                          // a softbox room for the reflections (after three's RoomEnvironment)
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: 0x5a4c40, side: THREE.BackSide }));
  room.position.y = 2; s.add(room);
  const box = (w, h, x, y, z, c, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m);
  };
  box(6, 4, 0, 5.9, 0, 0xffffff, 0, Math.PI / 2);          // the big top light
  box(3, 5, -5.9, 2, 1, 0xfff0d8, Math.PI / 2);             // warm, left
  box(2, 5, 5.9, 2, -2, 0xc8d8ff, -Math.PI / 2);            // cool, right
  box(4, 1.2, 0, 1.5, -5.9, 0xffffff);                       // a strip behind
  return s;
}

function friedEgg() {                       // a sunny-side-up egg: an uneven white with a crisp edge, a glossy yolk
  const g = new THREE.Group();
  const w = new THREE.SphereGeometry(1, 96, 20), pa = w.attributes.position, cols = [];
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    const wob = 1 + 0.09 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7 + 2) + 0.025 * Math.sin(a * 17);
    const lift = y > 0 ? Math.pow(Math.max(0, 1 - rr), 1.6) * 0.05 : 0;
    pa.setXYZ(i, x * 0.4 * wob, y * 0.038 + lift, z * 0.37 * wob);
    const edge = Math.pow(Math.min(1, rr), 6);
    const c = new THREE.Color('#fffaf0').lerp(new THREE.Color('#c98a3c'), edge * 0.85);
    cols.push(c.r, c.g, c.b);
  }
  w.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); w.computeVertexNormals();
  g.add(new THREE.Mesh(w, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.3 })));
  const y = new THREE.Mesh(new THREE.SphereGeometry(0.115, 48, 24), new THREE.MeshPhysicalMaterial({
    color: 0xffa00e, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.5, sheenColor: new THREE.Color('#ffd27a') }));
  y.scale.set(1, 0.58, 1); y.position.set(0.05, 0.035, -0.02); g.add(y);
  return g;
}

function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  r.addColorStop(0, 'rgba(0,0,0,0.85)'); r.addColorStop(0.42, 'rgba(0,0,0,0.5)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 40 + Math.random() * 48, y = 40 + Math.random() * 48, r = 22 + Math.random() * 26;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function clampR(x, z, r) { const d = Math.hypot(x, z); const f = d > r ? r / d : 1; return new THREE.Vector3(x * f, 0, z * f); }
function ease(u) { u = Math.min(1, Math.max(0, u)); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
