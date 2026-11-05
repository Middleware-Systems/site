/* Sabbagh Trading Group — «The Weave». No library. Everything here only adds motion or filtering: with no script the
   page shows every brand, the finished mark and the thread standing still. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  function still() { return reduce.matches || doc.dataset.motion === "off"; }

  /* ---------------------------------------------------------------- the motion button (WCAG 2.2.2) */
  var mt = document.querySelector("[data-motion-toggle]");
  function syncMotion() {
    if (!mt) return;
    var off = doc.dataset.motion === "off";
    mt.setAttribute("aria-pressed", off ? "true" : "false");
    mt.setAttribute("aria-label", off ? mt.dataset.on : mt.dataset.off);
  }
  if (mt) mt.addEventListener("click", function () {
    var off = doc.dataset.motion !== "off";
    if (off) doc.dataset.motion = "off"; else delete doc.dataset.motion;
    try { localStorage.setItem("stg-motion", off ? "off" : "on"); } catch (e) {}
    syncMotion();
    looms.forEach(function (l) { l.draw(); });
  });
  syncMotion();

  /* ---------------------------------------------------------------- the header */
  var top = document.querySelector("[data-top]");
  var menu = document.querySelector("[data-menu]");
  function onScroll() { if (top) top.classList.toggle("solid", window.scrollY > 40 || top.classList.contains("open")); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (menu) menu.addEventListener("click", function () {
    var open = !top.classList.contains("open");
    top.classList.toggle("open", open);
    menu.setAttribute("aria-expanded", open ? "true" : "false");
    onScroll();
  });
  document.querySelectorAll(".nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      if (top.classList.contains("open")) { top.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); onScroll(); }
    });
  });

  /* ---------------------------------------------------------------- the loom: threads over and under, lit by the pointer */
  var looms = [];
  function Loom(canvas) {
    var host = canvas.parentElement, ctx = canvas.getContext("2d"), self = this;
    var base = document.createElement("canvas"), lit = document.createElement("canvas");
    var w = 0, h = 0, dpr = 1, px = -1, py = -1, tx = 0, ty = 0, raf = 0, visible = true, t0 = performance.now();
    function weave(c, alpha) {
      var g = c.getContext("2d"), s = 15, gap = 3, i, j, x, y;
      g.clearRect(0, 0, c.width, c.height);
      g.save(); g.scale(dpr, dpr);
      g.strokeStyle = "rgba(255,255,255," + alpha + ")"; g.lineWidth = 1;
      var cols = Math.ceil(w / s) + 1, rows = Math.ceil(h / s) + 1;
      g.beginPath();
      for (j = 0; j < rows; j++) {            /* horizontal threads: broken where the vertical one passes over */
        y = j * s + .5;
        for (i = 0; i < cols; i++) {
          x = i * s;
          var over = (i + j) % 2 === 0;
          g.moveTo(x + (over ? 0 : gap), y); g.lineTo(x + s - (((i + 1 + j) % 2 === 0) ? 0 : gap), y);
        }
      }
      for (i = 0; i < cols; i++) {            /* vertical threads: broken where the horizontal one passes over */
        x = i * s + .5;
        for (j = 0; j < rows; j++) {
          y = j * s;
          var hov = (i + j) % 2 === 1;
          g.moveTo(x, y + (hov ? gap : 0)); g.lineTo(x, y + s - (((i + j + 1) % 2 === 1) ? gap : 0));
        }
      }
      g.stroke(); g.restore();
    }
    function size() {
      var r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      [canvas, base, lit].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
      weave(base, .016); weave(lit, .32); /* the navy stays calm; the light shows the weave */
      self.draw();
    }
    this.draw = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      if (still()) return;
      var t = (performance.now() - t0) / 1000;
      var lx = px >= 0 ? px : w * (.62 + .18 * Math.sin(t * .23)), ly = py >= 0 ? py : h * (.42 + .2 * Math.cos(t * .31));
      tx += (lx - tx) * .08; ty += (ly - ty) * .08;
      var r = Math.max(180, Math.min(w, h) * .38);
      ctx.save();
      ctx.beginPath(); ctx.arc(tx * dpr, ty * dpr, r * dpr, 0, Math.PI * 2); ctx.clip();
      var grd = ctx.createRadialGradient(tx * dpr, ty * dpr, 0, tx * dpr, ty * dpr, r * dpr);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.drawImage(lit, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.globalCompositeOperation = "destination-over";
      ctx.drawImage(base, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    };
    function loop() { raf = 0; if (!visible || still()) return; self.draw(); raf = requestAnimationFrame(loop); }
    function kick() { if (!raf && visible && !still()) raf = requestAnimationFrame(loop); }
    host.addEventListener("pointermove", function (e) { var r = host.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; kick(); });
    host.addEventListener("pointerleave", function () { px = py = -1; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(host);
    window.addEventListener("resize", size);
    size();
    tx = w * .62; ty = h * .42;
    kick();
    setTimeout(kick, 400); /* a background tab never fires the first frame: a timer starts it too */
  }
  document.querySelectorAll("canvas.loom").forEach(function (c) { if (c.getContext) looms.push(new Loom(c)); });

  /* ---------------------------------------------------------------- the mark forms: the T comes through the S, over the G */
  var mark = document.querySelector(".mark-hero");
  if (mark) {
    if (still() || document.hidden) mark.classList.add("go", "done"); /* a page opened in the background shows it formed */
    else {
      setTimeout(function () { mark.classList.add("go"); }, 350);
      setTimeout(function () { mark.classList.add("done"); }, 2250); /* the exact drawing, once the T has arrived */
    }
  }

  /* ---------------------------------------------------------------- the brands: filter by sector, the filter in the address */
  var bar = document.querySelector("[data-filters]");
  if (bar) {
    var chips = [].slice.call(bar.querySelectorAll("[data-filter]"));
    var groups = [].slice.call(document.querySelectorAll("[data-group]"));
    var shown = bar.querySelector("[data-shown]");
    var keys = chips.map(function (c) { return c.dataset.filter; });
    function apply(key, scroll) {
      if (keys.indexOf(key) < 0) key = "all";
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.filter === key ? "true" : "false"); });
      var n = 0;
      groups.forEach(function (g) {
        var on = key === "all" || g.dataset.group === key;
        g.hidden = !on;
        if (on) [].forEach.call(g.querySelectorAll(".card"), function (card, i) {
          n++;
          if (still()) return;
          card.classList.remove("enter"); void card.offsetWidth;
          card.style.animationDelay = Math.min(i, 12) * 35 + "ms";
          card.classList.add("enter");
        });
      });
      if (shown) shown.textContent = shown.dataset.tpl.replace("{n}", n);
      if (scroll) {
        var y = bar.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(doc).getPropertyValue("--top")) || 64);
        if (window.scrollY > y) window.scrollTo({ top: y, behavior: still() ? "auto" : "smooth" });
      }
    }
    chips.forEach(function (c) {
      c.addEventListener("click", function (e) {
        e.preventDefault();
        history.replaceState(null, "", c.dataset.filter === "all" ? location.pathname : "#" + c.dataset.filter);
        apply(c.dataset.filter, true);
      });
    });
    window.addEventListener("hashchange", function () { apply(location.hash.slice(1), true); });
    var start = location.hash.slice(1);
    apply(start || "all", false);
    if (start && keys.indexOf(start) > 0) setTimeout(function () {
      var y = bar.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top: Math.max(0, y - 10), behavior: "auto" });
    }, 0);
  }
})();
