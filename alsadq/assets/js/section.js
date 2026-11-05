// section.js: the section drawing behind the hero and the six areas of work.
//
// One scene in world units: the ground is y = 0 and depth is +y. Above the line, what a community sees (white by day);
// below it, what AlSadq builds (their navy). A camera moves between the stations as the page scrolls; water, wastewater
// and solar power flow along their own lines; the well's length is drawn with a break, as drawings do. Every label a
// person reads is HTML (the callouts) — the canvas draws levels in figures only, the same in both languages.

const RM = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

const K = {
  navy: [0, 19, 42], white: [255, 255, 255], mist: [233, 237, 242], silver: [197, 201, 207],
  nightSky: [8, 26, 50], nightLine: [206, 218, 232], nightFace: [14, 38, 68], nightShade: [20, 48, 82],
  glass: [214, 224, 235], nightGlass: [27, 55, 90],
  water: [56, 195, 240], waste: [205, 170, 107], power: [255, 178, 63], lamp: [255, 205, 120],
  pipe: [16, 52, 92], pipeIn: [5, 28, 55],
};
// strata, top to bottom: navy shades getting deeper; the aquifer carries the water colour
const STRATA = [[0, 34, [12, 40, 72]], [34, 230, [7, 33, 62]], ["clay", [4, 27, 53]], ["rock", [3, 23, 46]],
                ["aq", [4, 34, 62]], ["bed", [2, 17, 36]]];

// ── the scene ─────────────────────────────────────────────────────────────────────────────────────────────────
const X = { plant: [30, 315], registry: [340, 580], school: [620, 1000], bakery: [1060, 1270], tank: [1525, 1655],
            array: [1690, 1900], cabinet: [1905, 1950], well: 1985, lights: [600, 1030, 1340, 1470] };
const SUN = [1790, -455];
const WORLD_W = 2060;

// what each station looks at, and which groups it lights; the rest of the drawing dims
const FOCUS = {
  solar:      { rect: [1250, -585, 2050, 40], groups: ["array", "lights", "sun", "cable"], parts: ["array", "light"] },
  civil:      { rect: [300, -300, 1290, 34], groups: ["registry", "school", "bakery"], parts: ["school", "bakery", "registry"] },
  equipment:  { rect: [1690, -230, 2040, 190], groups: ["cabinet", "wellhead", "cable", "valve"], parts: ["cabinet", "wellhead"] },
  water:      { rect: [560, -440, 1700, 120], groups: ["tank", "main", "lift"], parts: ["tank", "main"] },
  sanitation: { rect: [0, -110, 1300, 230], groups: ["sewer", "manholes", "plant", "treated"], parts: ["sewer", "manhole", "plant"] },
  wells:      { rect: null, groups: ["casing", "pump", "aquifer", "lift", "wellhead"], parts: ["casing", "pump", "aquifer"] },
};
const GROUPS = ["sky", "sun", "ridge", "plant", "registry", "school", "bakery", "lights", "tank", "array", "cabinet",
                "wellhead", "valve", "casing", "pump", "aquifer", "main", "lift", "sewer", "manholes", "treated", "cable"];

function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
function pointAt(p, d) {
  const { pts, cum } = p;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const t = (d - cum[lo]) / Math.max(cum[hi] - cum[lo], 1e-6);
  return [lerp(pts[lo][0], pts[hi][0], t), lerp(pts[lo][1], pts[hi][1], t)];
}

export function initSection(stage, opts = {}) {
  const canvas = stage.querySelector("canvas");
  const M = document.documentElement.dir === "rtl" ? -1 : 1;   // the Arabic page reads the drawing mirrored
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  const track = stage.parentElement.querySelector(".track");
  const stations = [...track.querySelectorAll("[data-k]")];
  const callouts = Object.fromEntries([...stage.querySelectorAll(".callout")].map((el) => [el.dataset.part, el]));
  const tag = stage.querySelector(".tag");
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;height:var(--ground);width:1px;top:0";
  stage.appendChild(probe);

  let W = 0, H = 0, dpr = 1, mobile = false, ground = 0, D = 600;
  let paths = {}, flows = [], keys = {}, patterns = {};
  let night = 0, nightTarget = 0, reveal = RM.matches ? 1 : 0, t0 = performance.now(), last = t0, clock = 0;
  let hover = null, running = false, visible = true, drawn = false, drewAt = 0;

  // ── layout: the hero's camera and every station's, from the viewport ──────────────────────────────────────
  function layout() {
    const r = stage.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    mobile = W < 900;
    ground = probe.getBoundingClientRect().height || H * (mobile ? .4 : .5);
    const crop = mobile ? [600, WORLD_W + 10] : [-10, WORLD_W + 10];
    // the drawing fills the width unless the sky above the town cannot hold the eyebrow and the headline's first line:
    // then it shrinks to the sky there is (a short laptop window), the town centred
    const h1h = document.querySelector(".hero .h1a")?.getBoundingClientRect().height || 0;
    const sky = ground - (mobile ? 56 : 72) - 34 - h1h - 22;
    const s0 = Math.max(.12, Math.min(W / (crop[1] - crop[0]), sky / 252));
    D = Math.max(460, (H - 70 - ground) / s0);          // the aquifer sits at the foot of the first screen
    keys.hero = { s: s0, cx: (crop[0] + crop[1]) / 2, cy: 0, ax: W / 2, ay: ground };
    keys.manifesto = { ...keys.hero, ay: ground - H * .22 };
    keys.areas = { ...keys.hero, ay: ground - H * .12 };
    const scr = mobile ? [W * .04, H * .1, W * .96, H * .5] : M > 0 ? [W * .43, H * .12, W * .97, H * .92] : [W * .03, H * .12, W * .57, H * .92];
    const fit = (rc) => {
      const s = Math.min((scr[2] - scr[0]) / (rc[2] - rc[0]), (scr[3] - scr[1]) / (rc[3] - rc[1]));
      return { s, cx: (rc[0] + rc[2]) / 2, cy: (rc[1] + rc[3]) / 2, ax: (scr[0] + scr[2]) / 2, ay: (scr[1] + scr[3]) / 2 };
    };
    for (const [k, f] of Object.entries(FOCUS)) {
      let rc = f.rect;
      if (k === "wells") rc = mobile ? [X.well - 150, D - 260, X.well + 70, D + 170] : [X.well - 130, -60, X.well + 60, D + 170];
      keys[k] = fit(rc);
    }
    buildPaths();
    // the hero's two lines sit either side of the ground; tell the page how tall the town is under the first line
    const h1a = document.querySelector(".hero .h1a");
    if (h1a) {
      const b = h1a.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const x0 = b.left - sr.left, x1 = b.right - sr.left, k = keys.hero;
      const toX = (x) => (x - k.cx) * k.s * M + k.ax;
      let top = 0;
      for (const [x0w, x1w, hw] of SKYLINE) {
        const a = Math.min(toX(x0w), toX(x1w)), b = Math.max(toX(x0w), toX(x1w));
        if (b > x0 - 6 && a < x1 + 6) top = Math.max(top, hw);
      }
      root.style.setProperty("--town-h", `${Math.round(top * k.s)}px`);
    }
    root.style.setProperty("--band-h", `${Math.round(158 * keys.hero.s + (mobile ? 10 : 12))}px`);
    // the legend and the cue stand clear of the well casing, wherever the hero's scale puts it
    const wx = (X.well - keys.hero.cx) * keys.hero.s * M + keys.hero.ax;
    root.style.setProperty("--well-gap", `${Math.round(M > 0 ? W - wx : wx)}px`);
    makePatterns();
    frame(true);
  }

  // heights of everything above the ground, for the headline: [x0, x1, height]
  const SKYLINE = [[30, 315, 70], [340, 580, 252], [620, 1000, 222], [1060, 1270, 240], [1525, 1655, 424],
                   [1690, 1900, 96], [1905, 1950, 66], ...X.lights.map((x) => [x - 18, x + 26, 176]), [SUN[0] - 64, SUN[0] + 64, 525]];

  function buildPaths() {
    const w = X.well, lv = 28, mainY = 50;
    paths = {
      lift: polyline([[w, D + 22], [w, lv], [1580, lv], [1580, -292]]),
      supply: [
        polyline([[1600, -292], [1600, mainY], [1160, mainY], [1160, -6]]),
        polyline([[1600, -292], [1600, mainY], [900, mainY], [900, -6]]),
        polyline([[1600, -292], [1600, mainY], [700, mainY], [700, -6]]),
        polyline([[1600, -292], [1600, mainY], [460, mainY], [460, -6]]),
      ],
      sewer: [
        polyline([[1215, 0], [1185, 110], [340, 146], [300, 146], [90, 146], [90, 70]]),
        polyline([[955, 0], [935, 121], [340, 146], [300, 146], [90, 146], [90, 70]]),
        polyline([[675, 0], [700, 133], [340, 146], [300, 146], [90, 146], [90, 70]]),
        polyline([[525, 0], [505, 139], [340, 146], [300, 146], [90, 146], [90, 70]]),
      ],
      treated: polyline([[195, 64], [195, 92], [-900, 92]]),
      cable: polyline([[1722, -4], [1792, -4], [1862, -4], [1928, -4], [1928, 10], [w + 12, 10], [w + 12, D + 30]]),
      rays: [1722, 1792, 1862].map((x) => polyline([[SUN[0] - 30, SUN[1] + 30], [x + 34, -70]])),
    };
    flows = [
      { g: "lift", p: [paths.lift], c: K.water, v: 120, gap: 46, dash: 16, w: 2.2, solar: true },
      { g: "main", p: paths.supply, c: K.water, v: 90, gap: 52, dash: 16, w: 2.2 },
      { g: "sewer", p: paths.sewer, c: K.waste, v: 60, gap: 58, dash: 14, w: 2.2 },
      { g: "treated", p: [paths.treated], c: K.water, v: 70, gap: 54, dash: 14, w: 2.2 },
      { g: "cable", p: [paths.cable], c: K.power, v: 170, gap: 40, dash: 8, w: 1.8, solar: true },
      { g: "sun", p: paths.rays, c: K.power, v: 110, gap: 90, dash: 10, w: 1.1, solar: true, sky: true, bare: true },
    ];
  }

  // hatches drawn once at screen scale: earth, fill, clay, limestone (bricks, as geology draws it), bedrock
  function makePatterns() {
    const mk = (size, draw) => {
      const c = document.createElement("canvas"); c.width = c.height = size * dpr;
      const g = c.getContext("2d"); g.scale(dpr, dpr); g.strokeStyle = g.fillStyle = "rgba(255,255,255,1)"; g.lineWidth = 1;
      draw(g, size); return ctx.createPattern(c, "repeat");
    };
    patterns = {
      earth: mk(18, (g) => { g.globalAlpha = .55; for (const [x, y] of [[2, 6], [11, 14], [8, 3]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y - 3); g.stroke(); } }),
      fill: mk(14, (g) => { g.globalAlpha = .5; for (const [x, y] of [[3, 4], [10, 9], [6, 12]]) { g.beginPath(); g.arc(x, y, .9, 0, 7); g.fill(); } }),
      clay: mk(22, (g) => { g.globalAlpha = .45; g.beginPath(); g.moveTo(2, 6); g.lineTo(12, 6); g.moveTo(14, 17); g.lineTo(21, 17); g.stroke(); }),
      rock: mk(28, (g) => { g.globalAlpha = .42; g.beginPath(); g.rect(.5, .5, 28, 14); g.moveTo(14, 14.5); g.lineTo(14, 28); g.stroke(); }),
      bed: mk(14, (g) => { g.globalAlpha = .35; g.beginPath(); g.moveTo(0, 14); g.lineTo(14, 0); g.moveTo(0, 0); g.lineTo(14, 14); g.stroke(); }),
    };
  }

  // ── the camera, from the scroll ────────────────────────────────────────────────────────────────────────────
  function stationState() {
    const mid = H / 2;
    const centres = stations.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; });
    let i = 0;
    while (i < centres.length - 1 && centres[i + 1] <= mid) i++;
    let f = 0;
    if (i < centres.length - 1) f = clamp((mid - centres[i]) / (centres[i + 1] - centres[i]));
    if (centres[0] > mid) f = 0;
    const e = RM.matches ? (f < .5 ? 0 : 1) : ease(clamp((f - .18) / .64));
    return { a: stations[i].dataset.k, b: stations[Math.min(i + 1, stations.length - 1)].dataset.k, e };
  }
  function camera(st) {
    const A = keys[st.a], B = keys[st.b], e = st.e;
    return { s: Math.exp(lerp(Math.log(A.s), Math.log(B.s), e)), cx: lerp(A.cx, B.cx, e), cy: lerp(A.cy, B.cy, e),
             ax: lerp(A.ax, B.ax, e), ay: lerp(A.ay, B.ay, e) };
  }
  function weightsFor(k) {
    const w = {};
    if (FOCUS[k]) { for (const g of GROUPS) w[g] = .2; for (const g of FOCUS[k].groups) w[g] = 1; w.sky = 1; }
    else for (const g of GROUPS) w[g] = k === "hero" ? 1 : .42;
    return w;
  }

  // ── drawing helpers ────────────────────────────────────────────────────────────────────────────────────────
  let cam, A, S;
  const px = (n) => n / cam.s;
  const lineA = () => mix(K.navy, K.nightLine, night);
  const faceA = () => mix(K.white, K.nightFace, night);
  const shadeA = () => mix(K.mist, K.nightShade, night);
  const glassA = () => mix(K.glass, K.nightGlass, night);
  function box(x, y, w, h, fill, stroke = lineA(), lw = 1.3) {
    ctx.beginPath(); ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = rgba(fill); ctx.fill(); }
    if (stroke) { ctx.strokeStyle = rgba(stroke); ctx.lineWidth = px(lw); ctx.stroke(); }
  }
  function line(pts, c, lw = 1, a = 1, dash) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = rgba(c, a); ctx.lineWidth = px(lw);
    ctx.setLineDash(dash ? dash.map(px) : []); ctx.stroke(); ctx.setLineDash([]);
  }
  function pipe(p, d, body = K.pipe) {
    ctx.lineJoin = "round"; ctx.lineCap = "butt";
    line(p.pts, [255, 255, 255], d * cam.s + 2.2, .32);
    line(p.pts, body, d * cam.s, 1);
    line(p.pts, K.pipeIn, Math.max(d * cam.s - 2.4, .6), 1);
  }
  function windows(x0, x1, y, h, n, w) {
    const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + step * i + (step - w) / 2;
      box(x, y, w, h, glassA(), lineA(), 1);
      line([[x + w * .25, y + h * .8], [x + w * .7, y + h * .2]], [255, 255, 255], 1, .55 * (1 - night));
    }
  }
  function alpha(g) { ctx.globalAlpha = (A[g] ?? 1); }

  // ── the frame ──────────────────────────────────────────────────────────────────────────────────────────────
  function frame(force) {
    if (!W) return;
    const now = performance.now();
    drewAt = now;
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!RM.matches) clock += dt;
    night += (nightTarget - night) * (RM.matches ? 1 : Math.min(1, dt * 2.6));
    if (Math.abs(nightTarget - night) < .002) night = nightTarget;
    if (!RM.matches && reveal < 1) reveal = clamp((now - t0) / 1900);
    const st = stationState();
    cam = camera(st);
    const wa = weightsFor(st.a), wb = weightsFor(st.b);
    A = {}; for (const g of GROUPS) A[g] = lerp(wa[g], wb[g], st.e);
    S = st;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    const gy = (0 - cam.cy) * cam.s + cam.ay;       // the ground line on screen
    const sky = mix(K.white, K.nightSky, night);
    ctx.fillStyle = rgba(sky); ctx.fillRect(0, 0, canvas.width, Math.max(0, gy * dpr));
    ctx.fillStyle = rgba(K.navy); ctx.fillRect(0, Math.max(0, gy * dpr), canvas.width, canvas.height);

    ctx.setTransform(dpr * cam.s * M, 0, 0, dpr * cam.s, dpr * (cam.ax - cam.cx * cam.s * M), dpr * (cam.ay - cam.cy * cam.s));
    const wa_ = cam.cx + (0 - cam.ax) / (cam.s * M), wb_ = cam.cx + (W - cam.ax) / (cam.s * M);
    const vx0 = Math.min(wa_, wb_) - 40, vx1 = Math.max(wa_, wb_) + 40;
    const vy1 = cam.cy + (H - cam.ay) / cam.s + 40;

    drawGrid(vx0, vx1, gy);
    drawStrata(vx0, vx1, vy1);
    // above the ground: rises out of it on the first load
    ctx.save();
    ctx.beginPath(); ctx.rect(vx0, -900 * reveal - 2, vx1 - vx0, 900 * reveal + 2); ctx.clip();
    drawRidge(vx0, vx1); drawSun(); drawPlant(); drawRegistry(); drawSchool(); drawBakery(); drawLights(); drawTank();
    drawArray(); drawCabinet();
    ctx.restore();
    // the ground line, drawn left to right
    ctx.globalAlpha = 1;
    const gx1 = lerp(vx0, vx1, reveal);
    line([[vx0, 0], [gx1, 0]], mix(K.navy, [150, 172, 200], night), 2.4);
    line([[vx0, px(2.2)], [gx1, px(2.2)]], [255, 255, 255], 1, .28);
    // below the ground
    const under = clamp((reveal - .35) / .65);
    ctx.globalAlpha = under;
    drawUnder();
    drawFlows(under);
    drawNightGlow();
    ctx.globalAlpha = 1;
    drawLevels(gy);
    placeCallouts(st);
    if (!drawn) { drawn = true; root.dataset.drawn = "yes"; }
  }

  function drawGrid(vx0, vx1) {
    const a = (1 - night) * .045 + night * .05;
    ctx.globalAlpha = A.sky;
    const c = night > .5 ? [255, 255, 255] : K.navy;
    for (let x = Math.floor(vx0 / 100) * 100; x < vx1; x += 100) line([[x, -1200], [x, 0]], c, 1, a);
    for (let y = -100; y > -1200; y -= 100) line([[vx0, y], [vx1, y]], c, 1, a);
  }

  function drawStrata(vx0, vx1, vy1) {
    const yClay = 230, yBreak0 = D * .44, yBreak1 = D * .56, yAq = D + 60, yBed = D + 190;
    const bands = [[0, 34, STRATA[0][2], "earth", .2], [34, yClay, STRATA[1][2], "fill", .16], [yClay, yBreak0, STRATA[2][1], "clay", .13],
                   [yBreak1, yAq, STRATA[3][1], "rock", .075], [yAq, yBed, STRATA[4][1], null, 0], [yBed, Math.max(vy1, yBed + 10), STRATA[5][1], "bed", .09]];
    ctx.globalAlpha = 1;
    for (const [a, b, c, pat, pa] of bands) {
      if (b < a) continue;
      ctx.fillStyle = rgba(c); ctx.fillRect(vx0, a, vx1 - vx0, b - a);
      if (pat && patterns[pat]) {
        const p = patterns[pat];
        p.setTransform(new DOMMatrix([1 / cam.s, 0, 0, 1 / cam.s, 0, 0]));
        ctx.globalAlpha = pa; ctx.fillStyle = p; ctx.fillRect(vx0, a, vx1 - vx0, b - a); ctx.globalAlpha = 1;
      }
    }
    // the break: the casing's length omitted between two zig-zags, the strata between them left plain
    ctx.fillStyle = rgba([3, 25, 50]); ctx.fillRect(vx0, yBreak0, vx1 - vx0, yBreak1 - yBreak0);
    for (const y of [yBreak0, yBreak1]) {
      const pts = []; const step = px(22);
      for (let x = vx0, i = 0; x < vx1; x += step, i++) pts.push([x, y + (i % 2 ? px(4) : -px(4))]);
      line(pts, [255, 255, 255], 1, .22);
    }
    // the aquifer: water held in the rock, moving slowly
    alpha("aquifer");
    ctx.fillStyle = rgba(K.water, .07); ctx.fillRect(vx0, yAq, vx1 - vx0, yBed - yAq);
    const ph = clock * .7;
    for (let r = 0; r < 5; r++) {
      const y = yAq + 18 + r * ((yBed - yAq - 30) / 4);
      ctx.beginPath();
      for (let x = vx0; x < vx1; x += px(10)) {
        const yy = y + Math.sin(x * .03 + ph + r) * px(2.6);
        if (x === vx0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = rgba(K.water, .22 + .1 * Math.sin(ph + r)); ctx.lineWidth = px(1); ctx.stroke();
    }
    line([[vx0, yAq], [vx1, yAq]], K.water, 1, .35, [6, 6]);
    ctx.globalAlpha = 1;
  }

  function drawRidge(vx0, vx1) {
    alpha("ridge");
    const pts = [];
    for (let x = vx0; x < vx1; x += 14) pts.push([x, -86 - 46 * (.5 + .5 * Math.sin(x * .0021 + 1.2)) - 22 * Math.sin(x * .0067) - 10 * Math.sin(x * .017)]);
    line(pts, mix(K.navy, [255, 255, 255], night), 1, .16 + night * .06);
  }

  function drawSun() {
    alpha("sun");
    const [x, y] = SUN, day = 1 - night;
    if (day > .02) {
      ctx.globalAlpha = A.sun * day;
      ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.fillStyle = rgba([255, 244, 222]); ctx.fill();
      ctx.strokeStyle = rgba(K.power); ctx.lineWidth = px(1.6); ctx.stroke();
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2 + clock * .05;
        line([[x + Math.cos(a) * 52, y + Math.sin(a) * 52], [x + Math.cos(a) * (i % 2 ? 60 : 68), y + Math.sin(a) * (i % 2 ? 60 : 68)]], K.power, 1.2, .9);
      }
    }
    if (night > .02) {
      ctx.globalAlpha = A.sun * night;
      ctx.beginPath(); ctx.arc(x, y, 30, Math.PI * .35, Math.PI * 1.65); ctx.arc(x + 12, y - 4, 26, Math.PI * 1.62, Math.PI * .38, true);
      ctx.closePath(); ctx.fillStyle = rgba([220, 230, 242], .9); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlant() {
    alpha("plant");
    const L = lineA();
    for (const [x0, x1, c] of [[30, 130, K.waste], [145, 245, K.water]]) {
      ctx.beginPath(); ctx.moveTo(x0, -16); ctx.lineTo(x0, 30); ctx.lineTo(x0 + 22, 82); ctx.lineTo(x1 - 22, 82); ctx.lineTo(x1, 30); ctx.lineTo(x1, -16);
      ctx.fillStyle = rgba(faceA()); ctx.fill(); ctx.strokeStyle = rgba(L); ctx.lineWidth = px(1.3); ctx.stroke();
      ctx.save(); ctx.clip();
      ctx.fillStyle = rgba(c, .5); ctx.fillRect(x0, -6 + Math.sin(clock * 1.4 + x0) * .8, x1 - x0, 100); ctx.restore();
      line([[x0, -6], [x1, -6]], c, 1.4, .9);
      line([[x0 - 4, -24], [x1 + 4, -24]], L, 2);
      line([[(x0 + x1) / 2, -24], [(x0 + x1) / 2, 70]], L, 1, .6);
    }
    box(255, -64, 60, 64, faceA());
    for (let i = 0; i < 4; i++) line([[262, -52 + i * 9], [308, -52 + i * 9]], lineA(), 1, .7);
    box(275, -22, 20, 22, shadeA());
  }

  function drawRegistry() {
    alpha("registry");
    const [x0, x1] = X.registry, w = x1 - x0;
    box(x0, -230, w, 230, faceA());
    box(x0 - 4, -236, w + 8, 8, shadeA());
    line([[x0, -78], [x1, -78]], lineA(), 1, .55); line([[x0, -154], [x1, -154]], lineA(), 1, .55);
    for (let f = 0; f < 3; f++) box(x0 + 10, -222 + f * 76, w - 20, 54, glassA(), null);
    for (let i = 0; i <= 10; i++) box(x0 + 8 + i * ((w - 22) / 10), -224, 6, 214, shadeA(), lineA(), .9);
    box(x0 + w / 2 - 22, -48, 44, 48, mix([24, 44, 70], [40, 70, 110], night), lineA());
    line([[x0 + w / 2 - 40, -54], [x0 + w / 2 + 40, -54]], lineA(), 2.4);
    for (const tx of [x0 + 20, x0 + 48]) { box(tx, -252, 22, 16, shadeA()); }
  }

  function drawSchool() {
    alpha("school");
    const [x0, x1] = X.school;
    box(x0, -186, x1 - x0, 186, faceA());
    box(x0 - 4, -192, x1 - x0 + 8, 7, shadeA());
    box(780, -214, 52, 214, shadeA());
    for (let i = 0; i < 6; i++) box(797, -204 + i * 33, 18, 25, glassA(), lineA(), 1);
    line([[x0, -96], [x1, -96]], lineA(), 1, .55);
    windows(x0 + 10, 772, -172, 44, 4, 30); windows(840, x1 - 10, -172, 44, 4, 30);
    windows(x0 + 10, 772, -80, 44, 4, 30); windows(840, x1 - 10, -80, 44, 4, 30);
    box(792, -52, 28, 52, mix([24, 44, 70], [40, 70, 110], night));
    line([[772, -58], [840, -58]], lineA(), 2.4);
    // the boundary wall and its railing, the gate open
    for (const [a, b] of [[600, 770], [842, 1018]]) {
      box(a, -16, b - a, 16, shadeA(), lineA(), 1);
      for (let x = a + 6; x < b; x += 9) line([[x, -16], [x, -36]], lineA(), .9, .8);
      line([[a, -36], [b, -36]], lineA(), 1.2);
    }
    for (const tx of [x0 + 26, x1 - 52]) box(tx, -206, 24, 16, shadeA());
  }

  function drawBakery() {
    alpha("bakery");
    const [x0, x1] = X.bakery;
    box(1236, -240, 14, 100, shadeA()); box(1230, -246, 26, 8, faceA());
    box(x0, -140, x1 - x0, 140, faceA());
    box(x0 - 4, -146, x1 - x0 + 8, 7, shadeA());
    box(1088, -158, 32, 14, shadeA());
    box(1100, -126, 104, 18, shadeA(), lineA(), 1);
    // the bread window: lit at night, when bakeries work
    const lit = night;
    box(1100, -86, 104, 46, mix(glassA(), K.lamp, lit * .85), lineA(), 1.2);
    for (let x = 1100; x <= 1204; x += 26) line([[x, -86], [x, -40]], lineA(), .9, .6);
    box(1094, -40, 116, 6, shadeA(), lineA(), 1);
    ctx.beginPath(); ctx.moveTo(1092, -88); ctx.lineTo(1212, -88); ctx.lineTo(1220, -100); ctx.lineTo(1084, -100); ctx.closePath();
    ctx.fillStyle = rgba(shadeA()); ctx.fill(); ctx.strokeStyle = rgba(lineA()); ctx.lineWidth = px(1); ctx.stroke();
    box(1226, -60, 26, 60, mix([24, 44, 70], [40, 70, 110], night));
  }

  function drawLights() {
    alpha("lights");
    for (const x of X.lights) {
      line([[x, 0], [x, -150]], lineA(), 2.2);
      line([[x, -146], [x + 24, -146]], lineA(), 1.6);
      box(x + 18, -146, 14, 5, night > .3 ? K.lamp : lineA(), null);
      ctx.beginPath(); ctx.moveTo(x - 15, -156); ctx.lineTo(x + 15, -171); ctx.lineTo(x + 15, -166); ctx.lineTo(x - 15, -151); ctx.closePath();
      ctx.fillStyle = rgba(mix([28, 58, 99], [40, 74, 118], night)); ctx.fill();
      ctx.strokeStyle = rgba(lineA()); ctx.lineWidth = px(1); ctx.stroke();
    }
  }

  function drawTank() {
    alpha("tank");
    const L = lineA(), c = 1590;
    for (const [b, t] of [[1538, 1554], [1642, 1626]]) line([[b, 0], [t, -292]], L, 2.4);
    for (const y of [-96, -194, -292]) line([[1538 + 16 * (-y / 292), y], [1642 - 16 * (-y / 292), y]], L, 1.2);
    line([[1541, -2], [1638, -96]], L, .9, .7); line([[1639, -2], [1542, -96]], L, .9, .7);
    line([[1544, -96], [1634, -194]], L, .9, .7); line([[1636, -96], [1546, -194]], L, .9, .7);
    line([[1548, -194], [1630, -292]], L, .9, .7); line([[1632, -194], [1550, -292]], L, .9, .7);
    // the tank: water drawn to its level, the level moving a little
    ctx.beginPath(); ctx.moveTo(1525, -405); ctx.lineTo(1655, -405); ctx.lineTo(1655, -306); ctx.lineTo(1612, -290); ctx.lineTo(1568, -290); ctx.lineTo(1525, -306); ctx.closePath();
    ctx.fillStyle = rgba(faceA()); ctx.fill();
    ctx.save(); ctx.clip();
    const lvl = -306 - 62 + Math.sin(clock * .9) * 1.2;
    ctx.fillStyle = rgba(K.water, .32); ctx.fillRect(1520, lvl, 140, 130);
    line([[1525, lvl], [1655, lvl]], K.water, 1.4, .95);
    ctx.restore();
    ctx.strokeStyle = rgba(L); ctx.lineWidth = px(1.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1519, -405); ctx.lineTo(c, -426); ctx.lineTo(1661, -405); ctx.closePath();
    ctx.fillStyle = rgba(shadeA()); ctx.fill(); ctx.stroke();
    line([[1525, -372], [1655, -372]], L, .8, .35); line([[1525, -340], [1655, -340]], L, .8, .35);
    line([[1664, -402], [1664, -8]], L, .9, .8); line([[1671, -402], [1671, -8]], L, .9, .8);
    for (let y = -16; y > -400; y -= 14) line([[1664, y], [1671, y]], L, .7, .6);
    line([[1580, -290], [1580, -2]], L, 1.6, .9); line([[1600, -290], [1600, -2]], L, 1.6, .9);
  }

  function drawArray() {
    alpha("array");
    const L = lineA(), glint = (clock * .18) % 1.6;
    for (const x0 of [1690, 1760, 1830]) {
      line([[x0 + 6, 0], [x0 + 6, -40]], L, 1.6); line([[x0 + 58, 0], [x0 + 58, -82]], L, 1.6);
      line([[x0 + 6, -40], [x0 + 58, 0]], L, .9, .6);
      ctx.beginPath(); ctx.moveTo(x0, -38); ctx.lineTo(x0 + 66, -90); ctx.lineTo(x0 + 69, -86); ctx.lineTo(x0 + 3, -34); ctx.closePath();
      ctx.fillStyle = rgba(mix([22, 54, 96], [34, 68, 112], night)); ctx.fill(); ctx.strokeStyle = rgba(L); ctx.lineWidth = px(1.2); ctx.stroke();
      for (let k = 1; k < 4; k++) line([[x0 + k * 16.5, -38 - k * 13], [x0 + 3 + k * 16.5, -34 - k * 13]], [255, 255, 255], .8, .5);
      if (night < .5) {
        const g = clamp(glint - (x0 - 1690) / 240, 0, 1);
        if (g > 0 && g < 1) line([[x0 + g * 60, -38 - g * 47], [x0 + 3 + g * 60, -34 - g * 47]], [255, 255, 255], 3, (1 - night * 2) * Math.sin(g * Math.PI));
      }
    }
  }

  function drawCabinet() {
    alpha("cabinet");
    const [x0, x1] = X.cabinet;
    box(x0, -66, x1 - x0, 66, faceA()); box(x0 - 3, -70, x1 - x0 + 6, 5, shadeA());
    line([[x0 + 4, -60], [x0 + 4, -6]], lineA(), .8, .7); line([[x1 - 4, -60], [x1 - 4, -6]], lineA(), .8, .7);
    for (let i = 0; i < 4; i++) line([[x0 + 10, -54 + i * 6], [x1 - 10, -54 + i * 6]], lineA(), .8, .7);
    ctx.beginPath(); ctx.arc(x0 + 12, -16, 2.6, 0, 7);
    ctx.fillStyle = rgba(night > .5 ? K.water : [44, 170, 120]); ctx.fill();
    // the well head
    alpha("wellhead");
    box(X.well - 9, -18, 18, 18, faceA()); box(X.well - 13, -22, 26, 5, shadeA());
  }

  function drawUnder() {
    const wx = X.well;
    // manholes: shafts from the street to the sewer, the lid at the ground
    alpha("manholes");
    for (const [x, d] of [[1185, 110], [935, 121], [640, 134], [420, 142]]) {
      box(x - 11, 2, 22, d - 6, [6, 30, 58], [255, 255, 255], 1);
      for (let y = 12; y < d - 8; y += 12) line([[x - 5, y], [x + 5, y]], [255, 255, 255], .8, .35);
      line([[x - 15, 1], [x + 15, 1]], [200, 214, 230], 2.2);
    }
    // the valve chamber on the well's delivery: a gate valve and a flow meter, as drawings mark them
    alpha("valve");
    box(1900, 8, 70, 46, [6, 30, 58], [255, 255, 255], 1);
    ctx.globalAlpha *= 1;
    alpha("sewer"); for (const p of paths.sewer) pipe(p, 9);
    alpha("main"); for (const p of paths.supply) pipe(p, 8);
    alpha("treated"); pipe(paths.treated, 8);
    alpha("lift"); pipe(paths.lift, 7);
    alpha("valve");
    const vx = 1946, vy = 28;
    ctx.beginPath(); ctx.moveTo(vx - 9, vy - 7); ctx.lineTo(vx + 9, vy + 7); ctx.lineTo(vx + 9, vy - 7); ctx.lineTo(vx - 9, vy + 7); ctx.closePath();
    ctx.fillStyle = rgba([235, 242, 250]); ctx.fill();
    line([[vx, vy], [vx, vy - 16]], [235, 242, 250], 1.2); line([[vx - 7, vy - 16], [vx + 7, vy - 16]], [235, 242, 250], 1.6);
    box(1914, vy - 8, 16, 16, [235, 242, 250], null);
    ctx.fillStyle = rgba(K.navy); ctx.font = `600 ${px(9)}px "IBM Plex Mono", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.save(); ctx.translate(1922, vy + px(.5)); ctx.scale(M, 1); ctx.fillText("M", 0, 0); ctx.restore();
    // the cable from the array to the controller, then down beside the casing to the pump
    alpha("cable"); line(paths.cable.pts, K.power, 1.1, .55);
    // the casing, broken where its length is omitted, the pump and its intake in the aquifer
    alpha("casing");
    const yb0 = D * .44 - px(6), yb1 = D * .56 + px(6);
    for (const [a, b] of [[-18, yb0], [yb1, D + 6]]) {
      box(wx - 8, a, 16, b - a, [10, 40, 74], [235, 242, 250], 1.2);
      line([[wx, a], [wx, b]], [235, 242, 250], 1, .5);
    }
    alpha("pump");
    ctx.beginPath(); ctx.roundRect(wx - 7, D + 8, 14, 56, 5);
    ctx.fillStyle = rgba([220, 232, 245]); ctx.fill();
    line([[wx - 7, D + 30], [wx + 7, D + 30]], K.navy, 1.4);
    alpha("casing");
    box(wx - 8, D + 66, 16, 92, null, [235, 242, 250], 1.2);
    for (let y = D + 72; y < D + 152; y += 7) line([[wx - 6, y], [wx + 6, y]], K.water, 1, .8);
    ctx.globalAlpha = 1;
  }

  function drawFlows(under) {
    const day = 1 - night;
    for (const f of flows) {
      let a = (A[f.g] ?? 1) * (f.sky ? day * .9 : under);
      if (f.solar) a *= day;
      if (a < .02) continue;
      const v = RM.matches ? 0 : f.v;
      for (const p of f.p) {
        if (f.bare) { ctx.globalAlpha = a * .22; line(p.pts, f.c, .8, 1, [2, 5]); }
        const off = (clock * v) % f.gap;
        for (let d = off; d < p.L; d += f.gap) {
          const a0 = pointAt(p, d), a1 = pointAt(p, Math.min(d + f.dash, p.L));
          if (!f.bare) { ctx.globalAlpha = a * .35; line([a0, a1], f.c, f.w + 4); }
          ctx.globalAlpha = a; line([a0, a1], f.c, f.w);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawNightGlow() {
    if (night < .02) return;
    ctx.globalAlpha = night * (A.lights ?? 1);
    for (const x of X.lights) {
      const g = ctx.createLinearGradient(0, -141, 0, 0);
      g.addColorStop(0, rgba(K.lamp, .5)); g.addColorStop(1, rgba(K.lamp, 0));
      ctx.beginPath(); ctx.moveTo(x + 18, -141); ctx.lineTo(x + 32, -141); ctx.lineTo(x + 78, 0); ctx.lineTo(x - 28, 0); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.globalAlpha = night * (A.bakery ?? 1);
    const g = ctx.createRadialGradient(1152, -60, 4, 1152, -60, 120);
    g.addColorStop(0, rgba(K.lamp, .38)); g.addColorStop(1, rgba(K.lamp, 0));
    ctx.fillStyle = g; ctx.fillRect(1030, -180, 250, 180);
    ctx.globalAlpha = 1;
  }

  // levels, in figures, at screen size: the same on both pages
  function drawLevels(gy) {
    const marks = [[1366, 0, "±0.00", "up"], [1012, -186, "+6.00", "up"], [1356, 50, "−1.20", "down"], [1100, 114, "−3.50", "down"]];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `500 11px "IBM Plex Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.direction = "ltr";                                   // a level is a figure: "+6.00" on both pages
    const base = (S.a === "hero" && S.b === "hero") ? 1 : .8;
    const placed = [];
    for (const [x, y, t, side] of marks) {
      const sx = (x - cam.cx) * cam.s * M + cam.ax, sy = (y - cam.cy) * cam.s + cam.ay;
      if (sx < -40 || sx > W + 40 || sy < -20 || sy > H + 20) continue;
      if (placed.some(([px_, py_]) => Math.abs(px_ - sx) < 64 && Math.abs(py_ - sy) < 26)) continue;   // too close to read: drop
      placed.push([sx, sy]);
      const aboveGround = y <= 0 && side === "up";
      const c = aboveGround ? mix(K.navy, K.nightLine, night) : [235, 242, 250];
      ctx.globalAlpha = .75 * base * clamp((reveal - .5) * 2);
      ctx.fillStyle = ctx.strokeStyle = rgba(c); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx - 5, sy - 9); ctx.lineTo(sx + 5, sy - 9); ctx.lineTo(sx, sy - 2); ctx.closePath();
      if (side === "up") ctx.stroke(); else ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - 5, sy - 9); ctx.lineTo(sx + 44, sy - 9); ctx.stroke();
      ctx.fillText(t, sx + 8, sy - 13);
    }
    ctx.globalAlpha = 1;
  }

  // ── callouts: HTML labels pinned to the drawing ───────────────────────────────────────────────────────────
  function anchors() {
    return {
      array: [1795, -96], light: [1470, -172], school: [806, -220], bakery: [1165, -150], registry: [460, -256],
      tank: [1590, -428], main: [1040, 50], sewer: [800, 128], manhole: [935, 60], plant: [140, -30],
      cabinet: [1928, -72], wellhead: [1946, 40], casing: [X.well, D * .3], pump: [X.well, D + 36], aquifer: [X.well - 60, D + 120],
    };
  }
  function placeCallouts(st) {
    const an = anchors(), on = new Set();
    const key = st.e < .5 ? st.a : st.b;
    if (FOCUS[key] && Math.abs(st.e - .5) > .3) for (const p of FOCUS[key].parts) on.add(p);
    if (hover && key === "hero") on.add(hover);
    const ctxLine = [];
    for (const [part, el] of Object.entries(callouts)) {
      const a = an[part]; if (!a) continue;
      const sx = (a[0] - cam.cx) * cam.s * M + cam.ax, sy = (a[1] - cam.cy) * cam.s + cam.ay;
      const deep = a[1] > 150, side = sx > W / 2 ? -1 : 1;          // deep labels stand off sideways, towards the page
      const lx = deep ? sx + 46 * side : sx, ly = deep ? sy : sy - 34;
      el.style.transform = deep ? `translate(${lx}px, ${ly}px) translate(${side < 0 ? -100 : 0}%, -50%)` : `translate(${lx}px, ${ly}px) translate(-50%, -100%)`;
      const show = on.has(part) && sx > -20 && sx < W + 20 && sy > 0 && sy < H;
      el.classList.toggle("on", show);
      if (show) ctxLine.push([sx, sy, lx, ly]);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const [sx, sy, lx, ly] of ctxLine) {
      ctx.globalAlpha = .9; ctx.strokeStyle = rgba(sy < (0 - cam.cy) * cam.s + cam.ay ? mix(K.navy, K.nightLine, night) : [235, 242, 250]);
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (tag) tag.classList.toggle("on", key !== "hero");
  }

  // ── the loop ───────────────────────────────────────────────────────────────────────────────────────────────
  function tick() {
    if (!running) return;
    frame();
    requestAnimationFrame(tick);
  }
  function start() { if (!running && visible) { running = true; last = performance.now(); requestAnimationFrame(tick); } }
  function stop() { running = false; }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }, { rootMargin: "100px" });
  io.observe(stage);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  // the scroll moves the camera even when the browser is giving no animation frames (a throttled or background tab)
  addEventListener("scroll", () => { if (!running || performance.now() - drewAt > 100) frame(); }, { passive: true });
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
  document.fonts?.ready.then(layout);

  // hovering the hero drawing names what is under the pointer (the hero's text layer lies over the canvas)
  const over = stations[0] || stage;
  over.addEventListener("pointermove", (ev) => {
    if (ev.pointerType === "touch") return;
    const r = stage.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, an = anchors();
    let best = null, bd = 70;
    for (const [k, a] of Object.entries(an)) {
      const d = Math.hypot((a[0] - cam.cx) * cam.s * M + cam.ax - x, (a[1] - cam.cy) * cam.s + cam.ay - y);
      if (d < bd) { bd = d; best = k; }
    }
    hover = best;
  });
  over.addEventListener("pointerleave", () => { hover = null; });

  layout();
  start();
  return {
    setNight(on) { nightTarget = on ? 1 : 0; root.classList.toggle("night", on); if (RM.matches) { night = nightTarget; frame(); } else start(); },
  };
}
