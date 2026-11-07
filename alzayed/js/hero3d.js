/* ALZAYED v2 — the monogram in brass (7 Nov 2026, Mazhar: "something that will make them mindblown").
   The A and the Z are the brand's own outlines (the inline monogram-parts SVG), extruded and bevelled, lit like the film
   behind them: a warm key from the window on the left. They arrive from two sides and meet; the pointer turns them; the
   scroll tips them away. Without WebGL 2, or with reduced motion, the flat brass SVG stays — nothing depends on this. */
let THREE, SVGLoader;

const hero = document.querySelector(".hero");
const mark = document.querySelector(".hero__mark");
const svg = mark && mark.querySelector("svg.monogram-parts");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const gl2 = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch (_) { return false; } })();

const saveData = navigator.connection && navigator.connection.saveData;
if (hero && mark && svg && !reduced && gl2 && !saveData) {
  // three.js is fetched only here, when it will be drawn
  Promise.all([import("three"), import("/alzayed/vendor/SVGLoader.js")])
    .then(([t, s]) => { THREE = t; SVGLoader = s.SVGLoader; start(); })
    .catch(() => {});      // the flat brass mark stays
}

// what the brass reflects: a warm dome (deep brown below, cream above) and two softboxes, the window's and a fill's
function warmStudio() {
  const env = new THREE.Scene();
  const dome = new THREE.SphereGeometry(500, 48, 24);
  const top = new THREE.Color(0xfff0d2), mid = new THREE.Color(0x7c6442), low = new THREE.Color(0x1a0a06);
  const col = [], pos = dome.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 500, c = y > 0 ? mid.clone().lerp(top, Math.pow(y, 0.8)) : mid.clone().lerp(low, Math.min(1, -y * 1.6));
    col.push(c.r, c.g, c.b);
  }
  dome.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  env.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, x, y, z, c, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(260, 180, -260, 220, 260, 0xffe0b0, 6);   // the window, upper left and in front
  box(200, 120, 300, 60, 200, 0xffd59a, 2.5);   // a warm fill from the right
  box(400, 60, 0, 300, -200, 0xfff3dc, 3);      // a strip above and behind, for the edges
  return env;
}

function start() {
  const canvas = document.createElement("canvas");
  canvas.className = "hero__brass";
  canvas.setAttribute("aria-hidden", "true");
  mark.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(warmStudio(), 0.03, 0.1, 2000).texture;   // the capture reaches the dome at 500

  const key = new THREE.DirectionalLight(0xffd29a, 4.2);     // the window's warm light, from the upper left
  key.position.set(-120, 90, 140);
  const rim = new THREE.DirectionalLight(0x9a6b45, 1.1);      // a low warm rim from the right
  rim.position.set(140, -40, -60);
  const fill = new THREE.DirectionalLight(0xffe7c2, 1.6);    // a soft fill from the viewer, so the faces read as metal
  fill.position.set(0, 20, 300);
  scene.add(key, rim, fill, new THREE.AmbientLight(0x4a2a18, 0.8));

  const brass = new THREE.MeshPhysicalMaterial({
    color: 0xecd08f, metalness: 1, roughness: 0.2, clearcoat: 0.45, clearcoatRoughness: 0.14, envMapIntensity: 1.6,
  });

  // the letters, from the very SVG on the page
  const data = new SVGLoader().parse(svg.outerHTML);
  const vb = svg.viewBox.baseVal;
  const letters = {};
  for (const p of data.paths) {
    const cls = (p.userData && p.userData.node && p.userData.node.getAttribute("class")) || "";
    const geo = new THREE.ExtrudeGeometry(SVGLoader.createShapes(p), {
      depth: 9, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.55, bevelSegments: 6, curveSegments: 22,
    });
    geo.scale(1, -1, 1);                                        // SVG's y runs down
    geo.translate(-vb.width / 2, vb.height / 2, -4.5);
    const mesh = new THREE.Mesh(geo, brass);
    const g = new THREE.Group(); g.add(mesh);
    letters[cls.includes("m-z") ? "z" : "a"] = g;
  }
  const mono = new THREE.Group();
  if (letters.a) mono.add(letters.a);
  if (letters.z) mono.add(letters.z);
  scene.add(mono);

  const camera = new THREE.PerspectiveCamera(28, 1, 1, 3000);
  camera.position.set(0, 0, 520);

  // size: the brass mark is exactly as wide as the flat one it replaces
  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const pxPerUnit = h / visH;
    const s = svg.getBoundingClientRect().width / (vb.width * pxPerUnit);
    mono.scale.setScalar(s);
  };
  fit();
  addEventListener("resize", fit);

  // the pointer turns the mark; the scroll tips it away
  let tx = 0, ty = 0, rx = 0, ry = 0;
  addEventListener("pointermove", e => {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(hero);

  const t0 = performance.now();
  const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  let raf = 0, shown = false;
  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    const k = ease((t - 0.15) / 1.9);                         // the meeting
    if (letters.a) { letters.a.position.x = -46 * (1 - k); letters.a.rotation.y = -0.9 * (1 - k); }
    if (letters.z) { letters.z.position.x = 46 * (1 - k); letters.z.rotation.y = 0.9 * (1 - k); }
    rx += (ty * 0.22 - rx) * 0.06;
    ry += (tx * 0.38 - ry) * 0.06;
    const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.8)));
    mono.rotation.y = ry + Math.sin(t * 0.45) * 0.08 * k;
    mono.rotation.x = rx + p * 0.7;
    mono.position.y = p * 40;
    canvas.style.opacity = String(Math.max(0, Math.min(1, k * 1.4) * (1 - p * 1.3)));
    key.position.x = -120 + Math.sin(t * 0.3) * 40;           // the window light drifting, as in the film
    renderer.render(scene, camera);
    if (!shown && k > 0.05) { shown = true; hero.classList.add("has-brass"); }
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });
  loop();
}
