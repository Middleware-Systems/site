/* ALZAYED v2 — the moments (7 Nov 2026): a gallery lamp over the brands, plates that tilt into the light, seams that sew
   themselves between chapters, photographs revealed like a curtain drawn, headlines rising word by word, a brass ring
   for a cursor. Enhancements only: with reduced motion, or without a fine pointer, the page is complete without them. */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const io = (els, fn, margin = "0px 0px -12% 0px") => {
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { fn(e.target); o.unobserve(e.target); } }), { rootMargin: margin });
    els.forEach(el => o.observe(el));
  };

  // ── headlines rise, word by word (a word is never split: Arabic keeps its joins) ─────────────────────────────────
  $$(".title, .statement, .hero__title").forEach(h => {
    const parts = [];
    [...h.childNodes].forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(t => parts.push(t));
      else parts.push(n);
    });
    h.textContent = "";
    let i = 0;
    parts.forEach(p => {
      if (typeof p === "string" && (!p || /^\s+$/.test(p))) { if (p) h.appendChild(document.createTextNode(p)); return; }
      const outer = document.createElement("span"), inner = document.createElement("span");
      outer.className = "wr"; inner.style.setProperty("--i", i++);
      if (typeof p === "string") inner.textContent = p; else inner.appendChild(p);
      outer.appendChild(inner); h.appendChild(outer);
    });
    h.classList.add("rises");
  });
  io($$(".rises:not(.hero__title)"), el => el.classList.add("risen"));
  const ht = document.querySelector(".hero__title");
  if (ht) setTimeout(() => ht.classList.add("risen"), 700);

  // ── photographs drawn open like a curtain ──────────────────────────────────────────────────────────────────────────
  const curtains = $$(".split__media, .workwear__media, .banner");
  curtains.forEach(c => c.classList.add("curtain"));
  io(curtains, el => el.classList.add("drawn"), "0px 0px -8% 0px");

  // ── seams that sew themselves, a needle running the thread ─────────────────────────────────────────────────────────
  const seams = $$("[data-seam]").map(host => {
    const s = document.createElement("div");
    s.className = "seam"; s.setAttribute("aria-hidden", "true");
    s.innerHTML = '<i class="seam__thread"></i><i class="seam__needle"></i>';
    host.prepend(s);
    return s;
  });
  const sew = () => {
    const vh = innerHeight;
    for (const s of seams) {
      const r = s.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) continue;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.55)));
      s.style.setProperty("--s", p.toFixed(4));
    }
  };
  addEventListener("scroll", sew, { passive: true }); addEventListener("resize", sew); sew();

  if (!fine) return;

  // ── the gallery lamp: a warm pool of light that follows the pointer across the claret wall ─────────────────────────
  const wall = document.querySelector(".portfolio");
  if (wall) {
    wall.addEventListener("pointermove", e => {
      const r = wall.getBoundingClientRect();
      wall.style.setProperty("--lx", `${(e.clientX - r.left).toFixed(0)}px`);
      wall.style.setProperty("--ly", `${(e.clientY - r.top).toFixed(0)}px`);
      wall.classList.add("lit");
    });
    wall.addEventListener("pointerleave", () => wall.classList.remove("lit"));
  }

  // ── plates tilt into the light, a sheen crossing their glass ───────────────────────────────────────────────────────
  $$(".portfolio .plate, .workwear__logos .plate").forEach(pl => {
    pl.addEventListener("pointermove", e => {
      const r = pl.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      pl.style.setProperty("--tx", (x * 9).toFixed(2) + "deg");
      pl.style.setProperty("--ty", (-y * 7).toFixed(2) + "deg");
      pl.style.setProperty("--sx", ((x + 0.5) * 100).toFixed(1) + "%");
      pl.classList.add("tilting");
    });
    pl.addEventListener("pointerleave", () => { pl.classList.remove("tilting"); pl.style.removeProperty("--tx"); pl.style.removeProperty("--ty"); });
  });

  // ── a brass ring for a cursor, that opens over what can be taken ───────────────────────────────────────────────────
  const ring = document.createElement("div");
  ring.className = "ring"; ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(ring);
  let mx = -100, my = -100, cx = -100, cy = -100;
  addEventListener("pointermove", e => {
    mx = e.clientX; my = e.clientY;
    const t = e.target.closest && e.target.closest("a, button, .plate, .chrono");
    ring.classList.toggle("open", !!t);
    ring.classList.toggle("grab", !!(t && t.classList && t.classList.contains("chrono")));
  }, { passive: true });
  addEventListener("pointerdown", () => ring.classList.add("press"));
  addEventListener("pointerup", () => ring.classList.remove("press"));
  document.addEventListener("pointerleave", () => { mx = my = -100; });
  const follow = () => {
    cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
    ring.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    requestAnimationFrame(follow);
  };
  follow();
})();
