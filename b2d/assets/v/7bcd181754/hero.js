// B2D — the opening, drawn live.
// Three lanes of unbranded vessels pass a gate of light at the plant's own rates: nothing here is
// animated by hand. A vessel's place is (wall clock × rate); the same clock drives the bar, the
// counters and the sound in site.js, so what you see, read and hear are one thing.
import * as THREE from './vendor/three.module.min.js';

const PITCH = { can: 0.8, carton: 1.3, glass: 1.5 };          // metres between two vessels, in scene units
const TINT = { can: 0xe6ecef, carton: 0xd9bb97, glass: 0xffffff };
const JUICE = [0xff9a1f, 0xffd23a, 0xe8413c, 0xff7f8a, 0xb7d53a, 0x7a2a5a];
const GAP = 1.75, SPAN = 18, GATE = 0;

const hash = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function lathe(points, seg = 32) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

function shapes() {
  const can = lathe([[0, 0.012], [0.24, 0.012], [0.3, 0.05], [0.33, 0.1], [0.33, 1.05], [0.315, 1.12], [0.275, 1.19],
    [0.285, 1.215], [0.265, 1.22], [0.255, 1.195], [0, 1.19]]);
  const carton = new THREE.BoxGeometry(0.52, 1.08, 0.36).translate(0, 0.54, 0);
  const straw = new THREE.CylinderGeometry(0.022, 0.022, 0.62, 8).translate(0, 0.31, 0).rotateZ(-0.42).translate(0.13, 1.02, 0.06);
  const bottle = lathe([[0, 0.01], [0.29, 0.01], [0.33, 0.05], [0.33, 0.8], [0.3, 0.94], [0.17, 1.14], [0.155, 1.3],
    [0.17, 1.31], [0.17, 1.37], [0, 1.37]]);
  const liquid = lathe([[0, 0.04], [0.295, 0.04], [0.3, 0.8], [0.275, 0.92], [0.15, 1.1], [0, 1.1]], 24);
  const cap = new THREE.CylinderGeometry(0.185, 0.185, 0.1, 24).translate(0, 1.39, 0);
  return { can, carton, straw, bottle, liquid, cap };
}

export function mount(canvas, { lines = [], bar = 2400, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.6 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x031917, 0.052);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 90);

  // the room the metal reflects: one warm softbox overhead, a teal wall, an amber wall
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x010807);
  const panel = (w, h, d, x, y, z, r, g, b) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) }));
    m.position.set(x, y, z); room.add(m);
  };
  panel(16, 0.2, 5, 0, 7, 1, 5.2, 4.8, 4.2);
  panel(0.2, 7, 12, -10, 2.5, 2, 0.25, 3.4, 3.0);
  panel(0.2, 6, 12, 10, 2.5, 2, 6.0, 3.1, 0.55);
  panel(12, 3, 0.2, 0, 2.5, 11, 1.2, 1.35, 1.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.03).texture;
  pmrem.dispose();

  const sun = new THREE.DirectionalLight(0xfff1dc, 1.5);
  sun.position.set(5, 7, 6);
  scene.add(sun, new THREE.AmbientLight(0x8fb8b0, 0.25));

  const geo = shapes();
  const mat = {
    can: new THREE.MeshStandardMaterial({ color: TINT.can, metalness: 1, roughness: 0.2, envMapIntensity: 1.35 }),
    carton: new THREE.MeshStandardMaterial({ color: TINT.carton, metalness: 0, roughness: 0.78 }),
    straw: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.45 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.24, envMapIntensity: 2.4, depthWrite: false }),
    liquid: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.32, envMapIntensity: 1.1 }),
    cap: new THREE.MeshStandardMaterial({ color: 0xd9dee2, metalness: 1, roughness: 0.3 }),
  };

  // a soft disc of light, used as fake bloom at each gate
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,190,90,1)'); rg.addColorStop(0.25, 'rgba(255,170,50,.5)'); rg.addColorStop(1, 'rgba(255,160,40,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const lanes = lines.map((line, i) => {
    const format = PITCH[line.format] ? line.format : 'can';
    const pitch = PITCH[format];
    const period = 3600 / line.perHour;                       // seconds between two vessels
    const count = Math.ceil((2 * SPAN) / pitch) + 2;
    const z = -i * GAP;
    const parts = [];
    const add = (g, m, order = 0) => {
      const mesh = new THREE.InstancedMesh(g, m, count);
      mesh.frustumCulled = false; mesh.renderOrder = order;
      mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      const mirror = new THREE.InstancedMesh(g, m, count);     // the floor's reflection: the same instances, upside down
      mirror.instanceMatrix = mesh.instanceMatrix; mirror.instanceColor = mesh.instanceColor;
      mirror.scale.y = -1; mirror.frustumCulled = false; mirror.renderOrder = -2;
      scene.add(mirror, mesh); parts.push(mesh); return mesh;
    };
    const lane = { format, pitch, period, speed: pitch / period, count, z, i };
    if (format === 'can') lane.body = add(geo.can, mat.can);
    if (format === 'carton') { lane.body = add(geo.carton, mat.carton); lane.straw = add(geo.straw, mat.straw); }
    if (format === 'glass') { lane.liquid = add(geo.liquid, mat.liquid); lane.cap = add(geo.cap, mat.cap); lane.body = add(geo.bottle, mat.glass, 2); }

    // the belt, two rails, and the gate: a ring of light the vessels pass through
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(2 * SPAN + 8, 0.86), new THREE.MeshBasicMaterial({ color: 0x0a2c28, transparent: true, opacity: 0.55 }));
    belt.rotation.x = -Math.PI / 2; belt.position.set(0, 0.004, z); belt.renderOrder = 1; scene.add(belt);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2 * SPAN + 8, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(TINT[format]).multiplyScalar(0.28) }));
      rail.position.set(0, 0.03, z + s * 0.45); scene.add(rail);
    }
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.5, 0.3) });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.016, 10, 72), ringMat);
    ring.rotation.y = Math.PI / 2; ring.scale.set(1, 1.3, 1); ring.position.set(GATE, 0.86, z); scene.add(ring);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }));
    glow.position.set(GATE, 0.8, z); glow.scale.set(2.6, 2.6, 1); glow.renderOrder = 3; scene.add(glow);
    const lamp = new THREE.PointLight(0xffb238, 4, 7, 2);
    lamp.position.set(GATE + 0.25, 1.1, z + 0.2); scene.add(lamp);
    Object.assign(lane, { ringMat, glow, lamp });
    return lane;
  });

  const depth = Math.max(0, lines.length - 1) * GAP;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshBasicMaterial({ color: 0x031917, transparent: true, opacity: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 0; scene.add(floor);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, depth + 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.25, 0.25) }));
  sill.position.set(GATE, 0.012, -depth / 2); scene.add(sill);

  const dummy = new THREE.Object3D(), col = new THREE.Color(), juice = new THREE.Color();
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);

  function place(T) {
    for (const L of lanes) {
      const travelled = T * L.speed;
      const k0 = Math.ceil((GATE + travelled - SPAN) / L.pitch);
      const since = T % L.period;
      const pulse = Math.exp(-since / Math.min(0.14, L.period * 0.5));
      for (let j = 0; j < L.count; j++) {
        const k = k0 + j;
        const x = GATE + travelled - k * L.pitch;
        const dx = x - GATE;
        const h = hash(k);
        const lit = 0.16 + 0.84 * smooth(-0.15, 0.55, dx);
        const flash = dx > 0 && dx < 0.9 ? (1 - dx / 0.9) * 0.9 : 0;
        dummy.position.set(x, 0, L.z);
        dummy.rotation.set(0, L.format === 'carton' ? (h - 0.5) * 0.14 : h * 6.283, 0);
        dummy.scale.set(1, 1, 1); dummy.updateMatrix();
        L.body.setMatrixAt(j, dummy.matrix);
        col.setScalar(lit + flash); L.body.setColorAt(j, col);
        if (L.straw) {
          const s = smooth(0.7, 1.2, dx);
          if (s > 0) { dummy.scale.set(1, s, 1); dummy.updateMatrix(); L.straw.setMatrixAt(j, dummy.matrix); col.setScalar(lit); L.straw.setColorAt(j, col); }
          else L.straw.setMatrixAt(j, hide);
        }
        if (L.liquid) {
          const f = smooth(-0.05, 0.5, dx);
          if (f > 0) {
            dummy.scale.set(1, f, 1); dummy.updateMatrix(); L.liquid.setMatrixAt(j, dummy.matrix);
            juice.setHex(JUICE[Math.floor(h * JUICE.length) % JUICE.length]).multiplyScalar(0.55 + 0.45 * lit + flash * 0.4);
            L.liquid.setColorAt(j, juice);
          } else L.liquid.setMatrixAt(j, hide);
          const c = smooth(0.9, 1.25, dx);
          if (c > 0) { dummy.scale.set(1, 1, 1); dummy.position.y = (1 - c) * 0.5; dummy.updateMatrix(); L.cap.setMatrixAt(j, dummy.matrix); col.setScalar(lit); L.cap.setColorAt(j, col); }
          else L.cap.setMatrixAt(j, hide);
        }
      }
      for (const key of ['body', 'straw', 'liquid', 'cap']) {
        const m = L[key]; if (!m) continue;
        m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      const p = L.period < 0.2 ? 0.55 + 0.25 * pulse : pulse;        // the can line is a roll, not single hits
      L.ringMat.color.setRGB(1.6 + 3.2 * p, 0.9 + 1.9 * p, 0.2 + 0.4 * p);
      L.glow.material.opacity = 0.28 + 0.55 * p; L.glow.scale.setScalar(2.2 + 1.3 * p);
      L.lamp.intensity = 3 + 26 * p;
    }
  }

  let W = 0, H = 0, scroll = 0, px = 0, py = 0, tx = 0, ty = 0;
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== W || h !== H) { W = w; H = h; renderer.setSize(w, h, false); }
    const aspect = w / h, tan = Math.tan((camera.fov * Math.PI) / 360);
    const span = Math.max(5, Math.min(15, 4.4 * aspect));              // how much lane the front row shows
    const dist = span / (2 * tan * aspect);
    const view = 2 * tan * dist;                                       // world height at that distance
    const tilt = (12 + 24 * scroll) * Math.PI / 180;
    const cx = GATE + span * 0.13;                                     // the gate sits left of centre
    camera.aspect = aspect;
    px += (tx - px) * 0.045; py += (ty - py) * 0.045;                 // the camera leans a little toward the pointer
    const sway = Math.sin(performance.now() / 5200) * span * 0.012;
    camera.position.set(cx + sway + px * span * 0.04, Math.sin(tilt) * dist * (1 + 0.25 * scroll) + 0.5 - py * 0.3, Math.cos(tilt) * dist * (1 + 0.25 * scroll) - depth * 0.35);
    camera.lookAt(cx, 0.6 - view * (aspect < 1 ? 0.03 : 0.075), -depth * 0.5);
    camera.updateProjectionMatrix();
    return true;
  }

  let raf = 0, live = false, seen = true, first = true;
  const wrap = bar * 1000;                                              // keep the clock small; a jump every 40 minutes
  function tick() {
    raf = 0;
    if (!live) return;
    if (frame()) {
      place((Date.now() % wrap) / 1000);
      renderer.render(scene, camera);
      if (first) { first = false; onReady && onReady(); }
    }
    raf = requestAnimationFrame(tick);
  }
  const sync = () => {
    const want = seen && !document.hidden;
    if (want && !live) { live = true; if (!raf) raf = requestAnimationFrame(tick); }
    if (!want) live = false;
  };
  const host = canvas.closest('[data-hero]') || canvas;
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { rootMargin: '80px' }).observe(host);
  document.addEventListener('visibilitychange', sync);
  addEventListener('scroll', () => { scroll = Math.min(1, Math.max(0, scrollY / (host.offsetHeight || 1))); }, { passive: true });
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); live = false; });
  sync();
  return { stop() { live = false; renderer.dispose(); } };
}
