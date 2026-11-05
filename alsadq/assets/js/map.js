// map.js: the plan view. Fourteen governorates drawn at build time from the UN/OCHA boundaries; a survey line sweeps
// them in when the map comes into view and the count runs to fourteen; a governorate selected by pointer, touch or keys
// shows what the selected record holds there; the area filter dims the places it does not hold.

const RM = matchMedia("(prefers-reduced-motion: reduce)");

export function initMap(sec, data) {
  const svg = sec.querySelector("svg.plan-svg");
  if (!svg) return;
  const govs = [...svg.querySelectorAll(".gov")];
  const labels = Object.fromEntries([...svg.querySelectorAll(".glabel")].map((t) => [t.dataset.gov, t]));
  const pins = [...svg.querySelectorAll(".pin")];          // the main map's and the inset's: both follow the filter
  const panel = sec.querySelector(".panel");
  const counter = sec.querySelector(".count .n");
  const sweep = svg.querySelector(".sweep");
  const tip = sec.querySelector(".tip");
  const box = sec.querySelector(".mapbox");
  let area = "all", sel = null;

  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const inArea = (p) => area === "all" || p.area === area || p.also.includes(area);

  function show(key) {
    sel = key;
    for (const g of govs) {
      const on = g.dataset.gov === key;
      g.classList.toggle("sel", on);
      g.setAttribute("aria-pressed", on ? "true" : "false");
    }
    for (const [k, t] of Object.entries(labels)) t.classList.toggle("sel", k === key);
    const g = data.govs[key];
    const list = data.projects.filter((p) => p.gov === key && inArea(p));
    const all = data.projects.filter((p) => p.gov === key);
    panel.innerHTML = "";
    const h = document.createElement("p"); h.className = "gname"; h.textContent = g.name; panel.append(h);
    const alt = document.createElement("p"); alt.className = "galt"; alt.textContent = g.alt; alt.lang = data.altLang; panel.append(alt);
    const c = document.createElement("p"); c.className = "gcount";
    c.textContent = all.length ? fmt(data.t.count, { n: all.length }) : data.t.none;
    panel.append(c);
    if (list.length) {
      const ul = document.createElement("ul");
      for (const p of list) {
        const li = document.createElement("li"); li.style.setProperty("--c", data.areas[p.area].color);
        const b = document.createElement("b"); b.textContent = [p.org, p.place, p.year].filter(Boolean).join(" · ");
        const s = document.createElement("span"); s.textContent = p.work;
        li.append(b, s); ul.append(li);
      }
      panel.append(ul);
    }
    for (const pin of pins) pin.classList.toggle("hot", pin.dataset.gov === key);
  }

  function filter(a) {
    area = a;
    for (const b of sec.querySelectorAll(".plan-filter .chip")) b.setAttribute("aria-pressed", b.dataset.area === a ? "true" : "false");
    for (const pin of pins) pin.classList.toggle("off", !(a === "all" || pin.dataset.areas.split(" ").includes(a)));
    if (sel) show(sel);
  }

  for (const g of govs) {
    g.addEventListener("click", () => show(g.dataset.gov));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(g.dataset.gov); } });
    const place = (e) => {
      const r = box.getBoundingClientRect();
      tip.style.left = `${e.clientX - r.left}px`; tip.style.top = `${e.clientY - r.top}px`;
    };
    g.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      place(e); tip.textContent = data.govs[g.dataset.gov].name; tip.classList.add("on");
    });
    g.addEventListener("pointermove", place);
    g.addEventListener("pointerleave", () => tip.classList.remove("on"));
  }
  for (const pin of pins) pin.addEventListener("click", () => show(pin.dataset.gov));
  for (const b of sec.querySelectorAll(".plan-filter .chip")) b.addEventListener("click", () => filter(b.dataset.area));

  // the record's "on the map" sends its governorate here
  addEventListener("alsadq:locate", (e) => {
    show(e.detail.gov);
    for (const pin of pins) if (e.detail.places.includes(pin.dataset.place)) pin.classList.add("hot");
  });

  // the inset's place names, placed from their measured boxes: eight sides tried around each pin, the side that covers
  // the least of another name, a pin or the rim wins (the most crowded pins choose first)
  function placeNames() {
    const ring = svg.querySelector(".insring");
    if (!ring) return;
    const cx = +ring.getAttribute("cx"), cy = +ring.getAttribute("cy"), R = +ring.getAttribute("r");
    const names = [...svg.querySelectorAll(".inset .plabel[data-px]")];
    const pinBoxes = names.map((t) => { const x = +t.dataset.px, y = +t.dataset.py; return [x - 7, y - 7, x + 7, y + 7]; });
    const city = svg.querySelector(".inset .plabel.city");
    const taken = [...pinBoxes];
    if (city) { const b = city.getBBox(); taken.push([b.x, b.y, b.x + b.width, b.y + b.height]); }
    const crowd = (t) => names.filter((u) => Math.hypot(u.dataset.px - t.dataset.px, u.dataset.py - t.dataset.py) < 70).length;
    const cost = (b) => {
      let c = 0;
      for (const t of taken) c += Math.max(0, Math.min(b[2], t[2]) - Math.max(b[0], t[0])) * Math.max(0, Math.min(b[3], t[3]) - Math.max(b[1], t[1]));
      for (const [x, y] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) c += 40 * Math.max(0, Math.hypot(x - cx, y - cy) - (R - 3));
      return c;
    };
    for (const t of [...names].sort((a, b) => crowd(b) - crowd(a))) {
      const x = +t.dataset.px, y = +t.dataset.py;
      let best = null;
      for (const [dx, dy, anchor] of [[9, 4, "start"], [-9, 4, "end"], [0, -10, "middle"], [0, 17, "middle"], [7, -8, "start"], [7, 15, "start"], [-7, -8, "end"], [-7, 15, "end"],
                                      [0, -20, "middle"], [0, 27, "middle"], [14, -14, "start"], [14, 21, "start"], [-14, -14, "end"], [-14, 21, "end"]]) {
        t.setAttribute("x", x + dx); t.setAttribute("y", y + dy); t.setAttribute("text-anchor", anchor);
        const bb = t.getBBox(), b = [bb.x - 1, bb.y - 1, bb.x + bb.width + 1, bb.y + bb.height + 1];
        const c = cost(b);
        if (!best || c < best.c) best = { c, dx, dy, anchor, b };
        if (c === 0) break;
      }
      t.setAttribute("x", x + best.dx); t.setAttribute("y", y + best.dy); t.setAttribute("text-anchor", best.anchor);
      taken.push(best.b);
    }
  }
  document.fonts?.ready.then(placeNames);

  // the survey: a line crosses the country west to east; each governorate is hatched as the line passes its label
  const order = govs.map((g) => ({ g, x: +g.dataset.lx })).sort((a, b) => a.x - b.x);
  const vb = svg.viewBox.baseVal;
  const sx0 = order[0].x - 40, sx1 = order[order.length - 1].x + 40;   // the line crosses the country, not the sea
  function survey() {
    if (RM.matches) {
      for (const { g } of order) g.classList.add("cov");
      counter.textContent = String(order.length);
      return;
    }
    const t0 = performance.now(), dur = 2200;
    sweep.style.opacity = "1";
    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1), x = sx0 + (sx1 - sx0) * (data.rtl ? 1 - t : t);
      sweep.setAttribute("x1", x); sweep.setAttribute("x2", x);
      const seen = new Set();
      for (const { g, x: lx } of order) { const done = data.rtl ? lx >= x : lx <= x; if (done) { g.classList.add("cov"); seen.add(g.dataset.gov); } }
      counter.textContent = String(seen.size);
      if (t < 1) requestAnimationFrame(step);
      else { sweep.style.opacity = "0"; for (const { g } of order) g.classList.add("cov"); counter.textContent = String(order.length); }
    };
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); survey(); } }, { threshold: .35 });
  io.observe(svg);
}
