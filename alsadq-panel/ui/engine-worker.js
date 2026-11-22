// engine-worker.js — the panel's own server code (server/inbrowser.py and the modules it uses) running in Pyodide, in a
// worker, for the static demo of a site with records. It builds the site with the site's own tools/build.py, and puts
// each build, each record picture and each upload into the demo's one Cache Storage cache, where the demo's service
// worker (sw.js, scoped to the demo's folder) serves them to the preview frame. Nothing leaves this browser.
let py = null, E = null, CFG = null;
const KEPT = [];

const post = (m) => self.postMessage(m);
const progress = (phase, done, total) => post({ progress: { phase, done, total } });

let paused = false, resume = null;                    // the page is loading something: reading waits (engine-api.busy)
const whilePaused = () => paused ? new Promise((r) => { resume = r; }) : null;

async function fetchCounted(url, onBytes) {
  // each engine file crosses the network once: fetched here, at low priority, its bytes counted for the progress line,
  // then handed to Pyodide from memory (BYTES, through the fetch below), so Pyodide's own loader never asks again
  const r = await fetch(url, { priority: "low" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const reader = r.body.getReader();
  const parts = [];
  let done = 0;
  for (;;) {
    await whilePaused();
    const { value, done: end } = await reader.read();
    if (end) break;
    parts.push(value);
    done += value.length;
    onBytes(done);
  }
  const out = new Uint8Array(done);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// Pyodide fetches the wasm, the standard library, the lock file and the wheels with the global fetch: those URLs are
// answered from the bytes already here. Anything else goes to the network as usual.
const BYTES = new Map();
const netFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const b = BYTES.get(new URL(url, self.location.href).href);
  if (b) return Promise.resolve(new Response(b, { status: 200, headers: { "Content-Type": url.endsWith(".wasm") ? "application/wasm" : "application/octet-stream" } }));
  return netFetch(input, init);
};

const TYPES = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", woff2: "font/woff2", ico: "image/x-icon",
  txt: "text/plain; charset=utf-8", xml: "application/xml" };
function headers(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  const h = { "Content-Type": TYPES[ext] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" };
  // a picture is only ever a picture: an SVG opened on its own runs nothing
  if (ext === "svg") h["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  return h;
}

function walk(dir, rel = "") {
  const out = [];
  for (const n of py.FS.readdir(dir)) {
    if (n === "." || n === "..") continue;
    const p = dir + "/" + n, r = rel ? rel + "/" + n : n;
    if (py.FS.isDir(py.FS.stat(p).mode)) out.push(...walk(p, r)); else out.push([r, p]);
  }
  return out;
}

async function cachePut(cache, url, bytes, path) {
  await cache.put(new Request(url), new Response(bytes, { headers: headers(path) }));
}

const ops = {
  async boot(cfg) {
    CFG = cfg;
    const t0 = performance.now();
    const E_URL = cfg.engine;
    // the engine's own files, one at a time, each fetched once and counted; then Pyodide is started from those bytes
    let total = 0;
    for (const f of cfg.files) total += f.size;
    let base = 0;
    for (const f of cfg.files) {
      const url = E_URL + f.name;
      if (f.name.endsWith(".mjs")) {
        // a module: imported once here; Pyodide's own import of the same address is the same module (no second fetch)
        await whilePaused();
        await import(url);
      } else {
        f.bytes = await fetchCounted(url, (d) => progress("download", base + d, total));
        BYTES.set(new URL(url).href, f.bytes);
      }
      base += f.size;
      progress("download", base, total);
    }
    progress("start", 0, 1);
    const { loadPyodide } = await import(E_URL + "pyodide.mjs");
    py = await loadPyodide({ indexURL: E_URL, lockFileURL: E_URL + "pyodide-lock.json", stdout: () => {}, stderr: () => {}, packages: [] });
    for (const w of cfg.wheels) await py.loadPackage(E_URL + w, { messageCallback: () => {}, errorCallback: () => {} });
    for (const z of ["panel.zip", "site.zip"]) {
      const f = cfg.files.find((x) => x.name === z);
      py.unpackArchive(f.bytes.buffer, "zip", { extractDir: z === "panel.zip" ? "/panel" : cfg.work });
    }
    py.runPython(`import sys; sys.path.insert(0, "/panel")`);
    E = py.pyimport("server.inbrowser");
    const r = JSON.parse(E.boot(cfg.work, cfg.folder.replace(/^\/|\/$/g, ""), cfg.client, JSON.stringify(cfg.user), JSON.stringify(cfg.seed)));
    for (const f of cfg.files) delete f.bytes;
    BYTES.clear();
    progress("ready", 1, 1);
    return { ...r, seconds: (performance.now() - t0) / 1000 };
  },
  async api(method, sub, body) {
    return JSON.parse(E.api(method, sub, body === undefined ? "" : JSON.stringify(body)));
  },
  async upload(cid, field, bytes, name) {
    const r = JSON.parse(E.upload(cid, field, py.toPy(new Uint8Array(bytes)), name));
    if (r.status === 200) {
      const [data, ext] = E.staged(r.body.id).toJs();
      const cache = await caches.open(CFG.cache);
      const url = CFG.origin + CFG.folder + "up/" + r.body.id + "." + ext;
      await cachePut(cache, url, data, url);
      r.body.url = url;
    }
    return r;
  },
  async preview() {
    // a marked build of the draft by the site's own build.py, if the draft moved; its files into the cache
    const t0 = performance.now();
    const res = E.build_preview().toJs();
    const meta = JSON.parse(res[0]), root = res[1];
    const cache = await caches.open(CFG.cache);
    if (root) {
      const pre = CFG.origin + meta.base;
      const tag = new TextEncoder().encode(`<script src="${CFG.folder}ui/bridge.js"></script>`);
      for (const [rel, p] of walk(root)) {
        let bytes = py.FS.readFile(p);
        if (rel.endsWith(".html")) {
          const s = new TextDecoder().decode(bytes);
          const i = s.lastIndexOf("</body>");
          bytes = new TextEncoder().encode(i >= 0 ? s.slice(0, i) + new TextDecoder().decode(tag) + s.slice(i) : s);
        }
        await cachePut(cache, pre + rel, bytes, rel);
      }
      // the build just made and the one before it are kept (a frame still loading the earlier one finishes it); older go
      if (KEPT[KEPT.length - 1] !== pre) KEPT.push(pre);
      while (KEPT.length > 2) KEPT.shift();
      for (const k of await cache.keys()) if (k.url.includes(CFG.folder + "pv/") && !KEPT.some((x) => k.url.startsWith(x))) await cache.delete(k);
    }
    await ops.files();
    return { meta, seconds: (performance.now() - t0) / 1000 };
  },
  async files() {
    // every picture the records hold now, where the panel's lists show them
    const cache = await caches.open(CFG.cache);
    for (const [url, p] of E.record_files().toJs()) {
      const full = CFG.origin + CFG.folder + url;
      if (!(await cache.match(full))) await cachePut(cache, full, py.FS.readFile(p), url);
    }
  },
  async publish(liveBase, origin) {
    const r = JSON.parse(E.publish((name) => post({ step: name }), liveBase, origin));
    delete r.root;
    return r;
  },
  async parity(base, origin) {
    return JSON.parse(E.parity(base, origin));
  },
};

self.onmessage = async (ev) => {
  if ("pause" in ev.data) {
    paused = !!ev.data.pause;
    if (!paused && resume) { const r = resume; resume = null; r(); }
    return;
  }
  const { id, op, args } = ev.data;
  try {
    post({ id, ok: true, r: await ops[op](...(args || [])) });
  } catch (e) {
    post({ id, ok: false, error: String(e && e.message || e).slice(0, 600) });
  }
};
