// MIDDLEWARE Panel — the client's own site is the interface. Click a word to change it; publish when ready.
import { STR } from "./i18n.js";
import { icon, netIcon, NET } from "./icons.js";

const PREVIEW = document.body.dataset.preview || location.origin;      // a static demo: the previews share the page's origin
const DEMO = !!document.body.dataset.demo;
// on a static host (middlewaresy.com) there is no server: the same interface talks to a stand-in in the browser
const STATIC = document.body.dataset.static ? await import("./static-api.js") : null;
const UI_BASE = new URL(".", import.meta.url).href;
const app = document.getElementById("app");

// ── small tools ──────────────────────────────────────────────────────────────────────────────────────────────────
let L = localStorage.getItem("mw.lang") || (navigator.language || "ar").slice(0, 2);
if (!STR[L]) L = "ar";
const t = (k, vars = {}) => {
  let s = (STR[L] && STR[L][k]) ?? STR.en[k] ?? k;
  for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s;
};
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  for (const k of kids.flat(9)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
const ic = (n, c) => h("span", { html: icon(n, c), style: { display: "contents" } });
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nf = () => new Intl.NumberFormat(L === "ar" ? "ar-u-nu-latn" : "en");
function plural(n, k1, kn) {
  if (n === 1) return t(k1);
  if (L === "ar") {
    if (n === 2) return k1 === "one_change" ? "تغييران غير منشورين" : k1 === "one_item" ? "تغييران" : t(kn, { n });
    if (n > 10) return t(kn, { n: nf().format(n) }).replace("تغييرات", "تغييرًا");
    return t(kn, { n: nf().format(n) });
  }
  return t(kn, { n: nf().format(n) });
}
function sizesWord(n) {
  if (L !== "ar") return `${n} size${n === 1 ? "" : "s"}`;
  return n === 1 ? "مقاس واحد" : n === 2 ? "مقاسان" : `${nf().format(n)} مقاسات`;
}
function when(ts) {
  const d = new Date(ts * 1000), now = new Date();
  const sec = (now - d) / 1000;
  if (sec < 60) return t("ago_now");
  const time = d.toLocaleTimeString(L === "ar" ? "ar-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dd = (day(now) - day(d)) / 864e5;
  if (dd === 0) return `${t("today")} ${time}`;
  if (dd === 1) return `${t("yesterday")} ${time}`;
  return d.toLocaleDateString(L === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" }) + ` · ${time}`;
}
const norm = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[ً-ٰٟـ]/g, "").replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\p{M}/gu, "");

// ── the API ──────────────────────────────────────────────────────────────────────────────────────────────────────
class ApiError extends Error { constructor(status, body) { super(body.error || "error"); this.status = status; this.body = body; } }
let pending = 0;
async function api(method, path, body, raw) {
  if (STATIC) {
    if (method !== "GET") { pending++; savedState(); }
    try { return await STATIC.api(method, path, body); }
    catch (e) { throw new ApiError(e.status || 400, e.body || { error: "e" }); }
    finally { if (method !== "GET") { pending--; savedState(); } }
  }
  const opt = { method, credentials: "same-origin", headers: { "X-Panel": "1" } };
  if (body !== undefined && !raw) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
  if (raw) { opt.body = body; Object.assign(opt.headers, raw); }
  if (method !== "GET") { pending++; savedState(); }
  try {
    const r = await fetch(path, opt);
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== "/api/login" && path !== "/api/me" && S.me) { toast(t("e_signed_out"), { bad: true }); login(); throw new ApiError(401, j); }
    if (!r.ok) throw new ApiError(r.status, j);
    return j;
  } catch (e) {
    if (!(e instanceof ApiError)) throw new ApiError(0, { error: "offline" });
    throw e;
  } finally {
    if (method !== "GET") { pending--; savedState(); }
  }
}
function upload(path, file, onp) {
  if (STATIC) return STATIC.upload(path, file, onp).catch((e) => { throw new ApiError(e.status || 400, e.body || { error: "e" }); });
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("POST", path);
    x.setRequestHeader("X-Panel", "1");
    x.setRequestHeader("X-Filename", encodeURIComponent(file.name || "upload"));
    x.upload.onprogress = (e) => e.lengthComputable && onp && onp(e.loaded / e.total);
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} x.status < 300 ? res(j) : rej(new ApiError(x.status, j)); };
    x.onerror = () => rej(new ApiError(0, { error: "offline" }));
    x.send(file);
  });
}

// ── state ────────────────────────────────────────────────────────────────────────────────────────────────────────
const S = {
  me: null, sid: null, tab: "content", st: null, F: new Map(), changes: 0,
  page: "", plang: null, device: "desktop", mode: "edit", sel: null,
  frame: null,        // the build the canvas shows: {id, ids, values, path, lang}
  onPage: null,       // what the bridge reported: {path, lang, fields:[{id, role, section}], imgs}
  scroll: {}, seoPage: "", lastSaved: 0,
};
const site = () => S.me.sites.find((s) => s.id === S.sid);
const langs = () => S.st.site.langs.map((l) => l.code);
const ldir = (code) => (S.st.site.langs.find((l) => l.code === code) || {}).dir || (code === "ar" ? "rtl" : "ltr");
const lname = (code) => (code === "ar" ? "العربية" : code === "en" ? "English" : code);
const siteName = (s) => (s.name && (s.name[L] || s.name.en)) || s.id;

function setLang(l) {
  L = l;
  localStorage.setItem("mw.lang", l);
  document.documentElement.lang = l;
  document.documentElement.dir = t("dir");
}

// ── boot ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function boot() {
  setLang(L);
  try {
    S.me = await api("GET", "/api/me");
  } catch (e) {
    if (e.status === 401 || e.status === 0) return login(e.status === 0 ? t("offline") : null);
    throw e;
  }
  setLang(S.me.user.lang || L);
  const m = here().match(/^\/sites\/([\w-]+)(?:\/(\w+))?/);
  const sid = m && S.me.sites.some((s) => s.id === m[1]) ? m[1] : S.me.sites[0]?.id;
  const tab = m && ["content", "pictures", "search", "links", "history"].includes(m[2]) ? m[2] : "content";
  await openSite(sid, tab, true);
}
function here() { return STATIC ? (location.hash.slice(1) || "/") : location.pathname; }
function go(url, replace) {
  const u = STATIC ? "#" + url : url;
  if (replace) history.replaceState(null, "", u); else history.pushState(null, "", u);
}
window.addEventListener("popstate", () => {
  const m = here().match(/^\/sites\/([\w-]+)(?:\/(\w+))?/);
  if (m && S.me) openSite(m[1], m[2] || "content", true);
});

// ── sign in ──────────────────────────────────────────────────────────────────────────────────────────────────────
function login(errMsg) {
  S.me = null;
  go("/login", true);
  let err = errMsg || null, busy = false, show = false;
  const draw = () => {
    app.replaceChildren(h("main", { class: "login" },
      h("div", { class: "login-card" },
        h("div", { class: "login-mark" }, h("span", { class: "wordmark" }, "MIDDLEWARE", h("b", {}, ".")),
          h("div", { class: "seg", role: "group", "aria-label": t("language") },
            ["ar", "en"].map((l) => h("button", { type: "button", "aria-pressed": String(L === l), onclick: () => { setLang(l); draw(); } }, STR[l].lang_name)))),
        h("h1", {}, t("signin_title")),
        h("p", { class: "sub" }, t("signin_sub")),
        err && h("div", { class: "form-err", role: "alert" }, ic("alert"), h("span", {}, err)),
        h("form", { onsubmit: submit, novalidate: true },
          h("label", { class: "field" }, h("span", {}, t("email")),
            h("input", { class: "input", type: "email", name: "email", autocomplete: "username", required: true, dir: "ltr", inputmode: "email", id: "f-email" })),
          h("label", { class: "field" }, h("span", {}, t("password")),
            h("div", { class: "pw" }, h("input", { class: "input", type: show ? "text" : "password", name: "password", autocomplete: "current-password", required: true, dir: "ltr", id: "f-pw" }),
              h("button", { type: "button", "aria-label": show ? t("hide_pw") : t("show_pw"), onclick: () => { const v = keep(); show = !show; draw(); restore(v); }, html: icon(show ? "eyeoff" : "eye") }))),
          h("button", { class: "btn btn-ink btn-lg", type: "submit", disabled: busy || null }, busy ? h("span", { class: "spin" }) : null, t("signin"))),
        DEMO && h("div", { class: "demo" }, h("p", {}, t("demo")), h("div", { class: "row", id: "demo-row" })),
        h("p", { class: "login-foot" }, t("by"), " ", h("span", { class: "wordmark", style: { fontSize: "11px" } }, "MIDDLEWARE", h("b", {}, "."))))));
    if (DEMO) fetch(UI_BASE + "demo.json").then((r) => r.ok ? r.json() : []).then((list) => {
      const row = document.getElementById("demo-row");
      if (!row) return;
      for (const d of list) row.append(h("button", { type: "button", class: "btn btn-sm", onclick: () => { document.getElementById("f-email").value = d.email; document.getElementById("f-pw").value = d.password; } }, d.label[L] || d.label.en));
    }).catch(() => {});
  };
  const keep = () => ({ e: document.getElementById("f-email")?.value, p: document.getElementById("f-pw")?.value });
  const restore = (v) => { document.getElementById("f-email").value = v.e || ""; document.getElementById("f-pw").value = v.p || ""; document.getElementById("f-pw").focus(); };
  async function submit(e) {
    e.preventDefault();
    const v = keep();
    if (!v.e || !v.p) { document.getElementById(v.e ? "f-pw" : "f-email").focus(); return; }
    busy = true; err = null; draw(); restore(v);
    try {
      await api("POST", "/api/login", { email: v.e, password: v.p });
      busy = false;
      go("/", true);
      boot();
    } catch (ex) {
      busy = false;
      err = ex.body?.error === "slow_down" ? t("slow", { s: ex.body.seconds }) : ex.status === 0 ? t("offline") : t("wrong");
      draw(); restore({ e: v.e, p: "" });
    }
  }
  draw();
  setTimeout(() => document.getElementById("f-email")?.focus(), 50);
}

// ── a site ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function openSite(sid, tab, replace) {
  const same = sid === S.sid && S.st;
  if (!same) {
    S.sid = sid; S.st = null; S.frame = null; S.onPage = null; S.sel = null; S.page = ""; S.seoPage = "";
    S.st = await api("GET", `/api/s/${sid}/state`);
    indexFields();
    S.plang = langs().includes(L) ? L : langs()[0];
    S.changes = site().changes;
  }
  S.tab = tab || "content";
  const url = `/sites/${sid}/${S.tab}`;
  go(url, replace);
  shell();
  if (!S.st.preview.ready || S.st.preview.building) watchPreview();
}
function indexFields() {
  S.F = new Map(S.st.fields.map((f) => [f.key, f]));
}
async function refreshState() {
  S.st = await api("GET", `/api/s/${S.sid}/state`);
  indexFields();
}

// ── the shell ────────────────────────────────────────────────────────────────────────────────────────────────────
const TABS = [["content", "pen"], ["pictures", "image"], ["search", "search"], ["links", "link"], ["history", "clock"]];
function shell() {
  const s = site();
  app.replaceChildren(h("div", { class: "shell" },
    h("header", { class: "top" },
      h("span", { class: "brand-dot", title: "MIDDLEWARE" }, "M."),
      h("button", { class: "switch", id: "switch", "aria-haspopup": "menu", "aria-expanded": "false", onclick: siteMenu },
        badge(s), h("span", { class: "names" }, h("span", { class: "client" }, S.me.client.name[L] || S.me.client.name.en), h("span", { class: "site" }, h("span", { class: "full" }, siteName(s)), h("span", { class: "short" }, s.short || siteName(s)))),
        S.me.sites.length > 1 ? h("span", { html: icon("chevron") }) : null),
      STATIC ? h("span", { class: "badge amber demo-tag", title: t("demo_note"), tabindex: "0" }, t("demo_tag")) : null,
      h("span", { class: "grow" }),
      h("span", { class: "saved hide-sm", id: "saved" }),
      h("div", { class: "tools" },
        s.live_url ? h("a", { class: "btn btn-ghost btn-sm hide-sm", href: s.live_url, target: "_blank", rel: "noopener", title: t("view_live") }, ic("out"), h("span", {}, t("view_live"))) : null,
        h("button", { class: "btn btn-ink", id: "publish", onclick: review }, t("publish"), h("span", { class: "count", id: "count" })),
        h("button", { class: "avatar", "aria-label": t("account"), onclick: accountMenu }, initials(S.me.user.name)))),
    h("nav", { class: "rail", "aria-label": "Sections" }, TABS.map(([k, i]) => h("button", { "aria-current": S.tab === k ? "page" : null, onclick: () => openSite(S.sid, k) }, ic(i), t("t_" + k),
      k === "history" ? h("span", { class: "pip", id: "pip", hidden: true }) : null))),
    h("main", { class: "main", id: "main" }),
    h("nav", { class: "tabs", "aria-label": "Sections" }, TABS.map(([k, i]) => h("button", { "aria-current": S.tab === k ? "page" : null, onclick: () => openSite(S.sid, k) }, ic(i), t("t_" + k))))));
  counts();
  savedState();
  ({ content: viewContent, pictures: viewPictures, search: viewSearch, links: viewLinks, history: viewHistory })[S.tab]();
}
const initials = (n) => (n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
function badge(s) {
  return h("span", { class: "site-badge", style: { background: s.color, color: s.ink } },
    s.mark ? h("img", { src: s.mark, alt: "", style: { width: "78%", height: "78%", objectFit: "contain" } }) : (s.short || "").slice(0, 3));
}
function counts() {
  const c = document.getElementById("count");
  const p = document.getElementById("publish");
  if (!c) return;
  c.textContent = S.changes ? nf().format(S.changes) : "";
  c.style.display = S.changes ? "" : "none";
  p.classList.toggle("idle", !S.changes);          // never disabled: a click right after typing waits for the save
  p.title = S.changes ? plural(S.changes, "one_change", "n_changes") : t("all_live");
  const s = site();
  if (s) s.changes = S.changes;
}
function savedState() {
  const el = document.getElementById("saved");
  if (!el) return;
  if (pending > 0) { el.className = "saved busy hide-sm"; el.replaceChildren(h("span", { class: "dot" }), t("saving")); }
  else if (S.lastSaved && Date.now() - S.lastSaved < 60000) { el.className = "saved hide-sm"; el.replaceChildren(h("span", { class: "dot" }), t("saved")); }
  else el.replaceChildren();
}
function setChanges(n) { if (typeof n === "number") { S.changes = n; counts(); } S.lastSaved = Date.now(); savedState(); }

// ── menus, toasts, dialogs ───────────────────────────────────────────────────────────────────────────────────────
let openMenu = null;
function menu(anchor, items) {
  closeMenu();
  const r = anchor.getBoundingClientRect();
  const m = h("div", { class: "menu", role: "menu" }, items);
  document.body.append(m);
  const rtl = document.documentElement.dir === "rtl";
  const w = m.offsetWidth;
  let x = rtl ? r.right - w : r.left;
  x = Math.max(8, Math.min(x, innerWidth - w - 8));
  Object.assign(m.style, { top: r.bottom + 6 + "px", left: x + "px" });
  anchor.setAttribute("aria-expanded", "true");
  openMenu = { m, anchor };
  setTimeout(() => document.addEventListener("pointerdown", outside, true), 0);
  m.querySelector("button")?.focus({ preventScroll: true });
  return m;
}
function outside(e) { if (openMenu && !openMenu.m.contains(e.target)) closeMenu(); }
function closeMenu() {
  if (!openMenu) return;
  openMenu.anchor.setAttribute("aria-expanded", "false");
  openMenu.m.remove(); openMenu = null;
  document.removeEventListener("pointerdown", outside, true);
}
function siteMenu(e) {
  if (S.me.sites.length < 2) return;
  menu(e.currentTarget, [h("div", { class: "mh" }, t("sites")), S.me.sites.map((s) => h("button", { class: "mi", role: "menuitemradio", "aria-checked": String(s.id === S.sid),
    onclick: () => { closeMenu(); if (s.id !== S.sid) openSite(s.id, S.tab); } },
    badge(s), h("span", { class: "tx" }, siteName(s), h("span", { class: "sub" }, s.changes ? plural(s.changes, "one_change", "n_changes") : t("no_changes"))),
    s.id === S.sid ? h("span", { html: icon("check") }) : null))]);
}
function accountMenu(e) {
  const theme = localStorage.getItem("mw.theme") || "auto";
  menu(e.currentTarget, [
    h("div", { class: "mh" }, S.me.user.name, h("div", { style: { fontWeight: 400 } }, S.me.user.email)),
    h("hr"), h("div", { class: "mh" }, t("language")),
    ["ar", "en"].map((l) => h("button", { class: "mi", role: "menuitemradio", "aria-checked": String(L === l), onclick: async () => {
      closeMenu(); setLang(l); api("PUT", "/api/me", { lang: l }).catch(() => {}); shell(); } }, h("span", { class: "tx" }, STR[l].lang_name), L === l ? h("span", { html: icon("check") }) : null)),
    h("hr"), h("div", { class: "mh" }, t("theme")),
    [["auto", "auto"], ["light", "sun"], ["dark", "moon"]].map(([k, i]) => h("button", { class: "mi", role: "menuitemradio", "aria-checked": String(theme === k),
      onclick: () => { closeMenu(); localStorage.setItem("mw.theme", k); applyTheme(); } }, ic(i), h("span", { class: "tx" }, t(k)), theme === k ? h("span", { html: icon("check") }) : null)),
    h("hr"),
    h("button", { class: "mi", onclick: async () => { closeMenu(); await api("POST", "/api/logout", {}).catch(() => {}); login(); } }, h("span", { class: "tx" }, t("sign_out")))]);
}
function applyTheme() {
  const v = localStorage.getItem("mw.theme") || "auto";
  if (v === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = v;
}
applyTheme();
function toast(msg, opt = {}) {
  let box = document.querySelector(".toasts");
  if (!box) { box = h("div", { class: "toasts", role: "status", "aria-live": "polite" }); document.body.append(box); }
  const el = h("div", { class: "toast" + (opt.bad ? " bad" : "") }, opt.icon ? ic(opt.icon) : null, msg,
    opt.action ? h("button", { onclick: () => { el.remove(); opt.action.do(); } }, opt.action.label) : null);
  box.append(el);
  setTimeout(() => el.remove(), opt.ms || 3600);
}
function sheet({ title, sub, body, foot, narrow, onclose, label }) {
  const prev = document.activeElement;
  const close = () => { sc.remove(); document.removeEventListener("keydown", key); prev?.focus?.({ preventScroll: true }); onclose && onclose(); };
  const key = (e) => { if (e.key === "Escape" && !document.querySelector(".menu")) close(); };
  const sh = h("div", { class: "sheet" + (narrow ? " narrow" : ""), role: "dialog", "aria-modal": "true", "aria-label": label || title },
    h("div", { class: "sheet-head" }, h("div", { style: { flex: 1, minWidth: 0 } }, h("h2", {}, title), sub ? h("p", {}, sub) : null),
      h("button", { class: "btn btn-ghost btn-icon", "aria-label": t("close"), onclick: close, html: icon("x") })),
    h("div", { class: "sheet-body" }, body), foot ? h("div", { class: "sheet-foot" }, foot) : null);
  const sc = h("div", { class: "scrim", onclick: (e) => { if (e.target === sc) close(); } }, sh);
  document.body.append(sc);
  document.addEventListener("keydown", key);
  setTimeout(() => (sh.querySelector("input, textarea, [contenteditable]") || sh.querySelector(".sheet-foot .btn-ink, .sheet-foot .btn-blue") || sh).focus?.({ preventScroll: true }), 30);
  return { close, sheet: sh, body: sh.querySelector(".sheet-body"), foot: sh.querySelector(".sheet-foot"), head: sh.querySelector(".sheet-head") };
}
function confirmBox(title, sub, okLabel) {
  return new Promise((res) => {
    let done = false;
    const s = sheet({ title, sub, narrow: true, body: null, onclose: () => { if (!done) res(false); },
      foot: [h("span", { class: "grow" }), h("button", { class: "btn", onclick: () => s.close() }, t("cancel")),
        h("button", { class: "btn btn-ink", onclick: () => { done = true; s.close(); res(true); } }, okLabel)] });
    s.body.remove();
  });
}

// ── content: the canvas ──────────────────────────────────────────────────────────────────────────────────────────
function pagesFor(lang) {
  const pv = S.st.preview;
  return pv.ready ? pv.pages.filter((p) => p.lang === lang) : [];
}
function pageLabel(p) {
  if (!p) return "";
  if (p.id === "") return t("home");
  const raw = (p.title || p.id).split(/\s+[—–|·]\s+/)[0];
  return raw.length > 48 ? raw.slice(0, 46) + "…" : raw;
}
function pathOf(id, lang) {
  const p = pagesFor(lang).find((x) => x.id === id) || pagesFor(lang)[0];
  return p ? p.path : "";
}
function viewContent() {
  const main = document.getElementById("main");
  const s = site();
  main.replaceChildren(h("div", { class: "content" },
    h("section", { class: "stage" },
      h("div", { class: "stagebar" },
        h("button", { class: "pagepick", id: "pagepick", "aria-haspopup": "menu", onclick: pageMenu }, ic("layers"), h("span", { id: "pagename" }, ""), h("span", { html: icon("chevron") })),
        langs().length > 1 ? h("div", { class: "seg", role: "group", "aria-label": t("language") }, langs().map((l) => h("button", { "aria-pressed": String(S.plang === l), onclick: () => { S.plang = l; loadCanvas(); viewContentBar(); } }, lname(l)))) : null,
        h("span", { style: { flex: 1 } }),
        h("div", { class: "seg hide-sm", role: "group" },
          h("button", { "aria-pressed": String(S.mode === "edit"), title: t("edit"), onclick: () => setMode("edit") }, ic("cursor"), h("span", { class: "lbl" }, t("edit"))),
          h("button", { "aria-pressed": String(S.mode === "browse"), title: t("browse"), onclick: () => setMode("browse") }, ic("hand"), h("span", { class: "lbl" }, t("browse")))),
        h("div", { class: "seg hide-sm", role: "group" },
          h("button", { "aria-pressed": String(S.device === "desktop"), "aria-label": t("desktop"), title: t("desktop"), onclick: () => setDevice("desktop"), html: icon("desktop") }),
          h("button", { "aria-pressed": String(S.device === "phone"), "aria-label": t("phone"), title: t("phone"), onclick: () => setDevice("phone"), html: icon("phone") })),
        h("button", { class: "btn btn-sm btn-ghost", onclick: findText, title: t("find") + " (⌘K)", "aria-label": t("find"), html: icon("search") })),
      h("div", { class: "canvas-wrap" },
        h("div", { class: "frame" + (S.device === "phone" ? " phone" : ""), id: "frame" },
          h("div", { class: "veil", id: "veil" }, h("div", { class: "shimmer" }), h("div", { class: "box" }, h("div", { class: "spin" }), h("h3", {}, t("preparing")), h("p", {}, t("preparing_sub"))))))),
    h("aside", { class: "drawer", id: "drawer", "aria-label": t("on_page") })));
  viewContentBar();
  drawer();
  loadCanvas();
}
function viewContentBar() {
  const p = pagesFor(S.plang).find((x) => x.id === S.page);
  const n = document.getElementById("pagename");
  if (n) n.textContent = p ? pageLabel(p) : t("home");
  document.querySelectorAll(".stagebar > .seg:not(.hide-sm) button").forEach((b, i) => b.setAttribute("aria-pressed", String(langs()[i] === S.plang)));
}
function setMode(m) {
  S.mode = m;
  post({ type: "mw:mode", mode: m });
  document.querySelectorAll(".stagebar .seg.hide-sm")[0]?.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String((i === 0) === (m === "edit"))));
}
function setDevice(d) {
  S.device = d;
  document.getElementById("frame")?.classList.toggle("phone", d === "phone");
  document.querySelectorAll(".stagebar .seg.hide-sm")[1]?.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String((i === 0) === (d === "desktop"))));
}
function pageMenu(e) {
  const ps = pagesFor(S.plang);
  const groups = {};
  for (const p of ps) { const g = p.id.split("/")[0] || ""; (groups[g] = groups[g] || []).push(p); }
  const items = [h("div", { class: "mh" }, t("pages"))];
  for (const [g, list] of Object.entries(groups)) {
    list.sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id));
    for (const p of list) {
      const depth = p.id.split("/").filter(Boolean).length;
      items.push(h("button", { class: "mi" + (depth > 1 ? " indent" : ""), role: "menuitemradio", "aria-checked": String(p.id === S.page), onclick: () => { closeMenu(); S.page = p.id; loadCanvas(); viewContentBar(); } },
        h("span", { class: "tx" }, pageLabel(p)), p.id === S.page ? h("span", { html: icon("check") }) : null));
    }
  }
  menu(e.currentTarget, items);
}

let iframe = null;
function post(m, transfer) { if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage(m, PREVIEW, transfer || []); }
function loadCanvas(hash) {
  const frame = document.getElementById("frame");
  if (!frame) return;
  const pv = S.st.preview;
  const veil = document.getElementById("veil");
  if (!pv.ready) {
    if (pv.error) veil.querySelector(".box").replaceChildren(h("h3", {}, t("pv_failed")), h("p", {}, t("pv_failed_sub")), h("details", { class: "tech" }, h("summary", {}, t("tech")), h("pre", {}, pv.error)));
    veil.classList.remove("off");
    return;
  }
  const path = pathOf(S.page, S.plang);
  S.frame = { id: pv.id, ids: pv.ids, values: pv.values, images: pv.images, path, lang: S.plang, hash };
  S.frame.idOf = new Map(pv.ids.map(([k, l], i) => [k + "|" + l, i]));
  S.onPage = null;
  iframe = h("iframe", { title: siteName(site()), src: pv.base + path + (hash || ""), sandbox: "allow-scripts allow-same-origin allow-popups allow-forms", referrerpolicy: "no-referrer" });
  frame.append(iframe);
}
let lastInput = 0;
function softReload() {
  // a fresh build of the draft is ready: show the page as it really renders, in place, without a flash
  if (S.tab !== "content" || !S.frame || !S.st.preview.ready || S.st.preview.id === S.frame.id || S.view === "preview") return;
  const a = document.activeElement;
  if ((a && a.classList && a.classList.contains("ed")) || Date.now() - lastInput < 2500) { setTimeout(softReload, 1500); return; }
  loadCanvas();
}
window.addEventListener("message", (e) => {
  if (e.origin !== PREVIEW || !iframe || e.source !== iframe.contentWindow) return;
  const m = e.data || {};
  if (m.type === "mw:hello") {
    const slots = {};
    for (const sl of S.st.slots) slots[sl.id] = sl.files.map((f) => f.path.split("/").pop());
    const roles = {};
    for (const r of ["heading", "text", "button", "link", "menu", "item", "caption", "label", "quote", "footer", "picture"]) roles[r] = t("r_" + r);
    post({ type: "mw:init", mode: S.view === "preview" ? "view" : S.mode, roles, slots, accent: "#3D7BFF", scroll: S.scroll[S.sid + "|" + m.path] || 0, hash: S.frame?.hash });
  } else if (m.type === "mw:ready") {
    S.onPage = m;
    const p = pagesFor(S.plang).find((x) => x.path === m.path);
    if (p && p.id !== S.page) { S.page = p.id; viewContentBar(); }
    iframe.classList.add("on");
    iframe.parentNode.querySelectorAll("iframe").forEach((x) => { if (x !== iframe) setTimeout(() => x.remove(), 260); });
    document.getElementById("veil")?.classList.add("off");
    patchAll();
    rememberLabels(m.fields);
    if (S.sel && S.sel.key) post({ type: "mw:select", ids: idsFor(S.sel.key), scroll: S.pendingScroll === S.sel.key });
    S.pendingScroll = null;
    drawer();
  } else if (m.type === "mw:pick") {
    if (m.slot) return pictureSheet(m.slot);
    const key = keyFor(m.ids);
    if (key) openEditor(key);
  } else if (m.type === "mw:nav") {
    const pv = S.st.preview;
    const p = pv.pages.find((x) => x.path === m.path);
    if (p) { S.page = p.id; S.plang = p.lang; }
    loadCanvas(m.hash); viewContentBar();
  } else if (m.type === "mw:scroll") {
    S.scroll[S.sid + "|" + m.path] = m.y;
  } else if (m.type === "mw:outside") {
    toast(t("outside"));
  }
});
function keyFor(ids) {
  for (const id of ids || []) {
    const kl = S.frame && S.frame.ids[id];
    if (kl && S.F.has(kl[0])) return kl[0];
  }
  return null;
}
function idsFor(key) {
  const out = [];
  if (!S.frame) return out;
  for (const l of langs()) { const i = S.frame.idOf.get(key + "|" + l); if (i != null) out.push(i); }
  return out;
}
function display(f, lang, v) {
  let s = v || "";
  for (const [tok, lab] of Object.entries((f.chips || {})[lang] || {})) s = s.split(tok).join(lab);
  return s;
}
function patchAll() {
  if (!S.frame) return;
  const items = [];
  for (const f of S.F.values()) {
    for (const l of langs()) {
      const id = S.frame.idOf.get(f.key + "|" + l);
      if (id == null) continue;
      const was = S.frame.values[f.key + "|" + l];
      const now = f.values[l];
      if ((was || "") !== (now || "")) items.push({ id, text: display(f, l, now) });
    }
  }
  if (items.length) post({ type: "mw:patch", items });
  for (const sl of S.st.slots) {
    if (slotChanged(sl)) livePicture(sl);
  }
}
function patchOne(f, lang) {
  if (!S.frame) return;
  const id = S.frame.idOf.get(f.key + "|" + lang);
  if (id != null) post({ type: "mw:patch", items: [{ id, text: display(f, lang, f.values[lang]) }] });
  for (const a of (S.onPage?.attrs || [])) if (a.ids.includes(id)) post({ type: "mw:patch", items: [{ id, attr: a.name, text: f.values[lang] || "" }] });
}
let labelTimer = null, labelQueue = {};
function rememberLabels(fields) {
  const known = S.st.labels || {};
  for (const fl of fields || []) {
    const kl = S.frame.ids[fl.id];
    if (!kl) continue;
    const page = S.page;
    const cur = known[kl[0]];
    if (!cur || cur.role !== fl.role || cur.section !== fl.section) {
      labelQueue[kl[0]] = { role: fl.role, section: fl.section, page };
      known[kl[0]] = labelQueue[kl[0]];
    }
  }
  S.st.labels = known;
  clearTimeout(labelTimer);
  labelTimer = setTimeout(() => {
    const q = labelQueue; labelQueue = {};
    if (Object.keys(q).length) api("POST", `/api/s/${S.sid}/labels`, { labels: q }).catch(() => {});
  }, 800);
}
function fieldLabel(key, opts = {}) {
  const lab = (S.st.labels || {})[key];
  const f = S.F.get(key);
  const sample = f ? (f.values[L] || f.values[langs()[0]] || Object.values(f.values).find(Boolean) || "") : "";
  if (lab && lab.role) {
    let sec = lab.section === "footer" ? t("in_footer") : lab.section === "header" ? t("in_header") : lab.section;
    return { role: t("r_" + lab.role), section: sec, sample };
  }
  return { role: t("r_text"), section: "", sample };
}

// watching for the newest preview build
let pvTimer = null;
function watchPreview(delay = 1400) {
  clearTimeout(pvTimer);
  pvTimer = setTimeout(async () => {
    if (!S.sid) return;
    try {
      const pv = await api("GET", `/api/s/${S.sid}/preview`);
      const first = !S.st.preview.ready && pv.ready;
      S.st.preview = pv;
      if (first) { await refreshState(); if (S.tab === "pictures") viewPictures(); if (S.tab === "search") viewSearch(); }
      if (first && S.tab === "content") { loadCanvas(); viewContentBar(); }
      if (pv.ready && !pv.building && pv.fresh) { softReload(); return; }
      if (!pv.ready && pv.error && !pv.building && S.tab === "content") { loadCanvas(); return; }
    } catch {}
    watchPreview(2200);
  }, delay);
}

// ── content: the drawer (the page's texts, or the one being edited) ──────────────────────────────────────────────
function drawer() {
  const d = document.getElementById("drawer");
  if (!d) return;
  if (S.sel && S.sel.key) return editor(d, S.sel.key);
  const onPage = [], unseen = [];
  const seen = new Set();
  if (S.onPage && S.frame) {
    for (const fl of S.onPage.fields) {
      const kl = S.frame.ids[fl.id];
      if (!kl || seen.has(kl[0]) || !S.F.has(kl[0]) || S.F.get(kl[0]).hidden) continue;
      seen.add(kl[0]); (fl.vis === false ? unseen : onPage).push(kl[0]);
    }
  }
  const q = h("input", { type: "search", placeholder: t("find"), "aria-label": t("find"), oninput: () => fill() });
  const list = h("div", { class: "tlist" });
  function fill() {
    const qq = norm(q.value.trim());
    const keys = qq ? [...S.F.values()].filter((f) => !f.hidden && Object.values(f.values).some((v) => norm(v).includes(qq))).map((f) => f.key).slice(0, 60) : onPage;
    const row = (k) => {
      const f = S.F.get(k);
      const lab = fieldLabel(k);
      const v = display(f, S.plang, f.values[S.plang]) || Object.values(f.values).find(Boolean) || "";
      const changed = isChanged(k);
      return h("button", { class: "titem", onclick: () => openEditor(k, true) }, h("span", { class: "ro" }, lab.role), h("span", { class: "tx", dir: ldir(S.plang) }, v), changed ? h("span", { class: "mod", title: t("changed") }) : null);
    };
    list.replaceChildren(...keys.map(row));
    if (!qq && unseen.length) list.append(h("details", { class: "unseen" }, h("summary", { class: "list-h" }, t("hidden_texts"), " · ", nf().format(unseen.length)), unseen.map(row)));
    if (qq && !keys.length) list.append(h("p", { style: { color: "var(--ink-3)", padding: "8px 10px", margin: 0 } }, t("no_found", { q: q.value })));
  }
  d.classList.remove("open");
  d.replaceChildren(
    h("div", { class: "drawer-body" },
      h("div", { class: "hello" }, h("div", { class: "art", html: icon("cursor") }), h("h3", {}, t("click_any")), h("p", {}, t("click_any_sub"))),
      h("div", { class: "search" }, ic("search"), q),
      h("div", { class: "list-h" }, t("on_page")), list));
  fill();
}
const changedSet = new Set();
function isChanged(key) { return changedSet.has(key); }
async function loadChanged() {
  try {
    const r = await api("GET", `/api/s/${S.sid}/changes`);
    changedSet.clear();
    for (const c of r.changes) if (c.type === "text") changedSet.add(c.key);
    S.changes = r.changes.length; counts();
    return r.changes;
  } catch { return []; }
}

function openEditor(key, scrollTo) {
  S.sel = { key };
  const d = document.getElementById("drawer");
  if (d) { editor(d, key); d.classList.add("open"); }
  if (scrollTo) post({ type: "mw:select", ids: idsFor(key), smooth: true });
}
function closeEditor() {
  S.sel = null;
  post({ type: "mw:clear" });
  drawer();
}
let published = {};               // key|lang → the published value (for "Published:" and "put back")
async function loadPublished(key) {
  const r = await api("GET", `/api/s/${S.sid}/changes`).catch(() => ({ changes: [] }));
  changedSet.clear();
  for (const c of r.changes) if (c.type === "text") { changedSet.add(c.key); published[c.key + "|" + c.lang] = c.before; }
  return r.changes;
}
function editor(d, key) {
  const f = S.F.get(key);
  if (!f) { S.sel = null; return drawer(); }
  const lab = fieldLabel(key);
  const shared = (S.st.shared || {})[key];
  const order = [S.plang, ...langs().filter((l) => l !== S.plang)];
  const blocks = order.filter((l) => f.values[l] != null).map((l) => edBlock(f, l));
  d.replaceChildren(
    h("div", { class: "grab" }),
    h("div", { class: "drawer-head" },
      h("div", { class: "row" },
        h("button", { class: "btn btn-ghost btn-icon btn-sm", "aria-label": t("back"), onclick: closeEditor, html: icon("arrow"), style: { transform: L === "ar" ? "none" : "scaleX(-1)" } }),
        h("div", { class: "grow" }, h("div", { class: "kick" }, lab.role + (lab.section ? " · " + lab.section : "")),
          h("h2", { dir: ldir(S.plang) }, (display(f, S.plang, f.values[S.plang]) || lab.sample || "").slice(0, 80))))),
    h("div", { class: "drawer-body" }, blocks, shared && shared.length ? h("div", { class: "shared" }, ic("share"), t("shared_note", { s: shared.map((x) => siteName(S.me.sites.find((s) => s.id === x) || { id: x })).join("، ") })) : null),
    h("div", { class: "drawer-foot" }, h("span", { class: "grow" }), h("button", { class: "btn btn-ink", onclick: closeEditor }, t("done"))));
  const first = d.querySelector(".ed");
  setTimeout(() => { if (first && !matchMedia("(max-width: 900px)").matches) { first.focus({ preventScroll: true }); caretEnd(first); } }, 40);
  loadPublished(key).then(() => d.querySelectorAll(".ed-block").forEach((b) => b._was && b._was()));
}
function caretEnd(el) {
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function edBlock(f, lang, opt = {}) {
  const dir = ldir(lang);
  const ed = h("div", { class: "ed" + (f.long || opt.long ? " long" : ""), contenteditable: "true", role: "textbox", "aria-multiline": String(!!(f.long || opt.long)), dir, lang, spellcheck: "true",
    "aria-label": opt.label || lname(lang), "data-empty": opt.placeholder || "…" });
  const chips = (f.chips || {})[lang] || {};
  const toks = Object.keys(chips).sort((a, b) => b.length - a.length);
  const rx = toks.length ? new RegExp("(" + toks.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")") : null;
  function paint(v) {
    ed.replaceChildren();
    const parts = rx ? (v || "").split(rx) : [v || ""];
    for (const p of parts) {
      if (rx && chips[p] != null) ed.append(h("span", { class: "chip", contenteditable: "false", dataset: { tok: p }, title: t("token_tip"), html: icon("lock") + esc(chips[p]) }));
      else if (p) ed.append(document.createTextNode(p));
    }
  }
  function read() {
    let out = "";
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) out += c.nodeValue;
        else if (c.dataset && c.dataset.tok) out += c.dataset.tok;
        else if (c.tagName === "BR") out += "\n";
        else { if ((c.tagName === "DIV" || c.tagName === "P") && out && !out.endsWith("\n")) out += "\n"; walk(c); }
      }
    };
    walk(ed);
    return f.long ? out.replace(/\n{3,}/g, "\n\n") : out.replace(/\s*\n\s*/g, " ");
  }
  paint(f.values[lang]);
  const meta = h("span", { class: "meta" });
  const notes = h("div");
  const was = h("div");
  const orig = { v: f.values[lang] };
  let timer = null, lastSent = f.values[lang];
  function hints(v) {
    const out = [];
    if (!v.trim() && !opt.optional) out.push(["warn", t("empty_warn")]);
    const base = published[f.key + "|" + lang] ?? orig.v ?? "";
    if (base && v.length > base.length * 1.6 + 24) out.push(["warn", t("longer")]);
    for (const hnt of S.st.site.hints || []) {
      if (hnt.lang && hnt.lang !== lang) continue;
      try { const m = v.match(new RegExp(hnt.pattern, hnt.flags || "iu")); if (m) out.push([hnt.level || "warn", (hnt.text[L] || hnt.text.en).replace("{m}", m[0])]); } catch {}
    }
    return out;
  }
  function refresh(v, serverErr) {
    meta.textContent = nf().format([...v].length);
    const hs = hints(v);
    notes.replaceChildren(...(serverErr ? [["bad", serverErr]] : []).concat(hs).map(([k, s]) => h("div", { class: "note " + k }, ic(k === "bad" ? "alert" : k === "warn" ? "info" : "check"), h("span", {}, s))));
    ed.classList.toggle("bad", !!serverErr);
  }
  async function save(v) {
    if (v === lastSent) return;
    lastSent = v;
    try {
      const r = await api("PUT", `/api/s/${S.sid}/text`, { edits: [{ key: f.key, lang, value: v }] });
      const sv = r.saved[0];
      f.values[lang] = sv.value;
      changedSet.add(f.key);
      setChanges(r.changes);
      if (r.also && r.also.length) toast(t("also_on", { s: r.also.map((x) => siteName(S.me.sites.find((s) => s.id === x) || { id: x })).join("، ") }), { icon: "share" });
      refresh(v);
      block._was();
      watchPreview(2600);
    } catch (e) {
      lastSent = null;
      const b = e.body || {};
      const msg = b.error === "tokens" ? t("e_tokens", { m: (b.missing || []).map((x) => "«" + x + "»").join("، ") || "" })
        : b.error === "too_long" ? t("e_too_long") : b.error === "busy" ? t("e_busy") : t("e_generic");
      refresh(v, msg);
    }
  }
  ed.addEventListener("input", () => {
    const v = read();
    f.values[lang] = v;                      // the canvas follows at once; the server gets it a moment later
    lastInput = Date.now();
    patchOne(f, lang);
    refresh(v);
    clearTimeout(timer);
    timer = setTimeout(() => save(v), 450);
  });
  ed.addEventListener("blur", () => { clearTimeout(timer); save(read()); });
  ed.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (!f.long || e.metaKey || e.ctrlKey)) { e.preventDefault(); if (e.metaKey || e.ctrlKey || !f.long) { ed.blur(); if (e.metaKey || e.ctrlKey) closeEditor(); } }
    if (e.key === "Escape") { e.preventDefault(); ed.blur(); closeEditor(); }
  });
  ed.addEventListener("beforeinput", (e) => {
    if (!rx) return;
    if (e.inputType.startsWith("delete") || e.inputType === "insertReplacementText") {
      const ranges = e.getTargetRanges ? e.getTargetRanges() : [];
      for (const r of ranges) {
        const rg = document.createRange(); rg.setStart(r.startContainer, r.startOffset); rg.setEnd(r.endContainer, r.endOffset);
        const hit = [...ed.querySelectorAll(".chip")].find((c) => rg.intersectsNode(c) && !(rg.collapsed));
        if (hit) { e.preventDefault(); hit.classList.remove("wiggle"); void hit.offsetWidth; hit.classList.add("wiggle"); refresh(read(), t("token_stuck")); setTimeout(() => refresh(read()), 2200); return; }
      }
    }
  });
  ed.addEventListener("paste", (e) => {
    e.preventDefault();
    let s = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
    s = s.replace(/[\u{E0000}-\u{E007F}]/gu, "");
    if (!f.long) s = s.replace(/\s*\n\s*/g, " ");
    document.execCommand("insertText", false, s);
  });
  ed.addEventListener("drop", (e) => e.preventDefault());
  ed.addEventListener("focus", () => { if (S.plang !== lang && langs().includes(lang)) { /* editing the other language: the page stays */ } });
  const block = h("div", { class: "ed-block" },
    h("div", { class: "ed-label" }, opt.label ? h("span", { style: { fontSize: "13px", fontWeight: 550, color: "var(--ink-2)" } }, opt.label) : h("span", { class: "lang-tag" }, lname(lang)), meta), ed, notes, was);
  block.ed = ed;
  block._was = () => {
    const pub = published[f.key + "|" + lang];
    if (pub != null && pub !== f.values[lang]) {
      was.replaceChildren(h("div", { class: "was" }, h("span", {}, t("published_was")), h("s", { dir }, display(f, lang, pub).slice(0, 140) || "—")),
        h("button", { class: "linkish", style: { fontSize: "12.5px", marginTop: "4px" }, onclick: async () => {
          const r = await api("POST", `/api/s/${S.sid}/revert`, { ids: [`text:${f.key}:${lang}`] });
          f.values[lang] = pub; paint(pub); lastSent = pub; patchOne(f, lang); refresh(pub); setChanges(r.changes); changedSet.delete(f.key); block._was();
        } }, ic("undo"), " ", t("put_back")));
    } else was.replaceChildren();
  };
  refresh(f.values[lang] || "");
  return block;
}

// find any text (⌘K)
function findText() {
  if (document.querySelector(".find")) return;
  const input = h("input", { type: "search", placeholder: t("find_ph"), "aria-label": t("find") });
  const res = h("div", { class: "res", role: "listbox" });
  let sel = 0, items = [];
  const box = h("div", { class: "find", onclick: (e) => { if (e.target === box) close(); } }, h("div", { class: "box" }, input, res));
  const close = () => { box.remove(); document.removeEventListener("keydown", key, true); };
  function fill() {
    const q = norm(input.value.trim());
    items = !q ? [] : [...S.F.values()].filter((f) => !f.hidden && Object.values(f.values).some((v) => norm(v).includes(q))).slice(0, 30);
    sel = 0;
    res.replaceChildren(...items.map((f, i) => {
      const lab = fieldLabel(f.key);
      const l = langs().find((x) => norm(f.values[x]).includes(q)) || S.plang;
      const v = display(f, l, f.values[l]);
      return h("button", { class: i === sel ? "on" : "", role: "option", onclick: () => go(f, l) }, h("div", { class: "w" }, lab.role + (lab.section ? " · " + lab.section : "") + " · " + lname(l)), h("div", { dir: ldir(l), html: mark(v, input.value.trim()) }));
    }));
    if (q && !items.length) res.append(h("p", { style: { padding: "10px 14px", color: "var(--ink-3)", margin: 0 } }, t("no_found", { q: input.value })));
  }
  function mark(v, q) {
    const i = norm(v).indexOf(norm(q));
    if (i < 0 || v.length !== norm(v).length) return esc(v);
    return esc(v.slice(0, i)) + "<mark>" + esc(v.slice(i, i + q.length)) + "</mark>" + esc(v.slice(i + q.length));
  }
  function go(f, l) {
    close();
    jumpTo(f.key, l);
  }
  const key = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); res.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === sel)); }
    else if (e.key === "Enter" && items[sel]) { e.preventDefault(); const f = items[sel]; const q = norm(input.value.trim()); go(f, langs().find((x) => norm(f.values[x]).includes(q)) || S.plang); }
  };
  input.addEventListener("input", fill);
  document.addEventListener("keydown", key, true);
  document.body.append(box);
  input.focus();
}
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && S.me) { e.preventDefault(); findText(); }
});

// ── pictures ─────────────────────────────────────────────────────────────────────────────────────────────────────
function slotLabel(sl) {
  const f = sl.alt && S.F.get(sl.alt);
  const v = f && (f.values[L] || f.values[langs()[0]] || Object.values(f.values).find(Boolean));
  return v || sl.id;
}
function slotPages(sl) {
  const out = [];
  for (const p of (S.st.seo.pages || [])) {
    const any = Object.values(p.langs).some((x) => x.images.some((im) => im.slot === sl.id));
    if (any) out.push(p.id === "" ? t("home") : pageLabel({ id: p.id, title: (p.langs[L] || Object.values(p.langs)[0]).title }));
  }
  return out;
}
async function viewPictures() {
  const main = document.getElementById("main");
  const changes = await loadChanged();
  const changedSlots = new Set(changes.filter((c) => c.type === "image").map((c) => c.slot));
  const groups = {};
  for (const sl of S.st.slots) (groups[sl.group] = groups[sl.group] || []).push(sl);
  main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page" },
    h("div", { class: "page-head" }, h("div", { class: "grow" }, h("h1", {}, t("pics_title")), h("p", {}, t("pics_sub")))),
    Object.entries(groups).map(([g, list]) => [
      Object.keys(groups).length > 1 ? h("div", { class: "group-h" }, h("h2", {}, (list[0].label[L] || list[0].label.en || g)), h("span", {}, nf().format(list.length))) : null,
      h("div", { class: "pics" }, list.map((sl) => {
        const used = slotPages(sl);
        return h("button", { class: "pic", onclick: () => pictureSheet(sl.id) },
          h("div", { class: "img" + (sl.alpha ? " alpha" : ""), style: { "--ar": String(sl.ratio) } }, h("img", { src: sl.url, alt: "", loading: "lazy" }),
            changedSlots.has(sl.id) ? h("span", { class: "badge blue" }, t("changed")) : null),
          h("div", { class: "cap" }, h("b", { dir: "auto" }, slotLabel(sl)), h("span", {}, used.length ? t("used_on", { p: used.slice(0, 2).join("، ") + (used.length > 2 ? "…" : "") }) : t("unused"))));
      }))]))));
}
function pictureSheet(slotId) {
  const sl = S.st.slots.find((x) => x.id === slotId);
  if (!sl) return;
  let up = null;                                  // the upload, once chosen
  let tf = { s: 1, x: 0, y: 0, min: 1 };          // the picture's place inside the frame (frame pixels)
  const crop = h("div", { class: "crop static" + (sl.alpha ? " alpha" : ""), style: { "--ar": String(sl.ratio) } }, h("img", { src: sl.url, alt: "" }), h("div", { class: "grid" }));
  const zoom = h("input", { type: "range", min: "1", max: "3", step: "0.01", value: "1", "aria-label": t("zoom"), disabled: true });
  const status = h("div");
  const fileIn = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/avif,image/heic,.heic,.heif", class: "sr", "aria-label": t("choose") });
  const prog = h("div", { class: "progress", hidden: true }, h("i"));
  const drop = h("div", { class: "drop" }, h("b", {}, t("drop")), h("p", {}, t("or")),
    h("button", { class: "btn btn-sm", type: "button", onclick: () => fileIn.click() }, ic("upload"), t("choose")),
    h("p", { style: { marginTop: "10px", marginBottom: 0, fontSize: "12px", color: "var(--ink-3)" } }, t("formats")), prog, fileIn);
  const useBtn = h("button", { class: "btn btn-ink", disabled: true, onclick: apply }, t("use_pic"));
  const altKey = sl.alt;
  const altF = altKey && S.F.get(altKey);
  const alts = altF ? h("div", { style: { marginTop: "22px" } }, h("div", { class: "list-h", style: { marginTop: 0 } }, t("alt")),
    h("p", { style: { margin: "0 0 10px", color: "var(--ink-3)", fontSize: "12.5px" } }, t("alt_help")),
    [S.plang, ...langs().filter((l) => l !== S.plang)].filter((l) => altF.values[l] != null).map((l) => edBlock(altF, l))) : null;
  const changedNow = { v: false };
  const s = sheet({ title: t("replace"), sub: slotLabel(sl), label: t("replace"),
    body: h("div", { class: "picsheet" },
      h("div", {}, crop, h("div", { class: "zoom" }, h("span", { html: icon("image") }), zoom, h("span", { html: icon("image") })), status),
      h("div", {}, drop, alts)),
    foot: [h("button", { class: "btn btn-ghost", id: "keep-pic", hidden: true, onclick: keepPublished }, ic("undo"), t("keep_pub_pic")), h("span", { class: "grow" }), h("button", { class: "btn", onclick: () => s.close() }, t("close")), useBtn],
    onclose: () => { if (S.tab === "pictures" && changedNow.v) viewPictures(); } });
  loadChanged().then((ch) => { if (ch.some((c) => c.type === "image" && c.slot === sl.id)) s.foot.querySelector("#keep-pic").hidden = false; });
  async function keepPublished() {
    const r = await api("POST", `/api/s/${S.sid}/revert`, { ids: [`image:${sl.id}`] });
    setChanges(r.changes); changedNow.v = true;
    await refreshState();
    const nsl = S.st.slots.find((x) => x.id === sl.id);
    crop.querySelector("img").src = nsl.url; sl.url = nsl.url;
    s.foot.querySelector("#keep-pic").hidden = true;
    livePicture(nsl);
  }
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) send(f); });
  fileIn.addEventListener("change", () => { if (fileIn.files[0]) send(fileIn.files[0]); });
  async function send(file) {
    status.replaceChildren();
    if (file.size > 30 * 1024 * 1024) { status.replaceChildren(h("div", { class: "note bad" }, ic("alert"), h("span", {}, t("e_image_too_big")))); return; }
    prog.hidden = false; prog.firstChild.style.width = "0%";
    useBtn.disabled = true;
    try {
      up = await upload(`/api/s/${S.sid}/upload/${sl.id}`, file, (p) => (prog.firstChild.style.width = Math.round(p * 100) + "%"));
    } catch (e) {
      prog.hidden = true;
      const b = e.body || {};
      const code = (b.error || "").replace(/^image_/, "");
      status.replaceChildren(h("div", { class: "note bad" }, ic("alert"), h("span", {}, STR[L]["e_image_" + code] ? t("e_image_" + code, { need: b.need, have: b.have }) : t("e_generic"))));
      return;
    }
    prog.hidden = true;
    const ws = (up.warnings || []).map((w) => h("div", { class: "note warn" }, ic("info"), h("span", {}, t("w_" + w.code, { need: w.need, have: w.have }))));
    status.replaceChildren(...ws);
    const img = crop.querySelector("img");
    img.onload = () => place(true);
    img.src = up.thumb;
    crop.querySelector(".hint")?.remove();
    if (sl.fit === "cover") crop.append(h("div", { class: "hint" }, ic("hand"), t("drag_move")));
    useBtn.disabled = false;
  }
  function frameBox() { return crop.getBoundingClientRect(); }
  function place(reset) {
    const img = crop.querySelector("img");
    if (!up) return;
    if (sl.fit !== "cover") { crop.className = "crop static" + (sl.alpha ? " alpha" : ""); img.style.objectFit = "contain"; return; }
    crop.className = "crop movable" + (sl.alpha ? " alpha" : "");
    const fb = frameBox();
    const min = Math.max(fb.width / up.w, fb.height / up.h);
    if (reset) { tf = { s: min, x: (fb.width - up.w * min) / 2, y: (fb.height - up.h * min) / 2, min }; zoom.value = "1"; zoom.disabled = false; }
    img.style.width = up.w + "px"; img.style.height = up.h + "px";
    clamp();
    img.style.transform = `translate(${tf.x}px, ${tf.y}px) scale(${tf.s})`;
  }
  function clamp() {
    const fb = frameBox();
    const w = up.w * tf.s, hh = up.h * tf.s;
    tf.x = Math.min(0, Math.max(fb.width - w, tf.x));
    tf.y = Math.min(0, Math.max(fb.height - hh, tf.y));
  }
  function zoomTo(z, cx, cy) {
    const fb = frameBox();
    cx = cx ?? fb.width / 2; cy = cy ?? fb.height / 2;
    const ns = tf.min * z;
    tf.x = cx - (cx - tf.x) * (ns / tf.s);
    tf.y = cy - (cy - tf.y) * (ns / tf.s);
    tf.s = ns;
    place(false);
  }
  zoom.addEventListener("input", () => zoomTo(+zoom.value));
  crop.addEventListener("wheel", (e) => {
    if (!up || sl.fit !== "cover") return;
    e.preventDefault();
    const fb = frameBox();
    const z = Math.max(1, Math.min(3, +zoom.value * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
    zoom.value = String(z);
    zoomTo(z, e.clientX - fb.left, e.clientY - fb.top);
  }, { passive: false });
  let drag = null;
  crop.addEventListener("pointerdown", (e) => { if (!up || sl.fit !== "cover") return; drag = { x: e.clientX, y: e.clientY, tx: tf.x, ty: tf.y }; crop.setPointerCapture(e.pointerId); crop.classList.add("dragging"); });
  crop.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    tf.x = drag.tx + dx; tf.y = drag.ty + dy;
    place(false);
  });
  crop.addEventListener("pointerup", () => { drag = null; crop.classList.remove("dragging"); });
  new ResizeObserver(() => up && place(false)).observe(crop);
  if (!up) crop.append(h("div", { class: "hint" }, t("current")));
  async function apply() {
    if (!up) return;
    const fb = frameBox();
    const c = sl.fit === "cover" ? { x: -tf.x / (up.w * tf.s), y: -tf.y / (up.h * tf.s), w: fb.width / (up.w * tf.s), h: fb.height / (up.h * tf.s) } : {};
    useBtn.disabled = true;
    useBtn.replaceChildren(h("span", { class: "spin" }), t("working"));
    try {
      const r = await api("POST", `/api/s/${S.sid}/image/${sl.id}`, { upload: up.id, crop: c });
      setChanges(r.changes); changedNow.v = true;
      const kb = r.written.reduce((a, w) => a + w.kb, 0);
      await refreshState();
      const nsl = S.st.slots.find((x) => x.id === sl.id);
      crop.className = "crop static" + (sl.alpha ? " alpha" : "");
      crop.querySelector(".hint")?.remove();
      const im = crop.querySelector("img"); im.style.cssText = ""; im.src = nsl.url;
      up = null; zoom.disabled = true;
      status.replaceChildren(h("div", { class: "note ok" }, ic("check"), h("span", {}, t("ready_pic", { sizes: sizesWord(r.written.length), kb: nf().format(Math.round(kb)), fmt: r.written[0].format || "WebP" }))));
      s.foot.querySelector("#keep-pic").hidden = false;
      livePicture(nsl);
      watchPreview(2600);
    } catch (e) {
      const b = e.body || {};
      const code = (b.error || "").replace(/^image_/, "");
      status.replaceChildren(h("div", { class: "note bad" }, ic("alert"), h("span", {}, STR[L]["e_image_" + code] ? t("e_image_" + code, b) : t("e_generic"))));
    } finally {
      useBtn.replaceChildren(t("use_pic"));
      useBtn.disabled = !up;
    }
  }
}
function slotChanged(sl) {
  // the picture the canvas's build was made with is not the one in the draft
  if (STATIC) return sl.url !== sl.base;
  const hs = (S.frame && S.frame.images && S.frame.images[sl.id]) || [];
  const v = (sl.url.split("v=")[1] || "");
  return !!v && !hs.some((x) => x && x.startsWith(v));
}
const IMG_AT = (rev, slot) => STATIC ? STATIC.imageAt(S.sid, rev, slot) : `/api/s/${S.sid}/image-at/${rev}/${slot}.webp`;
async function livePicture(sl) {
  if (!iframe || !S.frame) return;
  try {
    const r = await fetch(sl.url, { credentials: "same-origin" });
    const buf = await r.arrayBuffer();
    post({ type: "mw:img", files: sl.files.map((f) => f.path.split("/").pop()), buffer: buf, mime: "image/webp" }, [buf]);
  } catch {}
}

// ── search ───────────────────────────────────────────────────────────────────────────────────────────────────────
let measure = null;
function px(text, font) {
  measure = measure || document.createElement("canvas").getContext("2d");
  measure.font = font;
  return measure.measureText(text).width;
}
function cutAt(text, max, font) {
  if (px(text, font) <= max) return null;
  let lo = 0, hi = text.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (px(text.slice(0, mid) + " …", font) <= max) lo = mid; else hi = mid - 1; }
  return text.slice(0, lo).trim();
}
function seoHints(page, lang, title, desc, isDefaultT) {
  const out = [];
  const tf = "20px Arial";
  if (title) {
    const cut = cutAt(title, 580, tf);
    if (cut) out.push(["warn", t("h_long_t", { cut: cut.split(" ").slice(-3).join(" ") })]);
    else if ([...title].length < 22) out.push(["warn", t("h_short_t")]);
    const brand = (S.st.seo.brand || []).filter((b) => (lang === "ar" ? /[؀-ۿ]/.test(b) : !/[؀-ۿ]/.test(b)));
    if (brand.length && !brand.some((b) => title.toLowerCase().includes(b.toLowerCase()))) out.push(["warn", t("h_brand", { b: brand[0] })]);
    const dup = (S.st.seo.pages || []).find((p) => p.id !== page.id && seoTitle(p, lang) === title);
    if (dup) out.push(["warn", t("h_dup", { p: dup.id === "" ? t("home") : pageLabel({ id: dup.id, title: seoTitle(dup, lang) }) })]);
    const ar = /[؀-ۿ]/.test(title);
    if (lang === "ar" && !ar) out.push(["warn", t("h_script_ar")]);
    if (lang === "en" && ar && !/[A-Za-z]{3}/.test(title)) out.push(["warn", t("h_script_en")]);
  }
  const dl = [...(desc || "")].length;
  if (!desc) out.push(["warn", t("no_desc")]);
  else if (dl > 165) out.push(["warn", t("h_long_d")]);
  else if (dl < 60) out.push(["warn", t("h_short_d")]);
  return out;
}
function seoTitle(p, lang) {
  const x = p.langs[lang];
  if (!x) return "";
  const f = p.title_key && S.F.get(p.title_key);
  const v = f && f.values[lang];
  return v || x.default_title || x.title;
}
function seoDesc(p, lang) {
  const x = p.langs[lang];
  if (!x) return "";
  const f = p.desc_key && S.F.get(p.desc_key);
  const v = f && f.values[lang];
  return v || x.default_description || x.description;
}
function altHints(v) {
  const s = (v || "").trim();
  if (!s) return [["warn", t("h_empty_alt")]];
  if (/^(image|picture|photo|صورة)\s+(of|ل|لـ)?/i.test(s)) return [["info", t("h_alt_img")]];
  if (/\.(jpe?g|png|webp|gif|heic)$/i.test(s) || /^(img|dsc|pxl)[_-]?\d+/i.test(s)) return [["warn", t("h_alt_file")]];
  if ([...s].length > 140) return [["info", t("h_alt_long")]];
  return [];
}
function pageStatus(p) {
  let worst = "ok";
  for (const l of Object.keys(p.langs)) {
    const hs = seoHints(p, l, seoTitle(p, l), seoDesc(p, l));
    const ah = p.langs[l].images.flatMap((im) => im.alt_key ? altHints(S.F.get(im.alt_key)?.values[l] ?? im.alt) : altHints(im.alt));
    if (hs.length || ah.some(([k]) => k === "warn")) worst = "warn";
  }
  return worst;
}
function viewSearch() {
  const main = document.getElementById("main");
  const pages = S.st.seo.pages || [];
  if (!pages.length) {
    main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page" }, h("div", { class: "empty" }, h("div", { class: "art", html: icon("search") }), h("h3", {}, t("preparing")), h("p", {}, t("preparing_sub"))))));
    watchPreview(); setTimeout(async () => { await refreshState(); if (S.tab === "search") viewSearch(); }, 4000);
    return;
  }
  if (!pages.some((p) => p.id === S.seoPage)) S.seoPage = pages[0].id;
  const list = h("nav", { class: "seo-pages", "aria-label": t("pages") });
  const pane = h("div");
  function drawList() {
    list.replaceChildren(...pages.map((p) => {
      const lab = p.id === "" ? t("home") : pageLabel({ id: p.id, title: (p.langs[L] || Object.values(p.langs)[0]).title });
      return h("button", { "aria-current": String(p.id === S.seoPage), onclick: () => { S.seoPage = p.id; drawList(); drawPane(); } },
        h("span", { class: "st " + pageStatus(p) }), h("span", { class: "lbl" }, lab, h("small", { dir: "ltr" }, "/" + (Object.values(p.langs)[0].path || ""))));
    }));
  }
  function drawPane() {
    const p = pages.find((x) => x.id === S.seoPage);
    const order = [S.plang || L, ...langs().filter((l) => l !== (S.plang || L))].filter((l) => p.langs[l]);
    pane.replaceChildren(...order.map((l) => langCard(p, l)));
  }
  function langCard(p, l) {
    const x = p.langs[l];
    const dir = ldir(l);
    const host = (site().live_url || "https://example.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const serpT = h("div", { class: "t", dir }), serpD = h("div", { class: "d", dir });
    const s = site();
    const serp = h("div", { class: "serp", dir },
      h("div", { class: "who" }, h("span", { class: "fav", style: { background: s.color, color: s.ink } }, s.mark ? h("img", { src: s.mark, alt: "", style: { width: "72%", height: "72%", objectFit: "contain" } }) : (s.short || "").slice(0, 2)),
        h("div", {}, h("div", { class: "nm" }, siteName(s)), h("div", { class: "url" }, "https://" + host + (x.path ? " › " + x.path.replace(/\/$/, "").split("/").join(" › ") : "")))),
      serpT, serpD);
    const hintsT = h("div", { class: "hints" }), hintsD = h("div", { class: "hints" });
    const mT = h("i"), mD = h("i");
    const tf = p.title_key && S.F.get(p.title_key), dfd = p.desc_key && S.F.get(p.desc_key);
    const over = !!(p.title_key && p.title_key.startsWith("seo:"));
    const tB = tf ? edBlock(tf, l, { label: t("s_title"), placeholder: over ? x.default_title : "…", optional: over }) : null;
    const dB = dfd ? edBlock(dfd, l, { label: t("s_desc"), placeholder: over ? x.default_description : "…", optional: over, long: true }) : null;
    const val = (f, d) => (f ? display(f, l, f.values[l]) : "") || d || "";
    function draw() {
      const tt = val(tf, x.default_title || x.title);
      const dd = val(dfd, x.default_description || x.description);
      serpT.textContent = tt;
      serpD.textContent = dd || t("no_desc");
      serpD.classList.toggle("none", !dd);
      const w = px(tt, "20px Arial");
      mT.style.width = Math.min(100, (w / 580) * 100) + "%";
      mT.className = w > 580 ? "bad" : [...tt].length < 22 ? "warn" : "ok";
      const dl = [...dd].length;
      mD.style.width = Math.min(100, (dl / 160) * 100) + "%";
      mD.className = dl > 165 ? "bad" : dl < 60 ? "warn" : "ok";
      const hs = seoHints(p, l, tt, dd);
      const dKeys = [t("no_desc"), t("h_long_d"), t("h_short_d")];
      hintsT.replaceChildren(...hs.filter((hh) => dKeys.indexOf(hh[1]) < 0).map(([k, m]) => h("div", { class: "note " + k }, ic("info"), h("span", {}, m))));
      hintsD.replaceChildren(...hs.filter((hh) => dKeys.indexOf(hh[1]) >= 0).map(([k, m]) => h("div", { class: "note " + k }, ic("info"), h("span", {}, m))));
      drawList();
    }
    for (const b of [tB, dB]) if (b) b.ed.addEventListener("input", draw);
    const alts = x.images.filter((im) => im.slot || im.alt_key).map((im) => {
      const sl = im.slot && S.st.slots.find((z) => z.id === im.slot);
      const af = im.alt_key && S.F.get(im.alt_key);
      if (!af) return null;
      const blk = edBlock(af, l);
      const extra = h("div", { class: "hints" });
      const upd = () => extra.replaceChildren(...altHints(af.values[l]).map(([k, m]) => h("div", { class: "note " + k }, ic("info"), h("span", {}, m))));
      blk.querySelector(".ed").addEventListener("input", () => { upd(); drawList(); });
      upd();
      return h("div", { class: "alt" }, h("div", { class: "th" + (sl && sl.alpha ? " alpha" : "") }, sl ? h("img", { src: sl.url, alt: "", style: sl.alpha ? { objectFit: "contain" } : null }) : null), h("div", {}, blk, extra));
    }).filter(Boolean);
    const card = h("section", { class: "card seo-lang" },
      h("h3", {}, h("span", { class: "lang-tag" }, lname(l)), t("s_preview")),
      serp,
      tB ? h("div", { class: "field" }, tB, h("div", { class: "meter" }, mT), over ? h("div", { class: "serp-tag", style: { margin: "6px 0 0" } }, t("s_default")) : null, hintsT) : null,
      dB ? h("div", { class: "field", style: { marginTop: "16px" } }, dB, h("div", { class: "meter" }, mD), over ? h("div", { class: "serp-tag", style: { margin: "6px 0 0" } }, t("s_default_d")) : null, hintsD) : null,
      alts.length ? [h("div", { class: "list-h", style: { marginTop: "24px" } }, t("s_alts")), h("div", { class: "alts" }, alts)] : null);
    draw();
    return card;
  }
  main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page" },
    h("div", { class: "page-head" }, h("div", { class: "grow" }, h("h1", {}, t("seo_title")), h("p", {}, t("seo_sub")))),
    h("div", { class: "seo" }, list, pane))));
  drawList(); drawPane();
}

// ── links ────────────────────────────────────────────────────────────────────────────────────────────────────────
function viewLinks() {
  const main = document.getElementById("main");
  const soc = S.st.social;
  if (!soc) { main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page" }, h("div", { class: "empty" }, h("div", { class: "art", html: icon("link") }), h("h3", {}, t("links_title")))))); return; }
  let links = soc.links.map((l) => ({ ...l, raw: l.url }));
  const box = h("div", { class: "card links" });
  const errs = {};
  let timer = null;
  function draw() {
    box.replaceChildren(...links.map((l, i) => {
      const inp = h("input", { class: "input", dir: "ltr", value: l.raw, placeholder: "https://", "aria-label": soc.names[l.network] || l.name, spellcheck: "false", autocomplete: "off",
        oninput: () => { l.raw = inp.value; clearTimeout(timer); timer = setTimeout(save, 700); }, onblur: () => { clearTimeout(timer); save(); } });
      const e = errs[i] || errs[l.network];
      return h("div", { class: "lrow" }, h("span", { html: netIcon(l.network) }),
        h("div", {}, h("div", { class: "who" }, soc.names[l.network] || l.name), inp,
          e ? h("div", { class: "err" }, e) : l.url ? h("div", { class: "ok" }, ic("check"), t("opens", { u: l.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") })) : null),
        h("div", { class: "acts" }, l.url ? h("a", { class: "btn btn-ghost btn-icon btn-sm", href: l.url, target: "_blank", rel: "noopener", title: t("test"), "aria-label": t("test"), html: icon("out") }) : null,
          soc.kind === "list" ? h("button", { class: "btn btn-ghost btn-icon btn-sm", title: t("remove"), "aria-label": t("remove"), onclick: () => { links.splice(i, 1); draw(); save(); }, html: icon("x") }) : null));
    }));
    if (soc.kind === "list") {
      const missing = soc.allowed.filter((n) => !links.some((l) => l.network === n));
      if (missing.length) box.append(h("div", { class: "addlink" }, missing.map((n) => h("button", { class: "btn btn-sm", onclick: () => { links.push({ network: n, name: soc.names[n], url: "", raw: "" }); draw(); box.querySelectorAll("input")[links.length - 1]?.focus(); } }, ic("plus"), t("add_link", { n: soc.names[n] })))));
    }
  }
  async function save() {
    const body = links.map((l) => ({ network: l.network, url: l.raw }));
    if (body.some((b) => !b.url.trim())) { for (const k in errs) delete errs[k]; links.forEach((l, i) => { if (!l.raw.trim()) errs[i] = t("e_link_empty"); }); draw(); return; }
    try {
      const r = await api("PUT", `/api/s/${S.sid}/social`, { links: body });
      for (const k in errs) delete errs[k];
      links = r.links.map((l) => ({ ...l, raw: l.url }));
      S.st.social.links = r.links;
      setChanges(r.changes);
      const focused = document.activeElement && document.activeElement.closest?.(".lrow");
      const fi = focused ? [...box.querySelectorAll(".lrow")].indexOf(focused) : -1;
      draw();
      if (fi >= 0) { const inp = box.querySelectorAll(".lrow input")[fi]; if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
    } catch (e) {
      const b = e.body || {};
      const code = (b.error || "").replace(/^link_/, "");
      for (const k in errs) delete errs[k];
      const key = b.index != null ? b.index : b.network || 0;
      errs[key] = STR[L]["e_link_" + code] ? t("e_link_" + code, b) : t("e_generic");
      draw();
    }
  }
  draw();
  main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page" },
    h("div", { class: "page-head" }, h("div", { class: "grow" }, h("h1", {}, t("links_title")), h("p", {}, t("links_sub")))), box)));
}

// ── history ──────────────────────────────────────────────────────────────────────────────────────────────────────
function changeRow(c, actions, rev) {
  const what = [];
  let ba = null;
  if (c.type === "text") {
    const lab = fieldLabel(c.key);
    const f = S.F.get(c.key);
    const kind = c.key.startsWith("seo:") || isSeoKey(c.key) ? t("search_ch", { l: lname(c.lang) }) : isAltKey(c.key) ? t("alt_ch", { l: lname(c.lang) }) : t("text_in", { l: lname(c.lang) });
    what.push(h("span", { class: "badge grey" }, kind), lab.role && !c.hidden ? h("span", {}, lab.role + (lab.section ? " · " + lab.section : "")) : null);
    const show = (v) => f ? display(f, c.lang, v) : v;
    ba = h("div", { class: "ba", dir: ldir(c.lang) }, c.before ? h("s", {}, show(c.before)) : h("s", {}, "—"), h("span", { class: "arrow" }, ldir(c.lang) === "rtl" ? "←" : "→"), h("span", {}, show(c.after) || "—"));
  } else if (c.type === "image") {
    const sl = S.st.slots.find((x) => x.id === c.slot);
    what.push(h("span", { class: "badge grey" }, t("pic_ch")), sl ? h("span", { dir: "auto" }, slotLabel(sl)) : null);
    const before = rev ? (rev.parent ? IMG_AT(rev.parent, c.slot) : null) : IMG_AT("HEAD", c.slot);
    ba = h("div", { class: "thumbs" }, before ? h("img", { src: before, alt: "", class: sl && sl.alpha ? "alpha" : "" }) : null, h("span", { class: "arrow" }, L === "ar" ? "←" : "→"),
      h("img", { src: rev ? IMG_AT(rev.id, c.slot) : sl ? sl.url : "", alt: "", class: sl && sl.alpha ? "alpha" : "" }));
  } else {
    what.push(h("span", { class: "badge grey" }, t("link_ch")), h("span", {}, (S.st.social?.names || {})[c.network] || c.network));
    ba = h("div", { class: "ba", dir: "ltr" }, h("s", {}, c.before || "—"), h("span", { class: "arrow" }, "→"), h("span", {}, c.after || "—"));
    ba.style.textAlign = L === "ar" ? "right" : "left";
  }
  return h("div", { class: "chg" }, h("div", {}, h("div", { class: "what" }, what), ba), h("div", {}, actions));
}
const isSeoKey = (k) => (S.st.seo.pages || []).some((p) => p.title_key === k || p.desc_key === k);
const isAltKey = (k) => S.st.slots.some((s) => s.alt === k);
async function viewHistory() {
  const main = document.getElementById("main");
  main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page" }, h("div", { class: "page-head" }, h("div", { class: "grow" }, h("h1", {}, t("hist_title")), h("p", {}, t("hist_sub")))), h("div", { class: "hist", id: "hist" }, h("div", { class: "spin" })))));
  const [hist, ch] = await Promise.all([api("GET", `/api/s/${S.sid}/history`), loadChanged()]);
  const box = document.getElementById("hist");
  if (!box) return;
  const out = [];
  if (ch.length) out.push(h("div", { class: "ver draft" }, h("span", { class: "node" }), h("div", { class: "card" },
    h("div", { class: "ver-h" }, h("span", { class: "t" }, t("unpublished")), h("span", { class: "s" }, plural(ch.length, "one_item", "n_items")), h("span", { class: "grow" }), h("button", { class: "btn btn-sm btn-ink", onclick: review }, t("review"))))));
  for (const v of hist.versions) {
    const open = { v: v.live || hist.versions.indexOf(v) < 2 };
    const body = h("div");
    const drawBody = () => body.replaceChildren(...(open.v ? v.changes.map((c) => changeRow(c, h("button", { class: "btn btn-sm btn-ghost", onclick: async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { const r = await api("POST", `/api/s/${S.sid}/undo`, { version: v.id, change: c.id }); setChanges(r.changes); await refreshState(); toast(t("undone"), { icon: "undo" }); viewHistory(); }
      catch (err) { toast(err.body?.error === "busy" ? t("e_busy") : t("e_generic"), { bad: true }); b.disabled = false; }
    } }, ic("undo"), t("undo")), v)) : []));
    drawBody();
    out.push(h("div", { class: "ver" + (v.live ? " live" : "") }, h("span", { class: "node" }), h("div", { class: "card" },
      h("div", { class: "ver-h" },
        h("span", { class: "t" }, v.first ? t("start") : t("by_at", { who: v.name, when: when(v.at) })),
        v.live ? h("span", { class: "badge green" }, t("live_now")) : null,
        h("span", { class: "s" }, v.first ? t("start_sub") : plural(v.changes.length, "one_item", "n_items")),
        h("span", { class: "grow" }),
        !v.first && v.changes.length ? h("button", { class: "btn btn-quiet", onclick: () => { open.v = !open.v; drawBody(); }, "aria-expanded": String(open.v), html: icon("chevron") }) : null,
        !v.live ? h("button", { class: "btn btn-sm", onclick: async () => {
          if (!(await confirmBox(t("restore_q"), t("restore_sub"), t("restore")))) return;
          const r = await api("POST", `/api/s/${S.sid}/restore`, { version: v.id }); setChanges(r.changes); await refreshState(); toast(t("restored"), { icon: "undo" }); viewHistory();
        } }, t("restore")) : null), body)));
  }
  box.replaceChildren(...out);
}

// ── review and publish ───────────────────────────────────────────────────────────────────────────────────────────
function reviewTitle(n) {
  if (n === 1) return t("review_title1");
  if (L === "ar") return n === 2 ? "نشر تغييرين" : n <= 10 ? `نشر ${nf().format(n)} تغييرات` : `نشر ${nf().format(n)} تغييرًا`;
  return t("review_title", { n: nf().format(n) });
}
async function settle() {
  // an edit still on its way is part of what the client means to publish: finish it first
  if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
  for (let i = 0; pending > 0 && i < 200; i++) await new Promise((r) => setTimeout(r, 50));
}
async function review() {
  await settle();
  const ch = await loadChanged();
  if (!ch.length) return toast(t("all_live"), { icon: "check" });
  const s = sheet({ title: reviewTitle(ch.length), sub: t("review_sub"), narrow: true, body: h("div"),
    foot: [h("button", { class: "btn", id: "pv-btn", onclick: () => { s.close(); previewOverlay(); } }, ic("eye"), t("preview")), h("span", { class: "grow" }),
      h("button", { class: "btn btn-blue", id: "go", onclick: () => publish(s) }, t("publish_now"))] });
  function draw(list) {
    const g = { text: [], search: [], pics: [], links: [] };
    for (const c of list) {
      if (c.type === "image") g.pics.push(c);
      else if (c.type === "social") g.links.push(c);
      else if (isSeoKey(c.key) || isAltKey(c.key)) g.search.push(c);
      else g.text.push(c);
    }
    s.body.replaceChildren(...Object.entries(g).filter(([, v]) => v.length).map(([k, v]) => h("div", { class: "rev-group" },
      h("div", { class: "list-h", style: { marginTop: 0 } }, t({ text: "g_text", search: "g_search", pics: "g_pics", links: "g_links" }[k])),
      v.map((c) => changeRow(c, h("button", { class: "btn btn-sm btn-ghost", title: t("keep_pub"), "aria-label": t("keep_pub"), onclick: async (e) => {
        e.currentTarget.disabled = true;
        const r = await api("POST", `/api/s/${S.sid}/revert`, { ids: [c.id] });
        setChanges(r.changes);
        await refreshState();
        if (S.tab === "content" && S.frame) patchAll();
        const rest = list.filter((x) => x.id !== c.id);
        if (!rest.length) { s.close(); toast(t("all_live"), { icon: "check" }); return; }
        s.head.querySelector("h2").textContent = reviewTitle(rest.length);
        draw(rest);
      } }, ic("undo"), h("span", { class: "hide-sm" }, t("keep_pub"))), null)))));
  }
  draw(ch);
}
async function publish(s) {
  s.foot.replaceChildren();
  const steps = ["build", "checks", "deploy", "record"];
  const rows = steps.map((k) => h("div", { class: "stepr", dataset: { k } }, h("span", { class: "ic" }), h("span", {}, t("st_" + k))));
  s.head.querySelector("h2").textContent = t("publish");
  s.head.querySelector("p") && (s.head.querySelector("p").textContent = "");
  s.body.replaceChildren(h("div", { class: "steps" }, rows));
  let job;
  try { job = await api("POST", `/api/s/${S.sid}/publish`, {}); }
  catch (e) { return result(s, { state: "failed", result: { code: e.body?.error === "busy" ? "busy" : "server" } }); }
  const tick = (j) => {
    const done = j.state === "done";
    steps.forEach((k, i) => {
      const r = rows[i];
      const at = j.steps.indexOf(k);
      const cur = j.steps[j.steps.length - 1];
      r.className = "stepr" + (done || (at >= 0 && k !== cur) ? " done" : at >= 0 && j.state === "running" ? " now" : at >= 0 && j.state === "failed" ? " fail" : "");
      r.querySelector(".ic").innerHTML = r.classList.contains("done") ? icon("check") : r.classList.contains("now") ? '<span class="spin"></span>' : r.classList.contains("fail") ? icon("x") : "";
    });
  };
  while (true) {
    await new Promise((r) => setTimeout(r, 350));
    try { job = await api("GET", `/api/jobs/${job.id}`); } catch { continue; }
    tick(job);
    if (job.state !== "running") break;
  }
  await new Promise((r) => setTimeout(r, 450));
  result(s, job);
}
async function result(s, job) {
  if (job.state === "done") {
    S.changes = 0; counts();
    const sNow = site(); sNow.live = { at: Date.now() / 1000 };
    changedSet.clear(); published = {};
    s.body.replaceChildren(h("div", { class: "result" }, h("div", { class: "big ok", html: icon("check") }), h("h3", {}, t("ok_title")), h("p", {}, t("ok_sub")),
      STATIC ? h("p", { class: "demo-note" }, t("demo_publish")) : null));
    s.foot.replaceChildren(h("span", { class: "grow" }),
      STATIC ? h("button", { class: "btn", onclick: () => { s.close(); previewOverlay(); } }, ic("eye"), t("view_site"))
        : job.result.url ? h("a", { class: "btn", href: job.result.url, target: "_blank", rel: "noopener" }, ic("out"), t("view_site")) : null,
      h("button", { class: "btn btn-ink", onclick: () => s.close() }, t("done")));
    refreshState().then(() => { if (S.tab === "history") viewHistory(); });
    return;
  }
  const r = job.result || {};
  const items = [];
  if (r.code === "checks") {
    for (const f of r.failures || []) {
      const msg = f.message ? (f.message[L] || f.message.en) : t("f_rule");
      let where = "";
      if (f.field && S.F.get(f.field)) { const lab = fieldLabel(f.field); where = t("where_l", { l: lname(f.lang || S.plang), w: (lab.role + (lab.section ? " · " + lab.section : "")) }); }
      items.push(h("div", { class: "w" }, h("div", {}, h("b", {}, msg), h("span", { dir: "auto" }, where || f.line)),
        f.field && S.F.get(f.field) ? h("button", { class: "btn btn-sm", onclick: () => { s.close(); goField(f.field, f.lang); } }, t("fix")) : null));
    }
  }
  const head = { build: "f_build", checks: "f_checks", nothing: "f_nothing", busy: "f_busy", stray: "f_stray", deploy: "f_deploy" }[r.code] || "f_server";
  const tech = [r.error, ...(r.failures || []).map((f) => f.line), ...(job.log || []).map((l) => `$ ${l.cmd}  (${l.code}, ${l.seconds}s)\n${(l.out || "").slice(-1800)}`)].filter(Boolean).join("\n\n");
  s.body.replaceChildren(h("div", { class: "result" }, h("div", { class: "big bad", html: icon("alert") }), h("h3", {}, t("bad_title")), h("p", {}, r.code === "nothing" ? t("f_nothing") : t("bad_sub")),
    STATIC ? h("p", { class: "demo-note" }, t("demo_publish")) : null,
    h("div", { class: "why" }, items.length ? items : h("div", { class: "w" }, h("div", {}, h("b", {}, t(head))))),
    tech ? h("details", { class: "tech" }, h("summary", {}, t("tech")), h("pre", {}, tech)) : null));
  s.foot.replaceChildren(h("span", { class: "grow" }), h("button", { class: "btn btn-ink", onclick: () => s.close() }, t("close")));
}
function goField(key, lang) { jumpTo(key, lang); }
async function jumpTo(key, lang) {
  // the text opens in the drawer at once; the page it lives on loads behind it and scrolls to it when ready —
  // never a second opening later, which would cut into typing already begun
  const pv = S.st.preview;
  const l = lang || S.plang;
  const idx = pv.ready ? pv.ids.findIndex(([k, ll]) => k === key && ll === l) : -1;
  const p = pv.ready ? pv.pages.find((x) => x.lang === l && (x.ids || []).includes(idx)) : null;
  if (S.tab !== "content") await openSite(S.sid, "content");
  const move = !!p && (p.id !== S.page || l !== S.plang);
  if (move) { S.page = p.id; S.plang = l; }
  S.pendingScroll = key;
  openEditor(key, !move);
  if (move) { loadCanvas(); viewContentBar(); }
}

// ── preview, exactly as it will go live ──────────────────────────────────────────────────────────────────────────
async function previewOverlay() {
  const keep = { iframe, frame: S.frame };
  const ov = h("div", { class: "pv", role: "dialog", "aria-modal": "true", "aria-label": t("pv_title") });
  const stage = h("div", { class: "pv-stage" }, h("div", { class: "frame", id: "pvframe" }, h("div", { class: "veil", id: "pvveil" }, h("div", { class: "shimmer" }), h("div", { class: "box" }, h("div", { class: "spin" }), h("h3", {}, t("preparing"))))));
  let dev = S.device, lang = S.plang, page = S.page;
  const pagebtn = h("button", { class: "pagepick", "aria-haspopup": "menu" }, ic("layers"), h("span"), h("span", { html: icon("chevron") }));
  const close = () => { ov.remove(); iframe = keep.iframe; S.frame = keep.frame; S.view = null; document.removeEventListener("keydown", key); };
  const key = (e) => { if (e.key === "Escape") close(); };
  ov.append(h("div", { class: "pv-top" },
    h("button", { class: "btn btn-ghost btn-sm", onclick: close }, h("span", { html: icon("arrow"), style: { display: "inline-flex", transform: L === "ar" ? "none" : "scaleX(-1)" } }), h("span", { class: "hide-sm" }, t("back_edit"))),
    h("div", { class: "hide-sm" }, h("h2", {}, t("pv_title")), h("p", {}, t("pv_sub"))),
    h("span", { class: "grow" }), pagebtn,
    langs().length > 1 ? h("div", { class: "seg" }, langs().map((l) => h("button", { "aria-pressed": String(l === lang), onclick: (e) => { lang = l; e.currentTarget.parentNode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); load(); } }, lname(l)))) : null,
    h("div", { class: "seg hide-sm" }, ["desktop", "phone"].map((d) => h("button", { "aria-pressed": String(d === dev), "aria-label": t(d), onclick: (e) => { dev = d; e.currentTarget.parentNode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); stage.firstChild.classList.toggle("phone", d === "phone"); }, html: icon(d) }))),
    h("button", { class: "btn btn-blue btn-sm", onclick: () => { close(); review(); } }, t("publish"))), stage);
  document.body.append(ov);
  document.addEventListener("keydown", key);
  S.view = "preview";
  stage.firstChild.classList.toggle("phone", dev === "phone");
  const pv = await api("POST", `/api/s/${S.sid}/preview`, {});
  S.st.preview = pv;
  function load() {
    const ps = pv.pages.filter((p) => p.lang === lang);
    const p = ps.find((x) => x.id === page) || ps[0];
    page = p.id;
    pagebtn.children[1].textContent = pageLabel(p);
    S.frame = { id: pv.id, ids: pv.ids, values: pv.values, images: pv.images, path: p.path, lang, idOf: new Map(pv.ids.map(([k, l], i) => [k + "|" + l, i])) };
    const f = h("iframe", { title: t("pv_title"), src: pv.base + p.path, sandbox: "allow-scripts allow-same-origin allow-popups", referrerpolicy: "no-referrer", class: "on" });
    const fr = document.getElementById("pvframe");
    fr.querySelectorAll("iframe").forEach((x) => x.remove());
    fr.append(f);
    iframe = f;
    document.getElementById("pvveil").classList.add("off");
  }
  pagebtn.onclick = (e) => menu(e.currentTarget, [h("div", { class: "mh" }, t("pages")), pv.pages.filter((p) => p.lang === lang).map((p) => h("button", { class: "mi", onclick: () => { closeMenu(); page = p.id; load(); } }, h("span", { class: "tx" }, pageLabel(p)), p.id === page ? h("span", { html: icon("check") }) : null))]);
  load();
}

boot();
