// record.js: the register of selected projects — filtered by area of work and by organisation, each row with a place
// on the map sent there.

export function initRecord(sec, data) {
  const rows = [...sec.querySelectorAll("tbody tr")];
  const count = sec.querySelector(".rec-count");
  const sel = sec.querySelector("select[name=org]");
  let area = "all";
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

  function apply() {
    const org = sel.value;
    let n = 0;
    for (const r of rows) {
      const areas = r.dataset.areas.split(" ");
      const ok = (area === "all" || areas.includes(area)) && (org === "all" || r.dataset.org === org);
      r.classList.toggle("hide", !ok);
      if (ok) n++;
    }
    count.textContent = fmt(data.t.recCount, { n, total: rows.length });
  }
  for (const b of sec.querySelectorAll(".rec-area .chip")) {
    b.addEventListener("click", () => {
      area = b.dataset.area;
      for (const c of sec.querySelectorAll(".rec-area .chip")) c.setAttribute("aria-pressed", c === b ? "true" : "false");
      apply();
    });
  }
  sel.addEventListener("change", apply);
  for (const b of sec.querySelectorAll(".go")) {
    b.addEventListener("click", () => {
      const target = document.getElementById("plan");
      target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      dispatchEvent(new CustomEvent("alsadq:locate", { detail: { gov: b.dataset.gov, places: b.dataset.places.split(" ") } }));
    });
  }
  apply();
}
