// projects.js: the projects page. Every project is in the HTML already (without JavaScript all of them show); this
// filters them (area of work, client, governorate, year, a search), shows twelve at a time with "Show more", keeps the
// counts true, hides a year with nothing left in it, keeps the filters in the address (?area=…&gov=…&client=…&year=…&q=…)
// so a filtered view can be shared and reloaded, and opens #pNN on that project, however far down it is.
import { count, fill } from "./counts.js";

const RM = matchMedia("(prefers-reduced-motion: reduce)");
const KEYS = ["area", "client", "gov", "year"];

// the same normalisation as build.py's norm(): lower case, no diacritics, one alef, ta marbuta, ya, hamza seats
export function norm(s) {
  return s.toLowerCase().replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه")
    .replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/\s+/g, " ").trim();
}

export function initProjects(sec, data) {
  const form = sec.querySelector("form.ptools");
  const items = [...sec.querySelectorAll("li.proj")];
  const groups = [...sec.querySelectorAll(".ygroup")];
  const out = sec.querySelector(".pcount");
  const empty = sec.querySelector(".pempty");
  const more = sec.querySelector("button.more");
  const toggle = sec.querySelector(".ftoggle");
  const badge = sec.querySelector(".fcount");
  const langLinks = [...document.querySelectorAll("a.lang, .drawer a[hreflang]")];
  const step = data.step || 12;
  const f = (n) => form.elements[n];
  let limit = step;

  // the address → the controls; a value the list does not have is ignored, never an error
  function readURL() {
    const u = new URLSearchParams(location.search);
    for (const k of KEYS) {
      const v = u.get(k), sel = f(k);
      sel.value = v && [...sel.options].some((o) => o.value === v) ? v : "all";
    }
    f("q").value = (u.get("q") || "").slice(0, 120);
  }
  // the controls → the address (replaceState: the back button is not filled with every keystroke)
  function writeURL(keepHash) {
    const u = new URLSearchParams();
    for (const k of KEYS) if (f(k).value !== "all") u.set(k, f(k).value);
    if (f("q").value.trim()) u.set("q", f("q").value.trim());
    const qs = u.toString();
    history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : "") + (keepHash ? location.hash : ""));
    for (const a of langLinks) a.href = data.otherUrl + (qs ? `?${qs}` : "");
  }

  function matches(li) {
    const area = f("area").value, client = f("client").value, gov = f("gov").value, year = f("year").value;
    const words = norm(f("q").value).split(" ").filter(Boolean);
    return (area === "all" || li.dataset.areas.split(" ").includes(area))
      && (client === "all" || li.dataset.client === client)
      && (gov === "all" || li.dataset.govs.split(" ").includes(gov))
      && (year === "all" || li.dataset.year === year)
      && words.every((w) => li.dataset.q.includes(w));
  }

  function apply() {
    const hit = items.filter(matches);
    const shown = new Set(hit.slice(0, limit));
    for (const li of items) li.hidden = !shown.has(li);
    for (const g of groups) {
      const inYear = hit.filter((li) => g.contains(li)).length;
      g.hidden = ![...g.querySelectorAll("li.proj")].some((li) => shown.has(li));
      g.querySelector(".yc").textContent = count(data, "projects", inYear);
    }
    // all of them on screen: the count alone («مشروعان»). "Showing 12 of 65" only while some wait; there the count is
    // always over twelve, so the Arabic noun after «من أصل» is never a dual in the wrong case
    const counted = count(data, "projects", hit.length);
    out.textContent = shown.size === hit.length ? counted : fill(data.t.shown, { shown: shown.size, count: counted });
    empty.hidden = hit.length !== 0;
    const left = hit.length - shown.size;
    more.hidden = left <= 0;
    if (left > 0) {
      const n = Math.min(step, left);
      more.textContent = fill(data.t.more, { n, count: count(data, "projects", n) });
    }
    const active = KEYS.filter((k) => f(k).value !== "all").length + (f("q").value.trim() ? 1 : 0);
    badge.hidden = active === 0;
    badge.textContent = String(active);
  }

  // a filter or a search starts again at the first twelve
  const changed = () => { limit = step; apply(); writeURL(); };
  form.addEventListener("input", changed);
  form.addEventListener("change", changed);
  form.addEventListener("reset", () => setTimeout(changed, 0));
  form.addEventListener("submit", (e) => e.preventDefault());
  more.addEventListener("click", () => { limit += step; apply(); });

  // on a phone the filters fold behind one control that says how many are on
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    sec.classList.toggle("fopen", open);
  });

  // #pNN: as many rows as it takes, the project brought into view and marked for a moment
  function reveal() {
    const id = decodeURIComponent(location.hash.slice(1));
    const li = id && items.find((x) => x.id === id);
    if (!li) return;
    if (!matches(li)) { for (const k of KEYS) f(k).value = "all"; f("q").value = ""; writeURL(true); }
    const hit = items.filter(matches);
    limit = Math.max(limit, Math.ceil((hit.indexOf(li) + 1) / step) * step);
    apply();
    li.scrollIntoView({ block: "center", behavior: RM.matches ? "instant" : "smooth" });
    if (!RM.matches) {
      li.classList.remove("mark"); void li.offsetWidth; li.classList.add("mark");
      setTimeout(() => li.classList.remove("mark"), 2400);
    }
  }

  readURL();
  apply();
  writeURL(true);
  if (location.hash) requestAnimationFrame(reveal);
  addEventListener("hashchange", reveal);
}
