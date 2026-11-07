/* ALZAYED v2 — behaviour (7 Nov 2026). Everything here is an enhancement: with no script the page is complete. */
(() => {
  const doc = document.documentElement;
  doc.classList.add("js");
  const rtl = doc.dir === "rtl";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ── the opening: the A and the Z meet, then the words; the film only when motion is welcome ─────────────────────
  const hero = $(".hero");
  const ready = () => hero && hero.classList.add("is-ready");
  requestAnimationFrame(() => requestAnimationFrame(ready));
  setTimeout(ready, 120);   // a background tab runs no animation frames: the opening must never wait on one
  const film = $(".hero__film");
  const saveData = navigator.connection && navigator.connection.saveData;
  if (film && !reduced && !saveData) {
    // the sharpest film the screen can show: a portrait crop for phones, 2560 where there are pixels for it
    const portrait = innerHeight > innerWidth, px = innerWidth * (devicePixelRatio || 1);
    film.src = portrait ? film.dataset.srcPort : (px > 2000 ? film.dataset.srcXl : film.dataset.srcLg);
    film.addEventListener("playing", () => film.classList.add("is-playing"), { once: true });
    const io = new IntersectionObserver(([e]) => { e.isIntersecting ? film.play().catch(() => {}) : film.pause(); });
    io.observe(film);
  }

  // ── the header: transparent over the hero, ivory after it; the section you are in, underlined ─────────────────────
  const head = $("[data-head]");
  const solid = () => head.classList.toggle("is-solid", scrollY > (hero ? hero.offsetHeight - 90 : 10));
  addEventListener("scroll", solid, { passive: true }); solid();
  const links = $$(".head__nav a");
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle("is-here", a.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach(s => spy.observe(s));

  // ── the menu (narrow screens) ──────────────────────────────────────────────────────────────────────────────────────
  const btn = $(".head__menu"), menu = $("#menu");
  const setMenu = open => {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    $(".head__menu-lbl", btn).textContent = open ? btn.dataset.close : btn.dataset.open;
    document.body.classList.toggle("menu-open", open);
    if (open) $("a", menu).focus();
  };
  btn.addEventListener("click", () => setMenu(menu.hidden));
  addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); btn.focus(); } });
  $$("a", menu).forEach(a => a.addEventListener("click", () => setMenu(false)));

  // in-page links: scroll there (smooth unless motion is unwelcome) and keep the address tidy
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const t = document.getElementById(a.getAttribute("href").slice(1));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", a.getAttribute("href"));
  }));

  // ── reveals ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const rev = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); rev.unobserve(e.target); }
  }), { rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal]").forEach(el => {
    const sib = el.parentElement ? [...el.parentElement.children].filter(c => c.hasAttribute("data-reveal")) : [];
    const i = sib.indexOf(el);
    if (i > 0) el.style.setProperty("--d", Math.min(i, 8) * 0.07 + "s");
    rev.observe(el);
  });

  // ── parallax: pictures drift a little slower than the page ───────────────────────────────────────────────────────
  const par = $$("[data-parallax]").map(box => ({ box, img: $("img", box) })).filter(p => p.img);
  // ── the chronology: pinned on wide screens, the years travel across as you scroll ─────────────────────────────────
  const her = $(".heritage"), track = $(".chrono__track"), rule = $(".chrono__rule");
  const wide = matchMedia("(min-width: 1024px)");
  let span = 0;
  const layout = () => {
    if (!her) return;
    const pin = wide.matches && !reduced;
    her.classList.toggle("is-pinned", pin);
    if (!pin) { track.style.transform = ""; her.style.removeProperty("--pin-h"); return; }
    span = Math.max(0, track.scrollWidth - innerWidth);
    her.style.setProperty("--pin-h", `${innerHeight + span * 1.1}px`);
  };
  layout();
  addEventListener("resize", layout);
  let ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    if (!reduced) for (const { box, img } of par) {
      const r = box.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const k = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
      img.style.transform = `translate3d(0, ${(-k * 9).toFixed(2)}%, 0)`;
    }
    if (her && her.classList.contains("is-pinned")) {
      const r = her.getBoundingClientRect();
      const total = her.offsetHeight - vh;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      track.style.transform = `translate3d(${(rtl ? 1 : -1) * p * span}px, 0, 0)`;
      if (rule) rule.style.setProperty("--p", p.toFixed(4));
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  // ── the chronology moves both ways (Mazhar, 7 Nov 2026) ─────────────────────────────────────────────────────────────
  // `later(px)` moves the years px toward today. Pinned, it turns the page (the page's scroll is the track's position,
  // so every input stays in step with the vertical wheel); as a strip, it scrolls the strip itself.
  if (her && track) {
    const chrono = $(".chrono"), sign = rtl ? -1 : 1, btns = $$(".chrono__btn");
    const pinned = () => her.classList.contains("is-pinned");
    const range = () => { const top = her.getBoundingClientRect().top + scrollY; return [top, top + her.offsetHeight - innerHeight]; };
    const later = (px, smooth = false) => {
      if (pinned()) {
        const [a, b] = range(), k = (b - a) / Math.max(1, span);
        const to = Math.min(b, Math.max(a, scrollY + px * k));
        if (Math.abs(to - scrollY) < 0.5) return false;
        scrollTo({ top: to, behavior: smooth && !reduced ? "smooth" : "auto" });
        return true;
      }
      const max = track.scrollWidth - track.clientWidth, now = Math.abs(track.scrollLeft);
      if ((px > 0 && now >= max - 1) || (px < 0 && now <= 1)) return false;
      track.scrollBy({ left: px * sign, behavior: smooth && !reduced ? "smooth" : "auto" });
      return true;
    };
    const step = () => { const e = $(".era", track); return e ? e.getBoundingClientRect().width : 360; };
    // a sideways swipe on a trackpad, or shift + wheel: pinned, it turns the page; a strip scrolls natively
    her.addEventListener("wheel", e => {
      if (!pinned() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (later(e.deltaX * sign)) e.preventDefault();
    }, { passive: false });
    // a drag with the mouse (or a finger on a pinned, touch-screen laptop); a strip on a phone scrolls natively
    let drag = null, moved = false;
    chrono.addEventListener("pointerdown", e => {
      if (e.button !== 0 || e.target.closest("a, button")) return;
      if (e.pointerType === "touch" && !pinned()) return;
      drag = { x: e.clientX, id: e.pointerId }; moved = false;
    });
    chrono.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) < 4) return;
      if (!moved) { moved = true; chrono.classList.add("is-dragging"); try { chrono.setPointerCapture(e.pointerId); } catch (_) {} }
      later(-dx * sign);
      drag.x = e.clientX;
    });
    const end = () => { if (drag) { drag = null; chrono.classList.remove("is-dragging"); } };
    chrono.addEventListener("pointerup", end); chrono.addEventListener("pointercancel", end);
    chrono.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    // the arrow keys, while the chronology holds the screen
    addEventListener("keydown", e => {
      if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.target.closest && e.target.closest("input, textarea, select")) return;
      const r = her.getBoundingClientRect(), holds = pinned() ? r.top <= 1 && r.bottom >= innerHeight - 1
        : (her.contains(document.activeElement) || (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5));
      if (!holds) return;
      const dir = (e.key === "ArrowRight" ? 1 : -1) * sign;
      if (later(dir * step(), true)) e.preventDefault();
    });
    // the two buttons
    btns.forEach(b => b.addEventListener("click", () => later(+b.dataset.step * step(), true)));
    // the strip's own progress on the brass rule, and the buttons at the ends
    const ends = () => {
      let p;
      if (pinned()) { const [a, b] = range(); p = Math.min(1, Math.max(0, (scrollY - a) / Math.max(1, b - a))); }
      else {
        const max = track.scrollWidth - track.clientWidth;
        p = max > 0 ? Math.abs(track.scrollLeft) / max : 1;
        if (rule) rule.style.setProperty("--p", p.toFixed(4));
      }
      btns[0].disabled = p <= 0.002; btns[1].disabled = p >= 0.998;
    };
    track.addEventListener("scroll", ends, { passive: true });
    addEventListener("scroll", ends, { passive: true });
    addEventListener("resize", ends);
    ends();
  }
  frame();
})();
