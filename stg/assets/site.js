/* Sabbagh Trading Group — Full Colour's motion, in the group's identity. No library. Everything here only adds to a page
   that reads complete without it: with no script every brand, card, route and word is there, standing still. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  function still() { return reduce.matches || doc.dataset.motion === "off"; }
  function raf(f) { return document.hidden || !window.requestAnimationFrame ? setTimeout(f, 16) : window.requestAnimationFrame(f); }
  function topH() { return parseInt(getComputedStyle(doc).getPropertyValue("--top")) || 70; }

  /* ---------------------------------------------------------------- the motion button (WCAG 2.2.2) */
  var mt = document.querySelector("[data-motion-toggle]");
  function syncMotion() {
    if (!mt) return;
    var off = doc.dataset.motion === "off";
    mt.setAttribute("aria-pressed", off ? "true" : "false");
    mt.setAttribute("aria-label", off ? mt.dataset.on : mt.dataset.off);
    mt.title = mt.getAttribute("aria-label");
  }
  if (mt) mt.addEventListener("click", function () {
    var off = doc.dataset.motion !== "off";
    if (off) doc.dataset.motion = "off"; else delete doc.dataset.motion;
    try { localStorage.setItem("stg-motion", off ? "off" : "on"); } catch (e) {}
    syncMotion(); frame(); looms.forEach(function (l) { l.draw(); });
    if (off) showAll();
  });
  syncMotion();

  /* ---------------------------------------------------------------- the intro: once, after first paint */
  var hero = document.querySelector("[data-hero]");
  /* rAF never fires in a background tab, so a timer starts it too; whichever comes first wins */
  function start() { if (hero) hero.classList.add("is-in"); }
  if (hero && hero.classList.contains("fcs") && "IntersectionObserver" in window && !still() && !document.hidden) {
    /* Full Colour, under The Weave's hero (/sabpure/): the shelf is stocked when it is reached, not behind the fold */
    var hio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { start(); hio.disconnect(); } }, { threshold: .12 });
    hio.observe(hero);
    setTimeout(function () { if (hero.getBoundingClientRect().top < window.innerHeight) start(); }, 80);
  } else {
    raf(function () { raf(start); });
    setTimeout(start, 80);
  }

  /* The Weave's mark forms: the T comes through the S, over the G (/sabpure/) */
  var markHero = document.querySelector(".mark-hero");
  if (markHero) {
    if (still() || document.hidden) markHero.classList.add("go", "done"); /* a page opened in the background shows it formed */
    else {
      setTimeout(function () { markHero.classList.add("go"); }, 350);
      setTimeout(function () { markHero.classList.add("done"); }, 2250); /* the exact drawing, once the T has arrived */
    }
  }

  /* the shelf's products follow the pointer, each at its own depth (Full Colour) */
  var pics = [].slice.call(document.querySelectorAll(".facing__pic"));
  if (pics.length && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var ptx = 0, pty = 0, pending = false;
    hero.addEventListener("pointermove", function (e) {
      if (still()) return;
      ptx = (e.clientX / window.innerWidth - .5) * 2;
      pty = (e.clientY / window.innerHeight - .5) * 2;
      if (pending) return;
      pending = true;
      raf(function () {
        pending = false;
        pics.forEach(function (p) {
          var d = parseFloat(p.getAttribute("data-depth")) || 1, img = p.firstElementChild;
          img.style.setProperty("--px", (ptx * 10 * d).toFixed(1) + "px");
          img.style.setProperty("--py", (pty * 8 * d).toFixed(1) + "px");
        });
      });
    });
  }

  /* ---------------------------------------------------------------- header: solid once scrolled, light on dark sections */
  var top = document.querySelector("[data-top]");
  var darks = [].slice.call(document.querySelectorAll(".wv, .band, .orig, .order, .foot"));

  /* ---------------------------------------------------------------- the wall: tiles come in as they are reached */
  var tiles = [].slice.call(document.querySelectorAll("[data-tile]")), t0 = Date.now();
  function showTiles(list) {
    var base = Date.now() - t0 < 900 ? .55 : 0;  /* the first row waits for the headline */
    list.forEach(function (el, k) { el.style.setProperty("--d", (base + k * .07).toFixed(2) + "s"); el.classList.add("is-in"); });
  }
  function showAll() { showTiles(tiles.filter(function (el) { return !el.classList.contains("is-in"); })); }
  if (still() || document.hidden || !("IntersectionObserver" in window)) showAll();
  else {
    var tio = new IntersectionObserver(function (es) {
      var now = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      now.sort(function (a, b) { return tiles.indexOf(a) - tiles.indexOf(b); });
      now.forEach(function (el) { tio.unobserve(el); });
      showTiles(now);
    }, { rootMargin: "0px 0px -6% 0px", threshold: .2 });
    tiles.forEach(function (el) { tio.observe(el); });
  }
  /* each tile leans toward the pointer, a light where it points */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine) tiles.forEach(function (el) {
    var a = el.firstElementChild;
    a.addEventListener("pointermove", function (e) {
      if (still()) return;
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      a.style.setProperty("--ry", ((x - .5) * 12).toFixed(1) + "deg");
      a.style.setProperty("--rx", ((.5 - y) * 10).toFixed(1) + "deg");
      a.style.setProperty("--gx", (x * 100).toFixed(0) + "%");
      a.style.setProperty("--gy", (y * 100).toFixed(0) + "%");
    });
    a.addEventListener("pointerleave", function () { ["--rx", "--ry", "--gx", "--gy"].forEach(function (p) { a.style.removeProperty(p); }); });
  });
  /* a sector's key lights its tiles; the link itself still opens that sector on the brands page */
  document.querySelectorAll("[data-key]").forEach(function (k) {
    function on() { k.classList.add("is-on"); tiles.forEach(function (el) { el.classList.toggle("is-dim", el.getAttribute("data-sector") !== k.getAttribute("data-key")); }); }
    function off() { k.classList.remove("is-on"); tiles.forEach(function (el) { el.classList.remove("is-dim"); }); }
    if (fine) { k.addEventListener("pointerenter", on); k.addEventListener("pointerleave", off); }
    k.addEventListener("focus", on);
    k.addEventListener("blur", off);
  });

  /* ---------------------------------------------------------------- the sentence lights word by word; the stack sinks card by card */
  var words = [].slice.call(document.querySelectorAll("[data-say] .w"));
  var stack = document.querySelector("[data-stack]");
  var cards = [].slice.call(document.querySelectorAll("[data-card]"));
  var labels = cards.map(function (c) { return c.querySelector("[data-tilt]"); });
  function frame() {
    var vh = window.innerHeight, calm = still();
    if (top) {
      top.classList.toggle("is-scrolled", window.scrollY > 24);
      var dark = false, probe = 36;
      for (var d = 0; d < darks.length; d++) {
        var r = darks[d].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { dark = true; break; }
      }
      top.classList.toggle("is-dark", dark);
    }
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (calm) { w.style.setProperty("--p", 1); continue; }
      var y = w.getBoundingClientRect().top;
      w.style.setProperty("--p", Math.max(0, Math.min(1, (vh * .62 - y) / (vh * .12) + .5)).toFixed(2));
    }
    for (var k = 0; k < cards.length; k++) {
      var card = cards[k], next = cards[k + 1], inner = card.firstElementChild, s = 1, b = 1;
      if (next && !calm) {
        var a = card.getBoundingClientRect(), n = next.getBoundingClientRect();
        var cover = Math.max(0, Math.min(1, (a.bottom - n.top) / a.height));
        s = 1 - cover * .08; b = 1 - cover * .35;
      }
      inner.style.setProperty("--s", s.toFixed(4));
      inner.style.setProperty("--b", b.toFixed(3));
      var l = labels[k];
      if (l) {
        var rr = card.getBoundingClientRect(), t = calm ? 0 : Math.max(-1, Math.min(1, (rr.top + rr.height / 2 - vh / 2) / vh));
        l.style.setProperty("--ty", (t * -60).toFixed(1) + "px");
        l.style.setProperty("--tr", (t * -8 - 3).toFixed(2) + "deg");
      }
    }
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; raf(function () { ticking = false; frame(); }); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  frame();

  /* the label tilts toward the pointer, like cloth lifted at a corner */
  cards.forEach(function (card, k) {
    var l = labels[k];
    if (!l) return;
    card.addEventListener("pointermove", function (e) {
      if (still() || e.pointerType === "touch") return;
      var r = l.getBoundingClientRect();
      l.style.setProperty("--ry", (((e.clientX - r.left) / r.width - .5) * 16).toFixed(1) + "deg");
      l.style.setProperty("--rx", (((e.clientY - r.top) / r.height - .5) * -12).toFixed(1) + "deg");
    });
    card.addEventListener("pointerleave", function () { l.style.removeProperty("--rx"); l.style.removeProperty("--ry"); });
  });

  /* phones: the cards stack only when every one of them fits under the header on this screen */
  function fit() {
    if (!stack) return;
    stack.classList.remove("stack--stick");
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    var room = window.innerHeight - 70 - cards.length * 4 - 12;
    for (var i = 0; i < cards.length; i++) if (cards[i].offsetHeight > room) return;
    stack.classList.add("stack--stick");
  }
  fit();
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); frame(); });

  /* a tile or a sector lands on its card as it sits stuck, not where a sticky card's anchor would put it */
  function landOn(card) {
    var k = cards.indexOf(card), y = stack.getBoundingClientRect().top + window.scrollY;
    for (var j = 0; j < k; j++) y += cards[j].offsetHeight + (parseFloat(getComputedStyle(cards[j]).marginBottom) || 0);
    var cs = getComputedStyle(card), stuck = cs.position === "sticky" ? parseFloat(cs.top) || 0 : topH() + 12;
    window.scrollTo({ top: Math.max(0, y - stuck + 2), behavior: still() ? "auto" : "smooth" });
  }
  document.querySelectorAll("[data-jump]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var card = document.getElementById(a.getAttribute("href").slice(1));
      if (!card || cards.indexOf(card) < 0) return;
      e.preventDefault();
      history.replaceState(null, "", a.getAttribute("href"));
      landOn(card);
    });
  });
  if (location.hash && cards.length) {
    var at = document.getElementById(location.hash.slice(1));
    if (at && cards.indexOf(at) >= 0) setTimeout(function () { var bh = doc.style.scrollBehavior; doc.style.scrollBehavior = "auto"; landOn(at); doc.style.scrollBehavior = bh; }, 60);
  }

  /* ---------------------------------------------------------------- reveal on entry: the map's routes, the figures, the pillars */
  var targets = [].slice.call(document.querySelectorAll("[data-reveal], [data-map]"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .15 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("is-in"); });
  }

  /* ---------------------------------------------------------------- the loom under the number: threads over and under, lit by the pointer */
  var looms = [];
  function Loom(canvas) {
    var host = canvas.parentElement, ctx = canvas.getContext("2d"), self = this;
    var base = document.createElement("canvas"), lit = document.createElement("canvas");
    var w = 0, h = 0, dpr = 1, px = -1, py = -1, lx = 0, ly = 0, loop = 0, visible = false, t0 = performance.now();
    function weave(c, alpha) {
      var g = c.getContext("2d"), s = 15, gap = 3, i, j, x, y;
      g.clearRect(0, 0, c.width, c.height);
      g.save(); g.scale(dpr, dpr);
      g.strokeStyle = "rgba(255,255,255," + alpha + ")"; g.lineWidth = 1;
      var cols = Math.ceil(w / s) + 1, rows = Math.ceil(h / s) + 1;
      g.beginPath();
      for (j = 0; j < rows; j++) {
        y = j * s + .5;
        for (i = 0; i < cols; i++) { x = i * s; g.moveTo(x + ((i + j) % 2 === 0 ? 0 : gap), y); g.lineTo(x + s - ((i + 1 + j) % 2 === 0 ? 0 : gap), y); }
      }
      for (i = 0; i < cols; i++) {
        x = i * s + .5;
        for (j = 0; j < rows; j++) { y = j * s; g.moveTo(x, y + ((i + j) % 2 === 1 ? gap : 0)); g.lineTo(x, y + s - ((i + j + 1) % 2 === 1 ? gap : 0)); }
      }
      g.stroke(); g.restore();
    }
    function size() {
      var r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2); w = r.width; h = r.height;
      [canvas, base, lit].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
      weave(base, .03); weave(lit, .34);
      self.draw();
    }
    this.draw = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      if (still()) return;
      var t = (performance.now() - t0) / 1000;
      var gx = px >= 0 ? px : w * (.7 + .16 * Math.sin(t * .23)), gy = py >= 0 ? py : h * (.45 + .2 * Math.cos(t * .31));
      lx += (gx - lx) * .08; ly += (gy - ly) * .08;
      var r = Math.max(200, Math.min(w, h) * .45);
      var grd = ctx.createRadialGradient(lx * dpr, ly * dpr, 0, lx * dpr, ly * dpr, r * dpr);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(lit, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "destination-over";
      ctx.drawImage(base, 0, 0);
      ctx.restore();
    };
    function tick() { loop = 0; if (!visible || still()) return; self.draw(); loop = requestAnimationFrame(tick); }
    function kick() { if (!loop && visible && !still()) loop = requestAnimationFrame(tick); }
    host.addEventListener("pointermove", function (e) { var r = host.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; kick(); });
    host.addEventListener("pointerleave", function () { px = py = -1; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(host);
    window.addEventListener("resize", size);
    size(); lx = w * .7; ly = h * .45;
  }
  document.querySelectorAll("canvas.loom").forEach(function (c) { if (c.getContext) looms.push(new Loom(c)); });

  /* ---------------------------------------------------------------- the brands page: filter by sector, the filter in the address */
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
        var y = bar.getBoundingClientRect().top + window.scrollY - topH();
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
    var first = location.hash.slice(1);
    apply(first || "all", false);
    if (first && keys.indexOf(first) > 0) setTimeout(function () {
      var y = bar.getBoundingClientRect().top + window.scrollY - topH();
      window.scrollTo({ top: Math.max(0, y - 10), behavior: "auto" });
    }, 0);
  }
})();
