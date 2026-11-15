/* The last-light test (14 Nov 2026). On a reflective product's page: scroll, and the daylight drains from around the
   jacket; the low sun catches its trims; then it is night, it rains, a car passes and the trims answer its headlights;
   then the light is the shopper's own. Drawn on a canvas from the product's own photograph and two masks cut from it
   (tools/night_mask.py): the jacket's silhouette, and its trims. Nothing glows that the photograph does not show. */
(function () {
  "use strict";
  var sec = document.getElementById("night"); if (!sec) return;
  var cv = document.getElementById("night-canvas"), line = document.getElementById("night-line");
  var acts = document.getElementById("night-acts"), hint = document.getElementById("night-hint");
  var ctx = cv.getContext && cv.getContext("2d"); if (!ctx) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;

  function load(src) { return new Promise(function (ok, no) { var i = new Image(); i.decoding = "async"; i.onload = function () { ok(i); }; i.onerror = no; i.src = src; }); }
  function alphaOf(img, w, h) {                 // a white-on-black mask → white with that alpha
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h), p = d.data;
    for (var i = 0; i < p.length; i += 4) { p[i + 3] = p[i]; p[i] = p[i + 1] = p[i + 2] = 255; }
    x.putImageData(d, 0, 0); return c;
  }
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function smooth(a, b, t) { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); }

  var W, H, PW, PH, OX, OY, photo, jk, trims, glow, tmp, tmp2, drops = [], ready = false;
  var S = { p: 0, n: 0, dusk: 0, phase: "day", carT: -1, carDone: false, mine: false, lx: 0.5, ly: 0.45, tx: 0.5, ty: 0.45, lastInput: 0 };

  var copy = sec.querySelector(".night-copy"), note = document.getElementById("night-note");
  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
    cv.width = W; cv.height = H;
    // the jacket stands in the space under the words, with the wet ground and its reflection below it
    var top = (copy.getBoundingClientRect().bottom - r.top + 12) * dpr;
    var bottom = H - (note ? note.offsetHeight * dpr : 0);
    var room = bottom - top;
    PH = Math.max(H * 0.3, room * 0.84); PW = PH * 0.8; if (PW > W * 0.92) { PW = W * 0.92; PH = PW / 0.8; }
    OX = (W - PW) / 2; OY = top + (room - PH) * 0.12;
    if (!ready) return;
    var sh = alphaOf(SH, PW | 0, PH | 0), tr = alphaOf(TR, PW | 0, PH | 0);
    jk = canvas(PW | 0, PH | 0); var j = jk.getContext("2d"); j.drawImage(photo, 0, 0, PW, PH); j.globalCompositeOperation = "destination-in"; j.drawImage(sh, 0, 0);
    trims = tr; glow = alphaOf(GL, PW | 0, PH | 0);
    tmp = canvas(PW | 0, PH | 0); tmp2 = canvas(PW | 0, PH | 0);
    drops = []; var n = touch ? 70 : 140;
    for (var i = 0; i < n; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, v: (0.55 + Math.random() * 0.6) * H / 70, l: (0.6 + Math.random()) * H / 55 });
  }

  /* a light: (x, y) in canvas px, radius, strength 0–1, colour [r, g, b] */
  function lightUp(L) {
    var lx = L.x - OX, ly = L.y - OY;
    // the fabric the light falls on, in its true colour
    var t = tmp.getContext("2d"); t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, tmp.width, tmp.height);
    t.drawImage(jk, 0, 0);
    var g = t.createRadialGradient(lx, ly, 0, lx, ly, L.r);
    g.addColorStop(0, "rgba(0,0,0," + (0.9 * L.s) + ")"); g.addColorStop(0.55, "rgba(0,0,0," + (0.35 * L.s) + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
    t.globalCompositeOperation = "destination-in"; t.fillStyle = g; t.fillRect(0, 0, tmp.width, tmp.height);
    ctx.globalCompositeOperation = "source-over"; ctx.drawImage(tmp, OX, OY);
    // the trims send it back: much brighter, a little wider than the beam, in the light's own colour
    var u = tmp2.getContext("2d"); u.globalCompositeOperation = "source-over"; u.clearRect(0, 0, tmp2.width, tmp2.height);
    u.drawImage(glow, 0, 0); u.drawImage(trims, 0, 0);
    var g2 = u.createRadialGradient(lx, ly, 0, lx, ly, L.r * 1.7);
    g2.addColorStop(0, "rgba(0,0,0," + L.s + ")"); g2.addColorStop(0.6, "rgba(0,0,0," + (0.55 * L.s) + ")"); g2.addColorStop(1, "rgba(0,0,0,0)");
    u.globalCompositeOperation = "destination-in"; u.fillStyle = g2; u.fillRect(0, 0, tmp2.width, tmp2.height);
    u.globalCompositeOperation = "source-in"; u.fillStyle = "rgb(" + L.c.join(",") + ")"; u.fillRect(0, 0, tmp2.width, tmp2.height);
    ctx.globalCompositeOperation = "lighter"; ctx.drawImage(tmp2, OX, OY); ctx.drawImage(tmp2, OX, OY);
    // and on the wet ground below, upside down and smeared
    ctx.save(); ctx.globalAlpha = 0.32 * L.s; ctx.translate(OX, OY + PH * 0.95 + PH * 0.42); ctx.scale(1, -0.42);
    ctx.drawImage(tmp2, 0, 0, PW, PH); ctx.restore();
    // the ground itself catches a little
    var g3 = ctx.createRadialGradient(L.x, OY + PH, 0, L.x, OY + PH, L.r * 1.4);
    g3.addColorStop(0, "rgba(" + L.c.join(",") + "," + (0.10 * L.s) + ")"); g3.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 1; ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  var last = 0;
  function frame(now) {
    raf = 0;
    if (!ready) return;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var n = S.n;
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    // the ground: studio grey by day, a wet road at night
    var gr = ctx.createLinearGradient(0, 0, 0, H);
    var top = mix([125, 122, 118], [6, 8, 13], n), mid = mix([116, 113, 109], [10, 13, 19], n), bot = mix([104, 101, 97], [3, 4, 7], n);
    gr.addColorStop(0, rgb(top)); gr.addColorStop(0.8, rgb(mid)); gr.addColorStop(1, rgb(bot));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // the jacket: the photograph by day, darkening to almost nothing
    ctx.drawImage(jk, OX, OY);
    if (n > 0) {
      var t = tmp.getContext("2d"); t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, tmp.width, tmp.height);
      t.drawImage(jk, 0, 0); t.globalCompositeOperation = "source-atop"; t.fillStyle = "rgba(2,3,6," + (0.93 * n) + ")"; t.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(tmp, OX, OY);
    }
    var lights = [];
    // last light: a low warm sun from the left, crossing as the shopper scrolls
    if (S.dusk > 0.01) lights.push({ x: OX + PW * (-0.2 + 0.9 * S.p / 0.6), y: OY + PH * 0.55, r: PW * 0.75, s: S.dusk * 0.55, c: [240, 176, 74] });
    // the car
    if (S.carT >= 0) {
      S.carT += dt / 2.6; var k = S.carT;
      var x = -0.55 + k * 2.1, s = smooth(0, 0.12, k) * (1 - smooth(0.85, 1, k));
      lights.push({ x: OX + PW * x, y: OY + PH * 0.62, r: PW * 0.62, s: 0.95 * s, c: [236, 243, 255], wash: true });
      lights.push({ x: OX + PW * (x - 0.42), y: OY + PH * 0.62, r: PW * 0.62, s: 0.95 * s, c: [236, 243, 255], wash: true });
      if (k >= 1) { S.carT = -1; if (!S.mine) yours(); }
    }
    // the shopper's own light (or a slow drift while they rest)
    if (S.mine) {
      if (now - S.lastInput > 2600) {
        var q = now / 1000; S.tx = 0.5 + 0.34 * Math.sin(q * 0.45); S.ty = 0.42 + 0.22 * Math.sin(q * 0.9 + 1.1);
      }
      S.lx += (S.tx - S.lx) * Math.min(1, dt * 9); S.ly += (S.ty - S.ly) * Math.min(1, dt * 9);
      lights.push({ x: OX + PW * S.lx, y: OY + PH * S.ly, r: PW * 0.34, s: 0.92, c: [246, 241, 228] });
    }
    for (var i = 0; i < lights.length; i++) {
      var Lx = lights[i]; if (Lx.s <= 0.01) continue;
      if (Lx.wash) {                              // a headlight's sweep across the whole street, not only the jacket
        var gw = ctx.createLinearGradient(Lx.x - PW * 0.7, 0, Lx.x + PW * 0.7, 0);
        gw.addColorStop(0, "rgba(220,230,255,0)"); gw.addColorStop(0.5, "rgba(220,230,255," + (0.085 * Lx.s) + ")"); gw.addColorStop(1, "rgba(220,230,255,0)");
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gw; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
      }
      lightUp(Lx);
    }
    if (S.mine) {                                 // where the shopper's light is: a soft spot, never a cursor
      var sx = OX + PW * S.lx, sy = OY + PH * S.ly, gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, PW * 0.09);
      gs.addColorStop(0, "rgba(255,248,232,0.22)"); gs.addColorStop(1, "rgba(255,248,232,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gs; ctx.fillRect(sx - PW * 0.1, sy - PW * 0.1, PW * 0.2, PW * 0.2);
      ctx.globalCompositeOperation = "source-over";
    }
    // rain, brighter where a light falls
    if (n > 0.5) {
      ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = Math.max(1, W / 900);
      for (var d = 0; d < drops.length; d++) {
        var r = drops[d]; r.y += r.v * (reduce ? 0 : 1); r.x -= r.v * 0.12 * (reduce ? 0 : 1);
        if (r.y > H) { r.y = -r.l; r.x = Math.random() * W * 1.1; }
        var lit = 0;
        for (var m = 0; m < lights.length; m++) { var L = lights[m], dx = r.x - L.x, dy = r.y - L.y; lit = Math.max(lit, L.s * Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (L.r * 1.3))); }
        ctx.strokeStyle = "rgba(200,215,235," + ((0.05 + 0.5 * lit) * (n - 0.5) * 2) + ")";
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.l * 0.12, r.y - r.l); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    if (visible && (n > 0.5 || S.carT >= 0 || S.mine || S.dusk > 0.01)) raf = requestAnimationFrame(frame);
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c) { return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")"; }

  var raf = 0, visible = false;
  function kick() { if (!raf && ready) raf = requestAnimationFrame(frame); }

  var LINES = { day: "Scroll, and let the light go.", dusk: "Last light. The low sun finds the trims.",
    night: "After dark, the jacket is black.", car: "Then a car comes round the corner.",
    yours: touch ? "Now it’s your light. Drag your finger across the jacket." : "Now it’s your light. Move it across the jacket." };
  function say(k) { if (S.phase !== k) { S.phase = k; line.textContent = LINES[k]; sec.dataset.phase = k; } }
  function yours() { S.mine = true; S.lastInput = 0; say("yours"); acts.hidden = false; if (hint) hint.hidden = false; }
  function car() { S.carT = 0; say("car"); kick(); }

  function onScroll() {
    if (reduce) return;
    var r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight;
    var p = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 1;
    S.p = p; S.n = smooth(0.12, 0.55, p); S.dusk = smooth(0.08, 0.3, p) * (1 - smooth(0.42, 0.6, p));
    if (S.mine) { if (p < 0.3) { S.mine = false; acts.hidden = true; if (hint) hint.hidden = true; } }
    if (!S.mine && S.carT < 0) say(p < 0.1 ? "day" : p < 0.45 ? "dusk" : p < 0.62 ? "night" : "car");
    if (p >= 0.62 && !S.carDone) { S.carDone = true; car(); }
    if (p < 0.4) S.carDone = false;
    kick();
  }

  function point(e) {
    if (!S.mine) return;
    var r = cv.getBoundingClientRect(), dpr = W / r.width;
    S.tx = ((e.clientX - r.left) * dpr - OX) / PW; S.ty = ((e.clientY - r.top) * dpr - OY) / PH;
    S.lastInput = performance.now(); if (hint) hint.hidden = true; kick();
  }
  cv.addEventListener("pointermove", point);
  cv.addEventListener("pointerdown", point);
  cv.addEventListener("touchmove", function (e) { if (e.touches[0]) point(e.touches[0]); }, { passive: true });
  cv.addEventListener("keydown", function (e) {
    var k = { ArrowLeft: [-0.06, 0], ArrowRight: [0.06, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06] }[e.key]; if (!k || !S.mine) return;
    e.preventDefault(); S.tx = Math.max(0, Math.min(1, S.tx + k[0])); S.ty = Math.max(0, Math.min(1, S.ty + k[1])); S.lastInput = performance.now(); kick();
  });
  document.getElementById("night-car").addEventListener("click", function () { S.n = 1; car(); });
  document.getElementById("night-day").addEventListener("click", function () {
    var top = sec.getBoundingClientRect().top + scrollY; scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
  });

  var SH, TR, GL;
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: "200px" }).observe(sec);
  var wide = (cv.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 1.6)) > 700;
  Promise.all([load(wide ? sec.dataset.photo : sec.dataset.photoSmall), load(sec.dataset.shape), load(sec.dataset.trims), load(sec.dataset.glow)]).then(function (a) {
    photo = a[0]; SH = a[1]; TR = a[2]; GL = a[3]; ready = true; sec.classList.add("live"); size();
    if (reduce) { S.n = 1; S.p = 1; yours(); S.tx = 0.5; S.ty = 0.42; S.lx = 0.5; S.ly = 0.42; }
    onScroll(); kick();
  }).catch(function () { /* the still photograph stays: the page never depends on this */ });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", function () { if (ready) { size(); kick(); } });
})();
