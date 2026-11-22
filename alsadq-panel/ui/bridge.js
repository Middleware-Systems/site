/* bridge.js — runs inside a preview of the client's site (its own origin), before the site's own scripts.
 *
 * The preview build carries an invisible id at both ends of every editable string (server/markers.py). This script
 * finds them, tags the element that holds each string, strips every marker so the site's scripts see clean text,
 * and then talks to the panel by postMessage only: what is on the page, what was clicked, where the reader scrolled.
 * The panel sends back live edits (text, a picture) so the page changes as the client types, before any rebuild.
 */
(() => {
  const me = document.currentScript;
  const PANEL = me && (me.dataset.panel || location.origin);     // a static demo: the panel shares the page's origin
  const T = 0xE0000;
  const S_OPEN = 0xE005B, S_CLOSE = 0xE005D, E_OPEN = 0xE007B, E_CLOSE = 0xE007D;
  const isTag = (cp) => cp >= 0xE0020 && cp <= 0xE007E;
  const framed = window.parent !== window && !!PANEL;

  // ── 1. read the markers out of every text node and attribute ─────────────────────────────────────────────────
  const where = new Map();          // id → {s: Text, so, e: Text, eo}
  const attrs = [];                 // {el, name, ids}
  function scan(str, onMark) {
    // returns the string without markers; calls onMark(kind, id, offsetInCleanString)
    let out = "", i = 0;
    const cps = Array.from(str);
    while (i < cps.length) {
      const cp = cps[i].codePointAt(0);
      if (cp === S_OPEN || cp === E_OPEN) {
        let j = i + 1, n = "";
        while (j < cps.length && isTag(cps[j].codePointAt(0)) && cps[j].codePointAt(0) !== S_CLOSE && cps[j].codePointAt(0) !== E_CLOSE) {
          n += String.fromCodePoint(cps[j].codePointAt(0) - T); j++;
        }
        const close = j < cps.length ? cps[j].codePointAt(0) : 0;
        if ((cp === S_OPEN && close === S_CLOSE) || (cp === E_OPEN && close === E_CLOSE)) {
          onMark(cp === S_OPEN ? "s" : "e", parseInt(n, 36), out.length);
          i = j + 1; continue;
        }
      }
      if (!isTag(cp)) out += cps[i];
      i++;
    }
    return out;
  }
  const hasTag = (s) => /[\u{E0020}-\u{E007E}]/u.test(s);

  const tw = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (hasTag(n.data)) texts.push(n);
  for (const node of texts) {
    const inCode = node.parentElement && /^(SCRIPT|STYLE|TITLE|TEXTAREA|NOSCRIPT)$/.test(node.parentElement.tagName);
    const clean = scan(node.data, (kind, id, at) => {
      if (inCode) return;
      const w = where.get(id) || {};
      if (kind === "s") { w.s = node; w.so = at; } else { w.e = node; w.eo = at; }
      where.set(id, w);
    });
    node.data = clean;
  }
  for (const el of document.querySelectorAll("*")) {
    for (const a of Array.from(el.attributes)) {
      if (!hasTag(a.value)) continue;
      const ids = [];
      const clean = scan(a.value, (kind, id) => { if (kind === "s") ids.push(id); });
      el.setAttribute(a.name, clean);
      if (ids.length && !el.closest("head")) attrs.push({ el, name: a.name, ids });
    }
  }

  // ── 2. the element that holds each string ────────────────────────────────────────────────────────────────────
  function lca(a, b) {
    const seen = new Set();
    for (let x = a; x; x = x.parentElement) seen.add(x);
    for (let y = b; y; y = y.parentElement) if (seen.has(y)) return y;
    return null;
  }
  const owners = new Map();         // id → element
  for (const [id, w] of where) {
    if (!w.s || !w.e) continue;
    const el = lca(w.s.parentElement, w.e.parentElement);
    if (!el || el.closest("head")) continue;
    owners.set(id, el);
    el.dataset.mw = (el.dataset.mw ? el.dataset.mw + " " : "") + id;
  }
  for (const a of attrs) a.el.dataset.mwAttr = (a.el.dataset.mwAttr ? a.el.dataset.mwAttr + " " : "") + a.ids.map((i) => `${a.name}:${i}`).join(" ");
  if (!framed) return;

  // ── 3. what each string is, in words the panel can show ──────────────────────────────────────────────────────
  function role(el) {
    const t = el.tagName;
    if (/^H[1-6]$/.test(t)) return "heading";
    if (el.closest("nav")) return "menu";
    if (t === "BUTTON" || el.closest("button")) return "button";
    if (t === "A" || el.closest("a")) return el.closest("a").className.match(/btn|button|cta/i) ? "button" : "link";
    if (t === "LABEL" || el.closest("label")) return "label";
    if (t === "FIGCAPTION" || el.closest("figcaption")) return "caption";
    if (t === "LI" || el.closest("li")) return "item";
    if (t === "Q" || t === "BLOCKQUOTE" || el.closest("q,blockquote")) return "quote";
    if (el.closest("footer")) return "footer";
    if (el.closest("h1,h2,h3,h4,h5,h6")) return "heading";
    return "text";
  }
  function section(el) {
    const box = el.closest("section, header, footer, article, aside, nav, [aria-label]");
    if (!box) return "";
    if (box.tagName === "FOOTER" || box.closest("footer")) return "footer";
    if (box.tagName === "HEADER" || box.tagName === "NAV") return "header";
    // the section's own heading names it — unless that heading is the very text being described
    // the nearest heading above this text, inside its section — never one further down the page
    const hs = [...box.querySelectorAll("h1, h2, h3")].filter((x) => !x.contains(el) && !el.contains(x) &&
      (x.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
    const h = hs[hs.length - 1];
    const s = (box.getAttribute("aria-label") || (h && h.textContent) || "").replace(/\s+/g, " ").trim();
    return s.length > 42 ? s.slice(0, 40) + "…" : s;
  }

  // ── 4. the conversation with the panel ───────────────────────────────────────────────────────────────────────
  let mode = "edit", roles = {}, slots = {}, accent = "#3D7BFF";
  const post = (m) => window.parent.postMessage(m, PANEL);
  const css = document.createElement("style");
  css.textContent = `
    .mw-hover, .mw-sel { position: fixed; pointer-events: none; z-index: 2147483646; border-radius: 6px;
      transition: top .12s, left .12s, width .12s, height .12s, opacity .15s; opacity: 0; }
    .mw-hover { box-shadow: 0 0 0 1.5px var(--mw-a), 0 0 0 4px color-mix(in srgb, var(--mw-a) 18%, transparent); }
    .mw-sel { box-shadow: 0 0 0 2px var(--mw-a), 0 0 0 6px color-mix(in srgb, var(--mw-a) 22%, transparent); }
    .mw-chip { position: fixed; z-index: 2147483647; pointer-events: none; font: 600 11px/1 -apple-system, system-ui, "Segoe UI", sans-serif;
      letter-spacing: .02em; color: #fff; background: var(--mw-a); padding: 5px 7px; border-radius: 6px; opacity: 0;
      transition: opacity .15s; white-space: nowrap; }
    html.mw-edit [data-mw], html.mw-edit img[data-mw-slot] { cursor: text; }
    html.mw-edit img[data-mw-slot] { cursor: pointer; }
    html.mw-edit a[href] { cursor: default; }`;
  document.head.appendChild(css);
  const hover = document.createElement("div"); hover.className = "mw-hover";
  const sel = document.createElement("div"); sel.className = "mw-sel";
  const chip = document.createElement("div"); chip.className = "mw-chip";
  document.addEventListener("DOMContentLoaded", () => document.body.append(hover, sel, chip));
  let selected = null, hovered = null;

  function place(box, el, show) {
    if (!el || !show) { box.style.opacity = 0; return; }
    const r = el.getBoundingClientRect();
    const pad = 4;
    Object.assign(box.style, { top: r.top - pad + "px", left: r.left - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px", opacity: 1 });
  }
  function target(e) {
    const img = e.target.closest && e.target.closest("img[data-mw-slot]");
    const txt = e.target.closest && e.target.closest("[data-mw]");
    if (txt && (!img || txt.contains(img) === false || img.contains(txt))) return txt;
    return img || txt;
  }
  function label(el) {
    if (el.dataset.mwSlot) return roles.picture || "Picture";
    return roles[role(el)] || role(el);
  }
  document.addEventListener("mouseover", (e) => {
    if (mode !== "edit") return;
    hovered = target(e);
    place(hover, hovered, !!hovered && hovered !== selected);
    if (hovered) {
      chip.textContent = label(hovered);
      const r = hovered.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      Object.assign(chip.style, { top: Math.max(4, r.top - 26) + "px", left: rtl ? "" : Math.max(4, r.left - 4) + "px",
        right: rtl ? Math.max(4, innerWidth - r.right - 4) + "px" : "", opacity: hovered === selected ? 0 : 1 });
    } else chip.style.opacity = 0;
  }, true);
  document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) { place(hover, null); chip.style.opacity = 0; } }, true);
  addEventListener("scroll", () => { place(hover, hovered, hovered && hovered !== selected && mode === "edit"); place(sel, selected, !!selected && mode === "edit"); chip.style.opacity = 0; scrolled(); }, { passive: true });
  addEventListener("resize", () => place(sel, selected, !!selected && mode === "edit"));

  let st = 0;
  function scrolled() { clearTimeout(st); st = setTimeout(() => post({ type: "mw:scroll", y: scrollY, path: here() }), 150); }
  function here() {
    const m = location.pathname.match(/^\/b\/[\w-]+\/(.*)$/);
    return m ? decodeURIComponent(m[1]) : location.pathname;
  }

  function ids(el, e) {
    const all = (el.dataset.mw || "").split(" ").filter(Boolean).map(Number);
    if (!e || all.length < 2 || !document.caretRangeFromPoint) return all;
    const r = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!r) return all;
    const hit = all.find((n) => { const w = where.get(n); return w && w.s === r.startContainer && w.e === r.startContainer && r.startOffset >= w.so && r.startOffset <= w.eo; });
    return hit != null ? [hit, ...all.filter((n) => n !== hit)] : all;
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (mode === "edit") {
      const t = target(e);
      if (t) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        select(t);
        const r = t.getBoundingClientRect();
        if (t.dataset.mwSlot) post({ type: "mw:pick", slot: t.dataset.mwSlot, rect: [r.left, r.top, r.width, r.height] });
        else post({ type: "mw:pick", ids: ids(t, e), rect: [r.left, r.top, r.width, r.height] });
        return;
      }
      if (a) { e.preventDefault(); return; }
      return;
    }
    if (a) {
      const u = new URL(a.getAttribute("href"), location.href);
      if (u.origin === location.origin && u.pathname.startsWith(location.pathname.split("/").slice(0, 3).join("/"))) {
        if (u.pathname === location.pathname && u.hash) return;     // an anchor on the same page scrolls as usual
        e.preventDefault();
        const m = u.pathname.match(/^\/b\/[\w-]+\/(.*)$/);
        post({ type: "mw:nav", path: m ? decodeURIComponent(m[1]) : "", hash: u.hash });
      } else { e.preventDefault(); post({ type: "mw:outside", href: u.href }); }
    }
  }, true);
  for (const ev of ["submit"]) document.addEventListener(ev, (e) => { e.preventDefault(); }, true);

  function select(el) {
    selected = el;
    place(sel, el, mode === "edit");
    place(hover, null);
    chip.style.opacity = 0;
  }

  // the panel's live edits
  function setText(n, text) {
    const w = where.get(n);
    if (w && w.s === w.e && w.s.isConnected) {
      const d = w.s.data;
      const len = w.eo - w.so;
      w.s.data = d.slice(0, w.so) + text + d.slice(w.so + len);
      const delta = text.length - len;
      for (const [k, o] of where) if (k !== n && o.s === w.s && o.so > w.so) { o.so += delta; o.eo += delta; }
      w.eo = w.so + text.length;
      return true;
    }
    const el = owners.get(n);
    if (el && el.isConnected && ids(el).length === 1 && !el.querySelector("img,svg,canvas,video,input,select,textarea")) {
      el.textContent = text;
      return true;
    }
    return false;
  }
  addEventListener("message", (e) => {
    if (e.origin !== PANEL || e.source !== window.parent) return;
    const m = e.data || {};
    if (m.type === "mw:init") {
      mode = m.mode || "edit"; roles = m.roles || {}; slots = m.slots || {}; accent = m.accent || accent;
      document.documentElement.style.setProperty("--mw-a", accent);
      document.documentElement.classList.toggle("mw-edit", mode === "edit");
      tagImages();
      if (m.scroll) requestAnimationFrame(() => scrollTo({ top: m.scroll, behavior: "instant" }));
      if (m.hash) { const t = document.getElementById(m.hash.slice(1)); if (t) t.scrollIntoView({ behavior: "instant" }); }
      report();
    } else if (m.type === "mw:mode") {
      mode = m.mode;
      document.documentElement.classList.toggle("mw-edit", mode === "edit");
      if (mode !== "edit") { place(sel, null); place(hover, null); chip.style.opacity = 0; }
    } else if (m.type === "mw:select") {
      const el = m.slot ? document.querySelector(`img[data-mw-slot="${CSS.escape(m.slot)}"]`) : [...owners.entries()].find(([k]) => m.ids && m.ids.includes(k))?.[1];
      if (el) {
        if (m.scroll !== false) el.scrollIntoView({ block: "center", behavior: m.smooth ? "smooth" : "instant" });
        setTimeout(() => select(el), m.smooth ? 350 : 0);
      } else select(null);
    } else if (m.type === "mw:clear") {
      select(null);
    } else if (m.type === "mw:patch") {
      for (const p of m.items || []) {
        if (p.attr) {
          for (const a of attrs) if (a.ids.includes(p.id) && a.name === p.attr) a.el.setAttribute(a.name, p.text);
        } else setText(p.id, p.text);
      }
      if (selected) place(sel, selected, mode === "edit");
    } else if (m.type === "mw:img") {
      const url = URL.createObjectURL(new Blob([m.buffer], { type: m.mime || "image/webp" }));
      for (const img of document.querySelectorAll("img")) {
        const s = (img.getAttribute("src") || "") + " " + (img.getAttribute("srcset") || "");
        if (m.files.some((f) => s.includes(f))) {
          img.removeAttribute("srcset"); img.removeAttribute("sizes");
          const pic = img.closest("picture");
          if (pic) pic.querySelectorAll("source").forEach((x) => x.remove());
          img.src = url;
        }
      }
    }
  });

  function tagImages() {
    for (const img of document.querySelectorAll("img")) {
      const s = (img.getAttribute("src") || "") + " " + (img.getAttribute("srcset") || "");
      for (const [slot, files] of Object.entries(slots)) {
        if (files.some((f) => s.includes("/" + f) || s.startsWith(f) || s.includes(" " + f))) { img.dataset.mwSlot = slot; break; }
      }
    }
  }
  function report() {
    const fields = [];
    for (const [id, el] of owners) {
      // "not visible" means made for screen readers or folded away — not words waiting for their entrance animation
      const r = el.getBoundingClientRect();
      const host = el.closest("a") || el;
      const sr = [...host.classList, ...el.classList].some((c) => /^(sr-only|visually-hidden|screen-reader-text|skip|skip-link|sr)$/.test(c));
      const cs = getComputedStyle(host);
      const clipped = cs.clip === "rect(0px, 0px, 0px, 0px)" || cs.clipPath === "inset(50%)" || (cs.position === "absolute" && (r.width <= 1 || r.height <= 1));
      fields.push({ id, role: role(el), section: section(el), vis: !sr && !clipped && (r.width > 0 || r.height > 0) });
    }
    const imgs = [...document.querySelectorAll("img[data-mw-slot]")].map((i) => i.dataset.mwSlot);
    post({ type: "mw:ready", path: here(), lang: document.documentElement.lang, dir: document.documentElement.dir,
           fields, attrs: attrs.map((a) => ({ name: a.name, ids: a.ids })), imgs, title: document.title });
  }
  post({ type: "mw:hello", path: here() });
})();
