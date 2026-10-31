/* Sab Pure Trading — the page's motion. Everything here only adds to a page that reads complete without it. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  function still() { return reduce.matches || root.classList.contains("still"); }
  function raf(f) { return document.hidden || !window.requestAnimationFrame ? setTimeout(f, 16) : window.requestAnimationFrame(f); }

  /* the pause button — WCAG 2.2.2: everything that moves on its own can be stopped */
  var btn = document.querySelector("[data-motion]");
  function paint() {
    if (!btn) return;
    var off = root.classList.contains("still");
    btn.setAttribute("aria-pressed", off ? "true" : "false");
    var label = off ? btn.getAttribute("data-play") : btn.getAttribute("data-pause");
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.querySelector(".sr").textContent = label;
  }
  if (btn) {
    if (reduce.matches) root.classList.add("still");
    paint();
    btn.addEventListener("click", function () {
      root.classList.toggle("still");
      try { localStorage.setItem("sp-motion", root.classList.contains("still") ? "off" : "on"); } catch (e) {}
      paint();
    });
  }

  /* the intro: once, after first paint */
  var hero = document.querySelector("[data-hero]");
  /* rAF never fires in a background tab, so a timer starts it too; whichever comes first wins */
  function start() { if (hero) hero.classList.add("is-in"); }
  raf(function () { raf(start); });
  setTimeout(start, 80);

  /* header: solid once scrolled, light on dark sections */
  var top = document.querySelector("[data-top]");
  var darks = [].slice.call(document.querySelectorAll(".band, .orig, .order, .foot"));

  /* hero parallax: the products follow the pointer, each at its own depth */
  var pics = [].slice.call(document.querySelectorAll(".facing__pic"));
  if (hero && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var tx = 0, ty = 0, pending = false;
    hero.addEventListener("pointermove", function (e) {
      if (still()) return;
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
      if (pending) return;
      pending = true;
      raf(function () {
        pending = false;
        pics.forEach(function (p) {
          var d = parseFloat(p.getAttribute("data-depth")) || 1;
          var img = p.firstElementChild;
          img.style.setProperty("--px", (tx * 10 * d).toFixed(1) + "px");
          img.style.setProperty("--py", (ty * 8 * d).toFixed(1) + "px");
        });
      });
    });
  }

  /* the statement: each word lights as it crosses the middle of the screen */
  var words = [].slice.call(document.querySelectorAll("[data-say] .w"));
  /* the stack: a card covered by the next one sinks back */
  var cards = [].slice.call(document.querySelectorAll("[data-card]"));
  var arts = cards.map(function (c) { return c.querySelector(".card__img"); });

  function frame() {
    var vh = window.innerHeight;
    if (top) {
      top.classList.toggle("is-scrolled", window.scrollY > 24);
      var dark = false, probe = 36;
      for (var d = 0; d < darks.length; d++) {
        var r = darks[d].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { dark = true; break; }
      }
      top.classList.toggle("is-dark", dark);
    }
    if (words.length) {
      var lit = still() ? null : vh * .62;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (lit === null) { w.style.setProperty("--p", 1); continue; }
        var y = w.getBoundingClientRect().top;
        var p = Math.max(0, Math.min(1, (lit - y) / (vh * .12) + .5));
        w.style.setProperty("--p", p.toFixed(2));
      }
    }
    for (var k = 0; k < cards.length; k++) {
      var card = cards[k], next = cards[k + 1], inner = card.firstElementChild;
      var s = 1, b = 1;
      if (next && !still()) {
        var a = card.getBoundingClientRect(), n = next.getBoundingClientRect();
        var cover = Math.max(0, Math.min(1, (a.bottom - n.top) / a.height));
        s = 1 - cover * .08;
        b = 1 - cover * .35;
      }
      inner.style.setProperty("--s", s.toFixed(4));
      inner.style.setProperty("--b", b.toFixed(3));
      var art = arts[k];
      if (art && !still()) {
        var rr = card.getBoundingClientRect();
        var t = (rr.top + rr.height / 2 - vh / 2) / vh;
        art.style.setProperty("--ty", (t * -60).toFixed(1) + "px");
        art.style.setProperty("--tr", (t * -8).toFixed(2) + "deg");
      }
    }
  }
  /* phones: the cards stack only when every one of them fits under the header on this screen */
  var stack = document.querySelector("[data-stack]");
  function fit() {
    if (!stack) return;
    var narrow = window.matchMedia("(max-width: 760px)").matches;
    stack.classList.remove("stack--stick");
    if (!narrow) return;
    var room = window.innerHeight - 70 - cards.length * 6 - 8;
    for (var i = 0; i < cards.length; i++) if (cards[i].offsetHeight > room) return;
    stack.classList.add("stack--stick");
  }
  fit();
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; raf(function () { ticking = false; frame(); }); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  frame();

  /* reveal on entry: the map's routes, the pillars */
  var targets = [].slice.call(document.querySelectorAll("[data-reveal], [data-map]"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .15 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("is-in"); });
  }
})();
