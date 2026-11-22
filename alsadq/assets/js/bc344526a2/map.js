// map.js: where we work. The governorates are drawn at build time from the UN/OCHA boundaries, each shaded when it
// holds a project of ours (counted from the projects' governorates; a project in two counts in both). A survey line
// sweeps them in when the map comes into view; a governorate chosen on the map (pointer, touch, keys) or in the list
// beside it shows its projects; the area chips dim the governorates without a project in that area.
import { count, fill } from "./counts.js";

const RM = matchMedia("(prefers-reduced-motion: reduce)");

export function initMap(sec, data) {
  const svg = sec.querySelector("svg.plan-svg");
  if (!svg) return;
  const govs = [...svg.querySelectorAll(".gov")];
  const igovs = [...svg.querySelectorAll(".igov")];
  const labels = Object.fromEntries([...svg.querySelectorAll(".glabel")].map((t) => [t.dataset.gov, t]));
  const list = [...sec.querySelectorAll(".govlist .gl")];
  const panel = sec.querySelector(".panel");
  const counter = sec.querySelector(".count .n");
  const sweep = svg.querySelector(".sweep");
  const tip = sec.querySelector(".tip");
  const box = sec.querySelector(".mapbox");
  let area = "all", sel = null;
  const inArea = (p) => area === "all" || p.areas.includes(area);
  const held = (key) => data.projects.filter((p) => p.govs.includes(key) && inArea(p));

  function show(key) {
    sel = key;
    for (const g of govs) { const on = g.dataset.gov === key; g.classList.toggle("sel", on); g.setAttribute("aria-pressed", on ? "true" : "false"); }
    for (const g of igovs) g.classList.toggle("sel", g.dataset.gov === key);
    for (const b of list) b.setAttribute("aria-pressed", b.dataset.gov === key ? "true" : "false");
    for (const [k, t] of Object.entries(labels)) t.classList.toggle("sel", k === key);
    const g = data.govs[key], ps = held(key);
    panel.innerHTML = "";
    const h = document.createElement("p"); h.className = "gname"; h.textContent = g.name; panel.append(h);
    const alt = document.createElement("p"); alt.className = "galt"; alt.textContent = g.alt; alt.lang = data.altLang; panel.append(alt);
    const c = document.createElement("p"); c.className = "gcount";
    c.textContent = ps.length ? fill(data.t.count, { count: count(data, "projects", ps.length) }) : data.t.none;
    panel.append(c);
    if (ps.length) {
      // at most five here, each opening its row on the projects page; then one way to all of them
      const ul = document.createElement("ul");
      for (const p of ps.slice(0, data.panelItems || 5)) {
        const li = document.createElement("li"); li.style.setProperty("--c", data.areas[p.areas[0]].color);
        const b = document.createElement("b"); b.textContent = [p.client, p.years.join(" · ")].join(" · ");
        const a = document.createElement("a"); a.href = `${data.projectsUrl}#${p.id}`; a.textContent = p.title;
        li.append(b, a); ul.append(li);
      }
      panel.append(ul);
      const all = document.createElement("a"); all.className = "allin";
      all.href = `${data.projectsUrl}?gov=${encodeURIComponent(key)}${area !== "all" ? `&area=${encodeURIComponent(area)}` : ""}`;
      all.textContent = fill(data.t.allIn, { count: count(data, "projects", ps.length), gov: g.name });
      panel.append(all);
    }
  }

  function filter(a) {
    area = a;
    for (const b of sec.querySelectorAll(".plan-filter .chip")) b.setAttribute("aria-pressed", b.dataset.area === a ? "true" : "false");
    for (const g of [...govs, ...igovs]) g.classList.toggle("off", +g.dataset.n > 0 && held(g.dataset.gov).length === 0);
    for (const b of list) b.querySelector("b").textContent = String(held(b.dataset.gov).length);
    if (sel) show(sel);
  }

  for (const g of govs) {
    g.addEventListener("click", () => show(g.dataset.gov));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(g.dataset.gov); } });
    const place = (e) => { const r = box.getBoundingClientRect(); tip.style.left = `${e.clientX - r.left}px`; tip.style.top = `${e.clientY - r.top}px`; };
    g.addEventListener("pointerenter", (e) => { if (e.pointerType === "touch") return; place(e); tip.textContent = data.govs[g.dataset.gov].name; tip.classList.add("on"); });
    g.addEventListener("pointermove", place);
    g.addEventListener("pointerleave", () => tip.classList.remove("on"));
  }
  for (const b of list) b.addEventListener("click", () => show(b.dataset.gov));
  for (const g of igovs) g.addEventListener("click", () => show(g.dataset.gov));      // with or without projects, as on the map
  for (const b of sec.querySelectorAll(".plan-filter .chip")) b.addEventListener("click", () => filter(b.dataset.area));

  // the survey: a line crosses the country; each governorate with a project is shaded as the line passes its label
  const covered = govs.filter((g) => +g.dataset.n > 0);
  const order = covered.map((g) => ({ g, x: +g.dataset.lx })).sort((a, b) => a.x - b.x);
  const all = govs.map((g) => +g.dataset.lx);
  const sx0 = Math.min(...all) - 40, sx1 = Math.max(...all) + 40;
  const N = covered.length;
  function survey() {
    const t0 = performance.now(), dur = 2200;
    sweep.style.opacity = "1";
    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1), x = sx0 + (sx1 - sx0) * (data.rtl ? 1 - t : t);
      sweep.setAttribute("x1", x); sweep.setAttribute("x2", x);
      let seen = 0;
      for (const { g, x: lx } of order) { const done = data.rtl ? lx >= x : lx <= x; g.classList.toggle("cov", done); if (done) seen++; }
      counter.textContent = String(seen);
      if (t < 1) requestAnimationFrame(step);
      else { sweep.style.opacity = "0"; for (const { g } of order) g.classList.add("cov"); counter.textContent = String(N); }
    };
    requestAnimationFrame(step);
  }
  if (!RM.matches && "IntersectionObserver" in window) {
    for (const { g } of order) g.classList.remove("cov");
    counter.textContent = "0";
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); survey(); } }, { threshold: .3 });
    io.observe(svg);
  }
}
