/* main.js: everything a person operates on the Alzayed pages except the cloth (cloth.js). No library. */
(() => {
  "use strict";
  const root = document.documentElement;
  const rtl = root.dir === "rtl";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const data = JSON.parse(($("#page-data") || {}).textContent || "{}");

  // ── the header: transparent over the cloth, solid after; light or dark by the section beneath it ──────────────
  const bar = $("[data-bar]");
  const hero = $(".hero");
  const sections = $$("[data-theme]").filter(s => s !== bar);
  function paintBar() {
    if (!bar) return;
    const y = (bar.offsetHeight || 64) * 0.5;
    const past = hero ? hero.getBoundingClientRect().bottom <= (bar.offsetHeight || 64) : true;
    bar.classList.toggle("is-solid", past);
    let theme = "dark";
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) theme = s.dataset.theme;
    }
    bar.classList.toggle("on-light", theme === "light");
  }

  // ── the menu ─────────────────────────────────────────────────────────────────────────────────────────────────
  const menu = $("[data-menu]");
  const openBtn = $("[data-menu-open]");
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    openBtn.setAttribute("aria-expanded", String(open));
    if (open) ($("[data-menu-close]", menu) || menu).focus(); else openBtn.focus();
  }
  openBtn && openBtn.addEventListener("click", () => setMenu(true));
  menu && $("[data-menu-close]", menu).addEventListener("click", () => setMenu(false));
  // a chapter chosen in the menu: close it, then take the reader there (the browser's own jump was lost under the
  // menu's scroll lock and the focus going back to the button: check.py B6, 6 Nov 2026)
  $$("[data-menu-link]").forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href").slice(1), target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    menu.hidden = true; document.body.classList.remove("menu-open"); openBtn.setAttribute("aria-expanded", "false");
    target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", "#" + id);
  }));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && menu && !menu.hidden) setMenu(false); });
  menu && menu.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const f = $$("a, button", menu); const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ── the record: filter by relationship, select a name for its caption ──────────────────────────────────────────
  const namesEl = $("[data-names]");
  const cap = $("[data-cap]");
  function select(i) {
    const n = (data.names || [])[i];
    if (!n || !cap) return;
    $$(".nm", namesEl).forEach(b => b.setAttribute("aria-current", String(Number(b.dataset.i) === i)));
    $(".rec-name bdi", cap).textContent = n.name;
    $(".rec-when", cap).innerHTML = n.when;     // our own markup from build.py, isolated for Arabic
    $(".rec-role", cap).innerHTML = n.role;
    cap.dataset.i = String(i);
  }
  if (namesEl) {
    $$(".nm", namesEl).forEach(b => {
      b.addEventListener("click", () => select(Number(b.dataset.i)));
      b.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) select(Number(b.dataset.i)); });
      b.addEventListener("focus", () => select(Number(b.dataset.i)));
    });
    $$(".chip").forEach(c => c.addEventListener("click", () => {
      const g = c.dataset.group;
      $$(".chip").forEach(x => x.setAttribute("aria-pressed", String(x === c)));
      namesEl.classList.toggle("filtered", g !== "all");
      namesEl.dataset.group = g;
      let firstIn = -1;
      $$(".nm", namesEl).forEach(b => {
        const inG = g === "all" || b.dataset.groups.split(" ").includes(g);
        b.classList.toggle("in-group", inG);
        if (inG && firstIn < 0) firstIn = Number(b.dataset.i);
      });
      if (firstIn >= 0) select(firstIn);
    }));
    select(0);
  }

  // ── the chronology: on a wide screen the years roll across as the page scrolls ───────────────────────────────
  const pin = $("[data-chrono]");
  const track = $("[data-track]");
  const prog = $("[data-progress]");
  const wide = matchMedia("(min-width: 861px)");
  function roll() {
    if (!pin || !track) return;
    if (!wide.matches) { track.style.transform = ""; return; }
    const r = pin.getBoundingClientRect();
    const span = pin.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
    const travel = Math.max(0, track.scrollWidth - innerWidth);
    track.style.transform = `translate3d(${(rtl ? 1 : -1) * p * travel}px,0,0)`;
    if (prog) prog.style.transform = `scaleX(${p})`;
    pin.dataset.progress = p.toFixed(3);
  }

  // ── reveal on entering the screen (none under reduced motion: everything is simply there) ─────────────────────
  const rev = $$("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) rev.forEach(el => el.classList.add("in"));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px 6% 0px", threshold: 0.01 });
    rev.forEach(el => io.observe(el));
  }

  // ── the preview pill: show or hide what still waits for the client's confirmation ─────────────────────────────
  const cb = $("[data-claims]");
  cb && cb.addEventListener("click", () => {
    const on = root.classList.toggle("show-claims");
    cb.textContent = on ? cb.dataset.off : cb.dataset.on;
    cb.setAttribute("aria-pressed", String(on));
  });

  let ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; paintBar(); roll(); }); } }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  paintBar(); roll();
})();
