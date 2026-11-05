// main.js: the page's wiring — the header's tone, the menu, the drawing, the map, the record, the enquiry, the preview.
import { initSection } from "./section.js";
import { initMap } from "./map.js";
import { initRecord } from "./record.js";
import { initEnquiry } from "./enquiry.js";

const root = document.documentElement;
root.classList.remove("no-js");
const data = JSON.parse(document.getElementById("page-data").textContent);
const RM = matchMedia("(prefers-reduced-motion: reduce)");

// the junction assembles: the mark's three limbs meet
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("boot")));
setTimeout(() => root.classList.remove("boot"), 120);     // a page opened in the background gets no frames: arrive anyway

// the header: transparent over the hero's sky, solid below it, light or dark after the section under it
const hdr = document.querySelector(".hdr");
const toned = [...document.querySelectorAll("main [data-tone], footer[data-tone]")];
function tone() {
  const y = 36;
  let t = "dark";
  for (const el of toned) { const r = el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) t = el.dataset.tone; }
  if (scrollY < 40 && root.classList.contains("night")) t = "dark";
  hdr.dataset.tone = t;
  hdr.classList.toggle("solid", scrollY > 40);
}
addEventListener("scroll", tone, { passive: true });
tone();

// the menu on a phone
const drawer = document.querySelector(".drawer");
const burger = document.querySelector(".burger");
const closeD = () => { drawer.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); drawer.setAttribute("aria-hidden", "true"); };
burger.addEventListener("click", () => { drawer.classList.add("open"); burger.setAttribute("aria-expanded", "true"); drawer.setAttribute("aria-hidden", "false"); drawer.querySelector("a").focus(); });
drawer.querySelector(".x").addEventListener("click", closeD);
for (const a of drawer.querySelectorAll("a")) a.addEventListener("click", closeD);
addEventListener("keydown", (e) => { if (e.key === "Escape") closeD(); });

// the drawing, and day or night in it
const section = initSection(document.querySelector(".stage"));
const note = document.querySelector(".legend .note");
for (const b of document.querySelectorAll(".daynight button")) {
  b.addEventListener("click", () => {
    const night = b.dataset.time === "night";
    for (const o of document.querySelectorAll(".daynight button")) o.setAttribute("aria-pressed", o === b ? "true" : "false");
    section.setNight(night);
    note.textContent = night ? data.t.nightNote : data.t.dayNote;
    tone();
  });
}

initMap(document.getElementById("plan"), data);
initRecord(document.getElementById("record"), data);
initEnquiry(document.querySelector("form.compose"), data);

// the preview pill: the facts still to confirm, drawn where they stand
const pill = document.querySelector(".pill button");
if (pill) pill.addEventListener("click", () => {
  const on = root.classList.toggle("show-claims");
  pill.textContent = on ? data.t.hide : data.t.show;
  pill.setAttribute("aria-pressed", on ? "true" : "false");
});

// what enters the screen eases in
const rv = [...document.querySelectorAll(".rv")];
if (RM.matches || !("IntersectionObserver" in window)) rv.forEach((el) => el.classList.add("in"));
else {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  rv.forEach((el) => io.observe(el));
}
root.dataset.ready = "yes";
