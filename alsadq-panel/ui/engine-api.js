// engine-api.js — the static demo of a site with records (static.py --client <name>): the panel's API answered in the
// visitor's browser by the panel's own server code running in Pyodide (ui/engine-worker.js → server/inbrowser.py).
//
// The interface works at once: until the engine has arrived, reading is answered from what static.py prepared with the
// real server (the lists, the page, History), and a change waits for the engine with a message. After a change, the
// preview is the site rebuilt by its own tools/build.py in this browser, served to the preview frame by the demo's
// service worker (sw.js, the demo's folder only). Nothing is sent anywhere; a reload starts over.
let D = null, FOLDER = "", CACHE = "", worker = null, seq = 0;
const calls = {};
const jobs = {};
let current = null;                                   // the running publish job
const status = { phase: "idle", done: 0, total: 0, waiting: false, sw: null, seconds: null };
const watchers = [];
let ready = null, readyOK = false, rebuildTimer = null, rebuilding = null, lastChanges = 0, lastLive = null;

const fail = (s, error, extra = {}) => { throw { status: s, body: { error, ...extra } }; };
const rid = () => Math.random().toString(36).slice(2, 12);
function tell() { for (const w of watchers) try { w({ ...status }); } catch {} }
export function onStatus(fn) { watchers.push(fn); fn({ ...status }); }
export const stepLabels = { build: "st_build_engine", checks: "st_checks_engine", deploy: "st_deploy_demo", record: "st_record" };

export async function init(data) {
  D = data.engine;
  FOLDER = D.folder;
  CACHE = "mw-demo:" + FOLDER;
  lastChanges = 0;
  // a clean start on every load: the demo's cache emptied, its service worker registered anew, both gone when it is left
  try { await caches.delete(CACHE); } catch {}
  status.sw = "pending";
  registerSW();
  addEventListener("pagehide", () => {
    try { caches.delete(CACHE); } catch {}
    navigator.serviceWorker?.getRegistration(FOLDER).then((r) => r && r.unregister()).catch(() => {});
  });
}

async function registerSW() {
  try {
    if (!("serviceWorker" in navigator)) throw new Error("no service worker here");
    const old = await navigator.serviceWorker.getRegistration(FOLDER);
    if (old) await old.unregister();
    const reg = await navigator.serviceWorker.register(FOLDER + "sw.js", { scope: FOLDER });
    const w = reg.installing || reg.waiting || reg.active;
    if (w && w.state !== "activated") await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error("timeout")), 10000);
      w.addEventListener("statechange", () => { if (w.state === "activated") { clearTimeout(t); res(); } if (w.state === "redundant") { clearTimeout(t); rej(new Error("redundant")); } });
    });
    status.sw = "ok";
  } catch {
    status.sw = "none";                               // fail soft: everything works but the rebuilt preview
  }
  tell();
}

// ── the engine ───────────────────────────────────────────────────────────────────────────────────────────────────
// It never competes with what the visitor came to see. After sign-in it is only WANTED; it starts when the page in
// front of the visitor has finished loading (the canvas page with its fonts and pictures, or a list with its logos:
// app.js calls settle()), or at once when a change needs it. While the interface loads something later (another page
// in the canvas, a list's pictures: busy(true)), the engine's download stops reading until it is done (busy(false)).
let wanted = false, allowed = false, busyN = 0, settleTimer = null;
export const SETTLE_FALLBACK_MS = 15000;              // a page that never says it has loaded does not hold the engine forever
export function want() {
  wanted = true;
  if (allowed) return start();
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => settle(), SETTLE_FALLBACK_MS);
}
export function settle() {
  allowed = true;
  clearTimeout(settleTimer);
  if (wanted) start();
}
export function busy(on) {
  busyN = Math.max(0, busyN + (on ? 1 : -1));
  if (worker) worker.postMessage({ pause: busyN > 0 });
}
export function start() {
  if (worker || !D) return ready;
  status.phase = "download"; status.done = 0; status.total = D.files.reduce((a, f) => a + f.size, 0); tell();
  try {
    worker = new Worker(new URL("engine-worker.js", import.meta.url), { type: "module" });
  } catch {
    status.phase = "failed"; tell();
    return (ready = Promise.resolve(false));
  }
  worker.onmessage = (ev) => {
    const m = ev.data;
    if (m.progress) {
      const p = m.progress;
      status.phase = p.phase === "ready" ? status.phase : p.phase === "download" ? "download" : "start";
      if (p.phase === "download") { status.done = p.done; status.total = p.total; }
      tell();
      return;
    }
    if (m.step) { if (current) current.steps.push(m.step); return; }
    const c = calls[m.id];
    if (!c) return;
    delete calls[m.id];
    m.ok ? c.res(m.r) : c.rej(new Error(m.error));
  };
  worker.onerror = () => { if (status.phase !== "ready") { status.phase = "failed"; tell(); } };
  if (busyN > 0) worker.postMessage({ pause: true });
  const t0 = performance.now();
  ready = call("boot", { engine: location.origin + FOLDER + "engine/", files: D.files.map((f) => ({ ...f })), wheels: D.wheels, work: D.work,
                          folder: FOLDER, client: D.client, user: D.user, seed: D.seed, origin: location.origin, cache: CACHE })
    .then((r) => { readyOK = true; status.phase = "ready"; status.seconds = (performance.now() - t0) / 1000; status.waiting = false; tell(); return true; })
    .catch(() => { status.phase = "failed"; status.waiting = false; tell(); return false; });
  return ready;
}
function call(op, ...args) {
  const id = ++seq;
  return new Promise((res, rej) => { calls[id] = { res, rej }; worker.postMessage({ id, op, args }); });
}
async function engine() {
  if (!ready) start();
  if (!readyOK) { status.waiting = true; tell(); }
  const ok = await ready;
  if (!ok) fail(503, "engine_unavailable");
  return true;
}
export function engineReady() { return readyOK; }

// ── the API ──────────────────────────────────────────────────────────────────────────────────────────────────────
const LOCAL = (url) => url.replaceAll("/api/s/site/rec-file/", FOLDER + "rf/site/").replaceAll("/api/s/site/mark", D.mark || "");
const local = (body) => JSON.parse(LOCAL(JSON.stringify(body)));

function seeded(sub) {
  // before the engine has arrived: what static.py prepared with the real server
  if (sub === "/state") return D.state;
  if (sub === "/records") return D.records;
  if (sub === "/changes") return { changes: [] };
  if (sub === "/history") return { versions: D.history };
  if (sub === "/preview") return D.state.preview;
  return null;
}

export async function api(method, path, body) {
  let m = path.match(/^\/api\/jobs\/([\w-]+)$/);
  if (m) { const j = jobs[m[1]]; if (!j) fail(404, "not_found"); return pub(j); }
  m = path.match(/^\/api\/s\/([\w-]+)(\/.*)?$/);
  if (!m || m[1] !== "site") fail(404, "not_found");
  const sub = m[2] || "/";
  if (sub === "/labels") return { ok: true };
  if (!readyOK && method === "GET" && seeded(sub)) {
    if (!ready) want();
    return local(seeded(sub));
  }
  if (sub === "/preview" && method === "POST" && !readyOK) return local(D.state.preview);
  await engine();
  if (sub === "/publish" && method === "POST") return publish();
  if (sub === "/preview") {
    if (method === "POST" || rebuildTimer) { clearTimeout(rebuildTimer); rebuildTimer = null; await rebuild(); }
    else if (rebuilding) await rebuilding;
    return preview();
  }
  const r = await call("api", method, sub, body);
  if (r.status >= 400) throw { status: r.status, body: local(r.body) };
  if (typeof r.body.changes === "number") lastChanges = r.body.changes;
  if (method !== "GET") { await call("files"); scheduleRebuild(); }     // a new logo is where the lists show it at once
  if (sub === "/state") { lastChanges = r.body.site.changes; r.body.preview = await preview(); }
  return local(r.body);
}

async function preview() {
  const r = await call("api", "GET", "/preview");
  const pv = r.body;
  if (status.sw !== "ok" && pv.ready && pv.base && pv.base.includes("/pv/")) {
    // no service worker in this browser: the rebuilt page cannot be shown, so the page as delivered stays, said once
    return { ...D.state.preview, fresh: true, building: false, stale_here: true };
  }
  return local({ ...pv, building: !!rebuildTimer || !!rebuilding || pv.building });
}

function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => { rebuildTimer = null; rebuild(); }, 350);
}
async function rebuild() {
  if (rebuilding) { await rebuilding; }
  rebuilding = call("preview").catch(() => null).finally(() => { rebuilding = null; });
  const r = await rebuilding;
  if (r) { status.lastBuild = r.seconds; tell(); }
  return r;
}

export async function upload(path, file, onp) {
  const m = path.match(/^\/api\/s\/site\/rec-upload\/([a-z0-9][a-z0-9_-]{0,47})\/([A-Za-z_][\w-]{0,40})$/);
  if (!m) fail(404, "not_found");
  if (file.size > 10 * 1024 * 1024) fail(413, "too_large");             // records.UPLOAD_MAX, as the server refuses it
  onp && onp(0.3);
  const bytes = await file.arrayBuffer();
  await engine();
  onp && onp(0.7);
  const r = await call("upload", m[1], m[2], bytes, file.name || "upload");
  onp && onp(1);
  if (r.status >= 400) throw { status: r.status, body: r.body };
  return r.body;
}

export function card(base) {
  return { ...base, live_url: "", changes: lastChanges, live: lastLive, records: true };
}

// ── publishing, as far as it honestly runs here ──────────────────────────────────────────────────────────────────
function publish() {
  if (current && current.state === "running") fail(409, "busy", { what: "publishing" });
  const job = { id: rid(), kind: "publish", state: "running", steps: [], result: {}, t0: Date.now() };
  jobs[job.id] = job;
  current = job;
  call("publish", FOLDER + "live/", "").then((r) => {
    job.state = r.state;
    job.result = r.result || {};
    job.log = r.log || [];
    if (r.state === "done") { lastChanges = 0; lastLive = { at: Date.now() / 1000 }; }
  }).catch((e) => { job.state = "failed"; job.result = { code: "server", error: String(e.message || e) }; });
  return pub(job);
}
function pub(j) {
  return { id: j.id, kind: j.kind, state: j.state, steps: j.steps.slice(), result: j.result, seconds: (Date.now() - j.t0) / 1000,
           log: (j.log || []).slice(-6), progress: null };
}

// ── for the parity test: the draft built plainly with a base and an origin (tests/browser_static_alsadq.py) ──────
export async function parity(base, origin) {
  await engine();
  return call("parity", base, origin);
}
