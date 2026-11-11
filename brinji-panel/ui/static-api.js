// static-api.js — the panel's server, stood in by the browser, for the demo on a static host (middlewaresy.com).
//
// Everything the visitor does is real except the last step: words are checked as the server checks them (figures stay,
// nothing invented), pictures are cropped, sized and compressed in the browser, links are tidied the same way, history
// and undo work. Publishing cannot run the site's build here, so it applies the site's own instant rules (the hints in
// its panel.json) as the checks and records a version — the interface says so. Nothing is saved: a reload starts over.
const BASE = new URL(".", import.meta.url).href;
let DATA = null;
const store = {};          // site id → its draft, its published state, its versions
const jobs = {};
let lang = sessionStorage.getItem("mw.static.lang") || null;

async function load() {
  if (DATA) return DATA;
  DATA = await (await fetch(BASE + "data.json")).json();
  for (const s of DATA.sites) {
    const text = {};
    for (const f of s.state.fields) for (const [l, v] of Object.entries(f.values)) text[f.key + "|" + l] = v;
    const slots = {};
    for (const sl of s.state.slots) slots[sl.id] = sl.url;
    const social = (s.state.social ? s.state.social.links : []).map((x) => ({ ...x }));
    const snap = { text, slots, social };
    store[s.id] = { site: s, base: clone(snap), published: clone(snap), draft: clone(snap), versions: [], labels: {}, busy: null, blobs: {} };
  }
  return DATA;
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const fail = (status, error, extra = {}) => { throw { status, body: { error, ...extra } }; };
const rid = () => Math.random().toString(36).slice(2, 12);

// ── the API, by path ─────────────────────────────────────────────────────────────────────────────────────────────
export async function api(method, path, body) {
  await load();
  await new Promise((r) => setTimeout(r, 40));        // the rhythm of a real request, so "Saving…" can be seen
  if (path === "/api/login" && method === "POST") {
    const u = DATA.user;
    if ((body.email || "").trim().toLowerCase() !== u.email || body.password !== DATA.password) fail(401, "wrong");
    sessionStorage.setItem("mw.static.user", u.email);
    return me();
  }
  if (path === "/api/logout") { sessionStorage.removeItem("mw.static.user"); return { ok: true }; }
  if (!sessionStorage.getItem("mw.static.user")) fail(401, "signed_out");
  if (path === "/api/me") {
    if (method === "PUT" && body && body.lang) { lang = body.lang; sessionStorage.setItem("mw.static.lang", lang); }
    return me();
  }
  let m = path.match(/^\/api\/jobs\/([\w-]+)$/);
  if (m) { const j = jobs[m[1]]; if (!j) fail(404, "not_found"); return pub(j); }
  m = path.match(/^\/api\/s\/([\w-]+)(\/.*)?$/);
  const st = m && store[m[1]];
  if (!st) fail(404, "not_found");
  const sub = m[2] || "/";
  if (sub === "/state") return state(st);
  if (sub === "/text" && method === "PUT") return setText(st, body.edits || []);
  if (sub === "/labels") { Object.assign(st.labels, body.labels || {}); return { ok: true }; }
  if (sub === "/changes") return { changes: diff(st.published, st.draft, st) };
  if (sub === "/revert") {
    guard(st);
    const ids = body.ids;
    const ch = diff(st.published, st.draft, st).filter((c) => !ids || ids.includes(c.id));
    for (const c of ch) put(st, st.draft, c, st.published);
    return { reverted: ch.length, changes: diff(st.published, st.draft, st).length };
  }
  if (sub === "/preview") return preview(st);
  if (sub === "/publish" && method === "POST") return publish(st);
  if (sub === "/history") return { versions: history(st) };
  if (sub === "/undo") return undo(st, body.version, body.change);
  if (sub === "/restore") {
    guard(st);
    const v = st.versions.find((x) => x.id === body.version);
    st.draft = clone(v ? v.snap : st.base);
    return { changes: diff(st.published, st.draft, st).length };
  }
  if ((m = sub.match(/^\/image\/([\w-]+)$/)) && method === "POST") return applyImage(st, m[1], body.upload, body.crop || {});
  if (sub === "/social" && method === "PUT") return setSocial(st, body.links || []);
  fail(404, "not_found");
}

function me() {
  const u = DATA.user;
  return { user: { name: u.name, email: u.email, lang: lang || u.lang }, client: DATA.client,
           sites: DATA.sites.map((s) => card(store[s.id])), preview_origin: location.origin };
}
function card(st) {
  const last = st.versions[st.versions.length - 1];
  return { ...st.site.state.site, live_url: "", changes: diff(st.published, st.draft, st).length, live: last ? { at: last.at } : null };
}
function state(st) {
  const s = clone(st.site.state);
  for (const f of s.fields) for (const l of Object.keys(f.values)) f.values[l] = st.draft.text[f.key + "|" + l];
  for (const sl of s.slots) { sl.base = st.base.slots[sl.id]; sl.url = st.draft.slots[sl.id]; }
  if (s.social) s.social.links = clone(st.draft.social);
  s.site = card(st);
  s.labels = st.labels;
  s.preview = preview(st);
  s.busy = st.busy;
  return s;
}
function preview(st) {
  return { ...st.site.preview, ready: true, fresh: true, building: false };
}
function guard(st) { if (st.busy) fail(409, "busy", { what: st.busy }); }

// ── words ────────────────────────────────────────────────────────────────────────────────────────────────────────
function field(st, key) { return st.site.state.fields.find((f) => f.key === key); }
function tokensIn(f, l, v) {
  const toks = Object.keys((f.chips || {})[l] || {}).sort((a, b) => b.length - a.length);
  const out = {};
  if (!toks.length) return out;
  const rx = new RegExp(toks.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  for (const m of (v || "").matchAll(rx)) out[m[0]] = (out[m[0]] || 0) + 1;
  return out;
}
function setText(st, edits) {
  guard(st);
  const saved = [];
  for (const e of edits.slice(0, 50)) {
    const f = field(st, e.key);
    if (!f) fail(400, "unknown_field");
    if (!(e.lang in f.values)) fail(400, "unknown_language");
    if (typeof e.value !== "string") fail(400, "not_text");
    const base = st.base.text[e.key + "|" + e.lang] ?? "";
    let v = e.value.replace(/\r\n?/g, "\n").normalize("NFC").replace(/[\u{E0000}-\u{E007F}]/gu, "").replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
    if (v.length > 3000) fail(400, "too_long", { max: 3000 });
    if (!base.includes("\n")) v = v.replace(/\s*\n\s*/g, " ");
    const want = tokensIn(f, e.lang, base), got = tokensIn(f, e.lang, v);
    const missing = Object.keys(want).filter((k) => (got[k] || 0) < want[k]);
    const extra = Object.keys(got).filter((k) => (want[k] || 0) < got[k]);
    if (missing.length || extra.length) fail(400, "tokens", { missing: missing.map((k) => f.chips[e.lang][k]), extra: extra.map((k) => f.chips[e.lang][k] || k) });
    st.draft.text[e.key + "|" + e.lang] = v;
    saved.push({ key: e.key, lang: e.lang, value: v });
  }
  return { saved, also: [], changes: diff(st.published, st.draft, st).length };
}

// ── the difference between two states ────────────────────────────────────────────────────────────────────────────
function diff(a, b, st) {
  const out = [];
  for (const f of st.site.state.fields) {
    for (const l of Object.keys(f.values)) {
      const k = f.key + "|" + l;
      if ((a.text[k] || "") !== (b.text[k] || "")) out.push({ type: "text", key: f.key, lang: l, before: a.text[k], after: b.text[k], id: `text:${f.key}:${l}`, hidden: f.hidden });
    }
  }
  for (const id of Object.keys(b.slots)) if (a.slots[id] !== b.slots[id]) out.push({ type: "image", slot: id, id: `image:${id}` });
  const am = Object.fromEntries(a.social.map((x) => [x.network, x.url])), bm = Object.fromEntries(b.social.map((x) => [x.network, x.url]));
  for (const n of [...Object.keys(bm), ...Object.keys(am).filter((x) => !(x in bm))]) {
    if (am[n] !== bm[n]) out.push({ type: "social", network: n, before: am[n], after: bm[n], id: `social:${n}` });
  }
  return out;
}
function put(st, target, c, from) {
  if (c.type === "text") target.text[c.key + "|" + c.lang] = from.text[c.key + "|" + c.lang];
  else if (c.type === "image") target.slots[c.slot] = from.slots[c.slot];
  else if (c.type === "social") {
    const was = from.social.find((x) => x.network === c.network);
    const i = target.social.findIndex((x) => x.network === c.network);
    if (was && i >= 0) target.social[i] = clone(was);
    else if (was) target.social.push(clone(was));
    else if (i >= 0) target.social.splice(i, 1);
  }
}

// ── publishing, in the browser ───────────────────────────────────────────────────────────────────────────────────
function publish(st) {
  guard(st);
  const job = { id: rid(), kind: "publish", state: "running", steps: [], result: {}, t0: Date.now() };
  jobs[job.id] = job;
  const changes = diff(st.published, st.draft, st);
  if (!changes.length) { job.state = "failed"; job.result = { code: "nothing" }; return pub(job); }
  st.busy = "publishing";
  const steps = [["build", 1100], ["checks", 900], ["deploy", 700], ["record", 400]];
  let t = 0;
  steps.forEach(([name, ms], i) => {
    setTimeout(() => {
      if (job.state !== "running") return;
      job.steps.push(name);
      if (name === "checks") {
        const failures = check(st, changes);
        if (failures.length) setTimeout(() => { job.state = "failed"; job.result = { code: "checks", failures }; st.busy = null; }, ms);
      }
      if (i === steps.length - 1) setTimeout(() => {
        const v = { id: rid(), parent: st.versions.length ? st.versions[st.versions.length - 1].id : "start", at: Math.floor(Date.now() / 1000),
                    name: DATA.user.name, changes, snap: clone(st.draft) };
        st.versions.push(v);
        st.published = clone(st.draft);
        st.busy = null;
        job.state = "done";
        job.result = { version: v.id, url: null, changes: changes.length };
      }, ms);
    }, t);
    t += ms;
  });
  return pub(job);
}
function check(st, changes) {
  // the site's own rules that can be known from the words alone (its panel.json "hints"), as the server's checks would refuse them
  const out = [];
  for (const c of changes) {
    if (c.type !== "text") continue;
    const v = c.after || "";
    if (!v.trim() && (c.before || "").trim()) {
      out.push({ rule: "empty", field: c.key, lang: c.lang, line: `empty: ${c.key} [${c.lang}]`,
                 message: { en: "This text is empty. Every text needs words in both languages.", ar: "هذا النص فارغ، ولكل نص كلمات باللغتين." } });
      continue;
    }
    for (const hnt of st.site.hints || []) {
      if (hnt.level !== "bad" || (hnt.lang && hnt.lang !== c.lang)) continue;
      let mm = null;
      try { mm = v.match(new RegExp(hnt.pattern, hnt.flags || "iu")); } catch { continue; }
      if (mm) out.push({ rule: "rule", field: c.key, lang: c.lang, line: `${c.key} [${c.lang}]: «${mm[0]}»`,
                         message: { en: hnt.text.en.replace("{m}", mm[0]), ar: hnt.text.ar.replace("{m}", mm[0]) } });
    }
  }
  return out;
}
function pub(j) {
  return { id: j.id, kind: j.kind, state: j.state, steps: j.steps, result: j.result, seconds: (Date.now() - j.t0) / 1000, log: [] };
}
function history(st) {
  const live = st.versions.length ? st.versions[st.versions.length - 1].id : "start";
  const out = st.versions.slice().reverse().map((v) => ({ id: v.id, parent: v.parent, at: v.at, name: v.name, first: false, live: v.id === live, changes: v.changes, subject: "" }));
  out.push({ id: "start", parent: null, at: DATA.started, name: "MIDDLEWARE", first: true, live: live === "start", changes: [], subject: "" });
  return out;
}
function snapOf(st, id) {
  if (id === "HEAD") return st.published;
  if (id === "start" || !id) return st.base;
  const v = st.versions.find((x) => x.id === id);
  return v ? v.snap : st.base;
}
function undo(st, version, changeId) {
  guard(st);
  const v = st.versions.find((x) => x.id === version);
  if (!v) fail(400, "no_version");
  const c = v.changes.find((x) => x.id === changeId);
  if (!c) fail(400, "no_change");
  put(st, st.draft, c, snapOf(st, v.parent));
  return { undone: changeId, changes: diff(st.published, st.draft, st).length };
}
export function imageAt(sid, rev, slot) {
  const st = store[sid];
  return st ? snapOf(st, rev).slots[slot] : "";
}

// ── links ────────────────────────────────────────────────────────────────────────────────────────────────────────
const NETWORKS = {
  instagram: { name: "Instagram", hosts: ["instagram.com", "instagr.am"], url: (h) => `https://www.instagram.com/${h}/` },
  facebook: { name: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me", "m.facebook.com"], url: (h) => `https://www.facebook.com/${h}` },
  linkedin: { name: "LinkedIn", hosts: ["linkedin.com"], url: (h) => `https://www.linkedin.com/${h}` },
  youtube: { name: "YouTube", hosts: ["youtube.com", "youtu.be", "m.youtube.com"], url: (h) => `https://www.youtube.com/${h}` },
  tiktok: { name: "TikTok", hosts: ["tiktok.com"], url: (h) => `https://www.tiktok.com/${h}` },
  x: { name: "X", hosts: ["x.com", "twitter.com"], url: (h) => `https://x.com/${h}` },
  telegram: { name: "Telegram", hosts: ["t.me", "telegram.me"], url: (h) => `https://t.me/${h}` },
  whatsapp: { name: "WhatsApp", hosts: ["wa.me", "whatsapp.com", "api.whatsapp.com"], url: (h) => `https://wa.me/${h}` },
  snapchat: { name: "Snapchat", hosts: ["snapchat.com"], url: (h) => `https://www.snapchat.com/add/${h}` },
};
function networkOf(u) {
  let host = "";
  try { host = new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
  return Object.keys(NETWORKS).find((n) => NETWORKS[n].hosts.some((x) => host === x || host.endsWith("." + x))) || null;
}
function normalise(raw, expect) {
  let s = (raw || "").trim();
  if (!s) throw { code: "empty" };
  if (s.length > 300 || /\s/.test(s)) throw { code: "not_link" };
  if (s.startsWith("@")) {
    if (!expect) throw { code: "which_network" };
    const h = s.slice(1);
    if (!/^[\w.\-]{1,80}$/.test(h)) throw { code: "not_link" };
    return [expect, h, NETWORKS[expect].url(h)];
  }
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch { throw { code: "not_link" }; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw { code: "not_link" };
  const nid = networkOf(s);
  if (expect && nid !== expect) throw { code: "wrong_network", expected: NETWORKS[expect].name, got: NETWORKS[nid]?.name || u.hostname };
  if (!nid) throw { code: "unknown_network", host: u.hostname };
  let path = u.pathname.replace(/^\/+|\/+$/g, "");
  if (nid === "facebook" && u.pathname.startsWith("/profile.php")) path = "profile.php" + u.search;
  if (!path) throw { code: "no_profile" };
  if (nid === "youtube" && !/^(@|channel\/|c\/|user\/)/.test(path)) path = path.includes("/") ? path : "@" + path;
  return [nid, path, NETWORKS[nid].url(path)];
}
const same = (a, b) => { try { return normalise(a)[2] === normalise(b)[2]; } catch { return false; } };
function setSocial(st, links) {
  guard(st);
  const cfg = st.site.state.social;
  const clean = [];
  if (links.length > 12) fail(400, "link_too_many");
  links.forEach((l, i) => {
    let r;
    try { r = normalise(l.url, cfg.kind === "fixed" || l.network ? l.network : null); }
    catch (e) { fail(400, "link_" + e.code, { ...e, index: i, network: l.network }); }
    const [nid, , url] = r;
    if (!cfg.allowed.includes(nid)) fail(400, "link_not_allowed", { index: i, name: NETWORKS[nid].name });
    const prev = st.draft.social.find((x) => x.network === nid);
    clean.push({ network: nid, name: NETWORKS[nid].name, url: prev && same(prev.url, url) ? prev.url : url });
  });
  if (new Set(clean.map((c) => c.network)).size !== clean.length) fail(400, "link_twice");
  if (cfg.kind === "fixed") {
    for (const c of clean) { const i = st.draft.social.findIndex((x) => x.network === c.network); if (i >= 0) st.draft.social[i] = c; }
  } else st.draft.social = clean;
  return { links: clean, changes: diff(st.published, st.draft, st).length };
}

// ── pictures, made in the browser ────────────────────────────────────────────────────────────────────────────────
const uploads = {};
export async function upload(path, file, onp) {
  await load();
  const m = path.match(/^\/api\/s\/([\w-]+)\/upload\/([\w-]+)$/);
  const st = m && store[m[1]];
  const slot = st && st.site.state.slots.find((s) => s.id === m[2]);
  if (!slot) fail(404, "not_found");
  onp && onp(0.4);
  const name = (file.name || "").toLowerCase();
  if (file.size > 30 * 1024 * 1024) fail(400, "image_too_big", { mb: 30 });
  if (file.type === "image/svg+xml" || name.endsWith(".svg")) fail(400, "image_svg");
  if (/\.(heic|heif)$/.test(name) || /hei[cf]/.test(file.type)) fail(400, "image_heic");
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { fail(400, "image_not_image"); }
  onp && onp(1);
  if (bmp.width * bmp.height > 60e6) fail(400, "image_huge");
  let alpha = false;
  if (!/jpe?g/.test(file.type)) {
    const c = new OffscreenCanvas(48, 48), x = c.getContext("2d");
    x.drawImage(bmp, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { alpha = true; break; }
  }
  const ratio = slot.ratio, need = slot.need;
  const usable = slot.fit === "cover" ? Math.min(bmp.width, bmp.height * ratio) : Math.max(bmp.width, bmp.height * ratio);
  if (usable < need * 0.6) fail(400, "image_small", { need, have: Math.round(usable) });
  const warnings = [];
  if (usable < need) warnings.push({ code: "soft", need, have: Math.round(usable) });
  if (slot.alpha && !alpha) warnings.push({ code: "no_alpha" });
  const id = rid() + rid();
  uploads[id] = { bmp, alpha };
  return { id, w: bmp.width, h: bmp.height, alpha, format: file.type, ratio, need, warnings, thumb: URL.createObjectURL(file) };
}
async function encode(canvas, limit) {
  for (const q of [0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5]) {
    const b = await canvas.convertToBlob({ type: "image/webp", quality: q });
    if (b.size <= limit || q === 0.5) return [b, Math.round(q * 100)];
  }
}
async function applyImage(st, slotId, uid, crop) {
  guard(st);
  const slot = st.site.state.slots.find((s) => s.id === slotId);
  const up = uploads[uid];
  if (!slot) fail(404, "not_found");
  if (!up) fail(400, "image_expired");
  const { bmp } = up;
  const W = bmp.width, H = bmp.height, ratio = slot.ratio;
  let src;
  if (slot.fit === "cover") {
    let x = +crop.x || 0, y = +crop.y || 0, w = +crop.w || 1, h = +crop.h || 1;
    let bw = w * W, bh = bw / ratio;
    if (bw > W) { bw = W; bh = bw / ratio; }
    if (bh > H) { bh = H; bw = bh * ratio; }
    const bx = Math.min(Math.max(0, x * W), W - bw), by = Math.min(Math.max(0, y * H), H - bh);
    src = [bx, by, bw, bh];
  }
  const written = [];
  let largest = null;
  for (const f of slot.files) {
    const tw = f.width, th = Math.round(tw / ratio);
    const c = new OffscreenCanvas(tw, th), x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    if (slot.fit === "cover") x.drawImage(bmp, src[0], src[1], src[2], src[3], 0, 0, tw, th);
    else {
      if (!slot.alpha && !up.alpha) { x.fillStyle = "#fff"; x.fillRect(0, 0, tw, th); }
      const s = Math.min(tw / W, th / H), dw = W * s, dh = H * s;
      x.drawImage(bmp, (tw - dw) / 2, (th - dh) / 2, dw, dh);
    }
    const [blob, q] = await encode(c, f.max_kb * 1024);
    const url = URL.createObjectURL(blob);
    written.push({ path: f.path, w: tw, h: th, kb: Math.round(blob.size / 102.4) / 10, quality: q, format: blob.type.split("/")[1].toUpperCase() });
    if (!largest || tw > largest.w) largest = { w: tw, url };
  }
  st.draft.slots[slotId] = largest.url;
  return { written, changes: diff(st.published, st.draft, st).length };
}
