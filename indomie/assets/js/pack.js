// The pack, drawn in code (docs/DESIGN.md §2): a glossy pillow pouch with crimped ends; its label is ours — the
// flavour's colour, the placeholder wordmark, the flavour's name and its own bowl — never a copy of the real pack.
// The client's pack scans replace the label later (claims: pack.art). Loaded only with WebGL2, after first paint.
import * as THREE from './three.module.min.js';

const W = 2.9, H = 2.05, SEAL = 0.11;                    // the pouch, landscape; the crimped seal at each end (of half-height)
const TW = 2048, TH = Math.round(TW * H / W);

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function pouch() {
  const g = new THREE.PlaneGeometry(W, H, 120, 84);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), u = x / (W / 2), v = y / (H / 2);
    const side = Math.pow(Math.max(0, 1 - u * u), 0.42);                      // the folds at the sides
    const body = smooth(1 - SEAL, 1 - SEAL - 0.32, Math.abs(v));               // the puff, gone at the seals
    let z = 0.34 * side * body;
    if (Math.abs(v) > 1 - SEAL) z += 0.006 * Math.sin(x * 70);                 // the crimp's ridges
    z += 0.008 * Math.sin(x * 5.1 + y * 3.3) * body;                           // a little life in the film
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

function waves(g, w, h, color, alpha, step, amp, lw) {
  g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  for (let y = -step; y < h + step; y += step) {
    g.beginPath();
    for (let x = -40; x <= w + 40; x += 8) g.lineTo(x, y + Math.sin(x / 34) * amp);
    g.stroke();
  }
  g.restore();
}

function label(f, bowl, lang, back) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d');
  const rtl = lang === 'ar';
  g.fillStyle = f.bg; g.fillRect(0, 0, TW, TH);
  waves(g, TW, TH, f.deep, 0.45, 70, 16, 10);
  const seal = TH * SEAL / 2;                                                  // the crimp bands, top and bottom
  g.fillStyle = f.deep; g.fillRect(0, 0, TW, seal); g.fillRect(0, TH - seal, TW, seal);
  g.fillStyle = 'rgba(255,255,255,.18)';
  for (let x = 0; x < TW; x += 14) { g.fillRect(x, 0, 5, seal); g.fillRect(x, TH - seal, 5, seal); }
  const brand = rtl ? 'إندومي' : 'Indomie';
  if (!back) {
    // the bowl, big, off the edge
    const S = TH * 0.98, bx = rtl ? -S * 0.18 : TW - S * 0.82, by = TH * 0.06;
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 60; g.shadowOffsetY = 30;
    g.drawImage(bowl, bx, by, S, S); g.restore();
    // the wordmark (a placeholder until the client's file arrives)
    g.save(); g.translate(rtl ? TW - 120 : 120, seal + 70); g.rotate(rtl ? 0.05 : -0.05);
    g.font = '900 210px Rubik'; g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = rtl ? 'right' : 'left'; g.textBaseline = 'top';
    const bw = g.measureText(brand).width + 120;
    g.fillStyle = '#D40203'; g.beginPath(); g.roundRect(rtl ? -bw : 0, 0, bw, 260, 130); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillText(brand, rtl ? -60 : 60, rtl ? 6 : 26); g.restore();
    // the flavour's name
    g.save(); g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = rtl ? 'right' : 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = f.fg; g.font = `900 ${rtl ? 250 : 270}px Rubik`;
    g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 0; g.shadowOffsetY = 12;
    g.fillText(f.name, rtl ? TW - 130 : 130, TH - seal - 150); g.restore();
    // a burst
    const bxc = rtl ? 520 : TW - 520, byc = TH - seal - 300;
    g.save(); g.translate(bxc, byc); g.rotate(-0.2); g.fillStyle = '#FFC629'; g.beginPath();
    for (let i = 0; i < 28; i++) { const r = i % 2 ? 150 : 185, a = i / 28 * Math.PI * 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.fillStyle = '#D40203'; g.font = '900 64px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(rtl ? 'نودلز' : 'NOODLES', 0, 4); g.restore();
  } else {
    waves(g, TW, TH, f.fg, 0.12, 140, 30, 26);
    g.font = '900 300px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = f.fg; g.globalAlpha = 0.9;
    g.fillText(brand, TW / 2, TH / 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function studio(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x302826, side: THREE.BackSide }));
  env.add(room);
  const box = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(10, 6, -6, 7, 8, 3.2);     // the key, high and left
  box(3, 12, 9, 0, 4, 1.8);      // a strip on the right
  box(12, 3, 0, -8, 6, 0.7);     // a low fill
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(env, 0.035).texture;
}

export async function createPack(canvas, flavours, lang) {
  await document.fonts.ready;
  const bowls = await Promise.all(flavours.map(f => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = f.bowl; })));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50); camera.position.set(0, 0, 8.4);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-3, 4, 5); scene.add(key);
  const fronts = flavours.map((f, i) => label(f, bowls[i], lang, false));
  const backs = flavours.map((f, i) => label(f, bowls[i], lang, true));
  const mat = () => new THREE.MeshPhysicalMaterial({ roughness: 0.34, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.1 });
  const front = new THREE.Mesh(pouch(), mat()), back = new THREE.Mesh(pouch().rotateY(Math.PI), mat());
  const pack = new THREE.Group(); pack.add(front, back); scene.add(pack);
  const holder = new THREE.Group(); holder.add(pack); holder.rotation.z = lang === 'ar' ? 0.12 : -0.12; scene.add(holder);
  let cur = 0, spin = null;
  const apply = i => { front.material.map = fronts[i]; back.material.map = backs[i]; front.material.needsUpdate = back.material.needsUpdate = true; };
  apply(0);
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  };
  resize(); addEventListener('resize', resize);
  let px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  const t0 = performance.now();
  canvas.style.opacity = 0; canvas.style.transition = 'opacity .8s';
  requestAnimationFrame(() => { canvas.style.opacity = 1; });
  const loop = now => {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = (now - t0) / 1000;
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    let extra = 0;
    if (spin) {
      const k = Math.min(1, (now - spin.t) / 1100);
      const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      extra = e * Math.PI * 2;
      if (!spin.swapped && e > 0.25) { apply(spin.to); spin.swapped = true; }
      if (k >= 1) spin = null;
    }
    pack.rotation.y = Math.sin(t * 0.55) * 0.38 + px * 0.6 + extra;
    pack.rotation.x = Math.sin(t * 0.4) * 0.08 + py * 0.3;
    pack.position.y = Math.sin(t * 0.9) * 0.07;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);
  return {
    show(i) {
      if (i === cur || i < 0) return;
      cur = i;
      spin = { t: performance.now(), to: i, swapped: false };
    },
  };
}
