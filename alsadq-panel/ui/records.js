// MIDDLEWARE Panel — the Content area: the lists a site is built from (projects, clients, areas of work, figures)
// and its details (contact, company). Everything here is a draft until the client publishes, like every other edit.
// The server checks every write whole; this page only makes the right write easy and says plainly what was refused.

export function makeRecords(X) {
  const { h, t, ic, icon, api, sheet, confirmBox, toast, setChanges, S } = X;
  const R = { data: null, sid: null, sel: null, q: "", filters: {}, focusKey: null };
  const Lg = () => X.lang();
  const LANGS = () => X.langs();
  const nf = () => new Intl.NumberFormat(Lg() === "ar" ? "ar-u-nu-latn" : "en");
  const loc = (o) => (o && typeof o === "object" ? (o[Lg()] ?? o.en ?? Object.values(o)[0]) : o) ?? "";
  const other = (o) => { if (!o || typeof o !== "object") return ""; const l = LANGS().find((x) => x !== Lg()); return l ? o[l] || "" : ""; };
  const lower = (s) => (Lg() === "en" ? String(s).toLowerCase() : String(s));
  const list = (items) => { try { return new Intl.ListFormat(Lg() === "ar" ? "ar" : "en", { type: "conjunction" }).format(items); } catch { return items.join(", "); } };
  const norm = X.norm;

  async function load(force) {
    if (!force && R.data && R.sid === S.sid) return R.data;
    R.data = await api("GET", `/api/s/${S.sid}/records`);
    R.sid = S.sid;
    if (!R.sel || !section(R.sel)) R.sel = R.data.collections[0] ? "c:" + R.data.collections[0].id : R.data.settings[0] ? "g:" + R.data.settings[0].id : null;
    return R.data;
  }
  const coll = (id) => R.data && R.data.collections.find((c) => c.id === id);
  const group = (id) => R.data && R.data.settings.find((g) => g.id === id);
  const section = (sel) => sel && (sel.startsWith("c:") ? coll(sel.slice(2)) : group(sel.slice(2)));
  const fieldOf = (c, name) => c.fields.find((f) => f.name === name);

  // ── how a value reads ──────────────────────────────────────────────────────────────────────────────────────────
  function titleOf(cid, key) {
    const c = coll(cid);
    const it = c && c.items.find((x) => x.key === key);
    return it ? loc(it.title) : key;
  }
  function show(f, v) {
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "—";
    switch (f.type) {
      case "text": return f.bilingual ? loc(v) : String(v);
      case "ref": return (Array.isArray(v) ? v : [v]).map((k) => titleOf(f.to, k)).join(Lg() === "ar" ? "، " : ", ");
      case "choice": return (Array.isArray(v) ? v : [v]).map((k) => loc((f.options || []).find((o) => o.value === k)?.label) || k).join(Lg() === "ar" ? "، " : ", ");
      case "dates": return (Array.isArray(v) ? v : [v]).map((d) => "\u2066" + d + "\u2069").join(Lg() === "ar" ? "، " : ", ");
      case "auto_number": return v === "auto" ? t("rec_auto_short") : nf().format(v);
      case "number": return typeof v === "number" ? (f.name.match(/year|established/) ? String(v) : nf().format(v)) : String(v);
      case "bool": return v ? t("rec_yes") : t("rec_no");
      case "image": return v && (v.file || v) ? "▣" : "—";
      default: return typeof v === "object" ? loc(v) : String(v);
    }
  }
  function errText(e) {
    const code = e.code || e.error || "";
    const vars = { ...e };
    if (e.lang) vars.l = X.lname(e.lang);
    if (e.accept) vars.f = (e.accept || []).map((x) => x.toUpperCase()).join(", ");
    if (e.what) vars.w = e.what;
    if (e.value && code === "rec_ref_missing") vars.v = e.value;
    if (e.title) vars.t = loc(e.title);
    const k = "re_" + code;
    return X.STR[Lg()][k] || X.STR.en[k] ? t(k, vars) : t("e_generic");
  }

  // ── the area ───────────────────────────────────────────────────────────────────────────────────────────────────
  async function view() {
    const main = document.getElementById("main");
    main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page rec" }, h("div", { class: "spin" }))));
    try { await load(true); } catch (e) { main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page" }, h("div", { class: "note bad" }, ic("alert"), t("e_generic"))))); return; }
    draw();
  }
  function draw() {
    const main = document.getElementById("main");
    if (!main || S.tab !== "records") return;
    const nav = h("nav", { class: "rec-nav", "aria-label": t("rec_title") },
      R.data.collections.length ? h("div", { class: "rec-nav-h" }, t("rec_lists")) : null,
      R.data.collections.map((c) => navBtn("c:" + c.id, loc(c.label), nf().format(c.items.length), c.items.some((i) => i.mark))),
      R.data.settings.length ? h("div", { class: "rec-nav-h" }, t("rec_details")) : null,
      R.data.settings.map((g) => navBtn("g:" + g.id, loc(g.label), null, (g.changed || []).length)));
    const body = h("section", { class: "rec-body", id: "rec-body", "aria-live": "polite" });
    main.replaceChildren(h("div", { class: "view" }, h("div", { class: "page rec" },
      h("div", { class: "page-head" }, h("div", { class: "grow" }, h("h1", {}, t("rec_title")), h("p", {}, t("rec_sub"))),
        h("button", { class: "btn", id: "rec-preview", onclick: () => X.previewOverlay() }, ic("eye"), t("preview"))),
      h("div", { class: "rec-grid" }, nav, body))));
    drawBody();
  }
  function navBtn(sel, label, count, changed) {
    return h("button", { class: "rec-tab", "aria-current": R.sel === sel ? "true" : null, dataset: { sel },
      onclick: () => { R.sel = sel; R.q = ""; R.filters = {}; draw(); document.querySelector(`.rec-tab[data-sel="${sel}"]`)?.focus(); } },
      h("span", { class: "lbl" }, label), changed ? h("span", { class: "dot", title: t("rec_edited") }) : null, count != null ? h("span", { class: "n" }, count) : null);
  }
  function drawBody() {
    const body = document.getElementById("rec-body");
    if (!body) return;
    const sel = R.sel;
    if (!sel) { body.replaceChildren(h("div", { class: "empty" }, h("h3", {}, t("rec_empty")))); return; }
    if (sel.startsWith("g:")) return drawGroup(body, group(sel.slice(2)));
    drawColl(body, coll(sel.slice(2)));
  }

  // ── a list ─────────────────────────────────────────────────────────────────────────────────────────────────────
  function sortKey(c, it) {
    const s = c.sort;
    if (!s) return null;
    const v = it.values[s.field];
    if (Array.isArray(v)) return v.slice().sort().pop() || "";
    return v == null ? "" : typeof v === "object" ? loc(v) : String(v);
  }
  function drawColl(body, c) {
    const filt = (c.filters || []).map((n) => fieldOf(c, n)).filter(Boolean);
    let rows = c.items.slice();
    if (c.sort) rows.sort((a, b) => { const x = sortKey(c, a), y = sortKey(c, b); return (x < y ? -1 : x > y ? 1 : 0) * (c.sort.desc ? -1 : 1); });
    const q = norm(R.q);
    if (q) rows = rows.filter((it) => norm([...Object.values(it.title || {}), ...c.fields.map((f) => show(f, it.values[f.name]))].join(" ")).includes(q));
    for (const [name, val] of Object.entries(R.filters)) if (val) rows = rows.filter((it) => { const v = it.values[name]; return Array.isArray(v) ? v.includes(val) : v === val; });
    const search = h("input", { class: "input rec-q", type: "search", value: R.q, placeholder: t("rec_search", { label: lower(loc(c.label)) }), "aria-label": t("rec_search", { label: lower(loc(c.label)) }),
      oninput: () => { R.q = search.value; const pos = search.selectionStart; drawBody(); const s2 = document.querySelector(".rec-q"); if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); } } });
    const filters = filt.map((f) => {
      const opts = f.type === "ref" ? (coll(f.to)?.items || []).map((i) => [i.key, loc(i.title)]) : (f.options || []).map((o) => [o.value, loc(o.label)]);
      const s = h("select", { class: "input rec-filter", "aria-label": loc(f.label), onchange: () => { R.filters[f.name] = s.value; drawBody(); } },
        h("option", { value: "" }, `${loc(f.label)}: ${t("rec_all")}`), opts.map(([v, l]) => h("option", { value: v, selected: R.filters[f.name] === v ? true : null }, l)));
      return s;
    });
    const manual = c.order === "manual";
    const ul = h("ul", { class: "rlist card", role: "list" }, rows.map((it) => row(c, it, manual && !q && !Object.values(R.filters).some(Boolean))));
    body.replaceChildren(
      h("div", { class: "rec-head" }, h("div", { class: "grow" }, h("h2", {}, loc(c.label), h("span", { class: "n" }, nf().format(c.items.length))),
        h("p", {}, c.hint ? loc(c.hint) : manual ? t("rec_order_note") : c.sort ? t("rec_sorted_note") : "")),
        c.add ? h("button", { class: "btn btn-ink", id: "rec-add", onclick: () => recordSheet(c, null) }, ic("plus"), t("rec_add", { one: loc(c.one) })) : null),
      h("div", { class: "rec-tools" }, h("label", { class: "rec-search" }, h("span", { html: icon("search") }), search), filters),
      rows.length ? ul : h("div", { class: "empty card" }, h("h3", {}, q ? t("rec_none", { q: R.q }) : t("rec_empty"))));
    if (R.focusKey) {
      const el = body.querySelector(`.rrow[data-key="${CSS.escape(R.focusKey)}"] .rmain`);
      R.focusKey = null;
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "nearest" }); el.closest(".rrow").classList.add("flash"); }
    }
  }
  function thumbOf(c, it) {
    const f = c.fields.find((x) => x.type === "image");
    if (f && !c.items.some((x) => x.values[f.name] && x.values[f.name].url)) return null;   // a list with no pictures yet: no empty frames
    const v = f && it.values[f.name];
    return f ? h("span", { class: "rthumb" + (f.name === "logo" ? " logo" : "") }, v && v.url ? h("img", { src: v.url, alt: "", loading: "lazy" }) : h("span", { html: icon(f.name === "logo" ? "building" : "image") })) : null;
  }
  function row(c, it, movable) {
    const sub = c.subtitle ? fieldOf(c, c.subtitle) : null;
    const dates = c.fields.find((f) => f.type === "dates");
    const meta = [sub ? show(sub, it.values[sub.name]) : null, dates && dates !== sub ? show(dates, it.values[dates.name]) : null].filter((x) => x && x !== "—");
    const idx = c.items.findIndex((x) => x.key === it.key);
    const actions = [];
    if (c.add) actions.push(["copy", t("rec_duplicate"), () => duplicate(c, it)]);
    if (movable && idx > 0) actions.push(["up", t("rec_up"), () => move(c, it, -1)]);
    if (movable && idx < c.items.length - 1) actions.push(["down", t("rec_down"), () => move(c, it, 1)]);
    if (c.delete) actions.push(["trash", t("rec_remove"), () => remove(c, it)]);
    const otherT = other(it.title);
    return h("li", { class: "rrow", dataset: { key: it.key } },
      h("button", { class: "rmain", onclick: () => recordSheet(c, it),
        onkeydown: (e) => { if (movable && e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); move(c, it, e.key === "ArrowUp" ? -1 : 1); } } },
        thumbOf(c, it),
        h("span", { class: "rtx" }, h("b", { dir: "auto" }, loc(it.title) || it.key), otherT && otherT !== loc(it.title) ? h("span", { class: "ralt", dir: "auto" }, otherT) : null,
          meta.length ? h("span", { class: "meta" }, meta.join(" · ")) : null),
        h("span", { class: "rbadges" }, it.mark === "added" ? h("span", { class: "badge blue" }, t("rec_new")) : it.mark === "changed" ? h("span", { class: "badge amber" }, t("rec_edited")) : null,
          it.used ? h("span", { class: "badge grey" }, t("rec_used", { n: nf().format(it.used) })) : null)),
      actions.length ? h("button", { class: "btn btn-ghost btn-icon btn-sm ract", "aria-label": `${t("rec_actions")}: ${loc(it.title)}`, "aria-haspopup": "menu", "aria-expanded": "false",
        onclick: (e) => X.menu(e.currentTarget, actions.map(([i, l, fn]) => h("button", { class: "mi" + (i === "trash" ? " danger" : ""), role: "menuitem", onclick: () => { X.closeMenu(); fn(); } }, ic(i), h("span", { class: "tx" }, l)))) }, ic("dots")) : null);
  }
  async function duplicate(c, it) {
    try {
      const r = await api("POST", `/api/s/${S.sid}/records/${c.id}/${it.key}/duplicate`, {});
      setChanges(r.changes); await load(true); R.focusKey = r.id; draw();
      toast(t("rec_dup_done", { t: loc(r.title) }), { icon: "copy" });
      const nc = coll(c.id); const ni = nc.items.find((x) => x.key === r.id); if (ni) recordSheet(nc, ni);
    } catch (e) { toast(errText(e.body || {}), { bad: true }); }
  }
  async function move(c, it, d) {
    const ids = c.items.map((x) => x.key);
    const i = ids.indexOf(it.key), j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      const r = await api("PUT", `/api/s/${S.sid}/order/${c.id}`, { ids });
      setChanges(r.changes); await load(true); R.focusKey = it.key; draw();
      X.announce(t("rec_moved"));
    } catch (e) { toast(errText(e.body || {}), { bad: true }); }
  }
  async function remove(c, it) {
    if (!it.used && !(await confirmBox(t("rec_remove_q", { t: loc(it.title) }), t("rec_remove_sub"), t("rec_remove")))) return false;
    try {
      const r = await api("DELETE", `/api/s/${S.sid}/records/${c.id}/${it.key}`);
      setChanges(r.changes); await load(true); draw();
      toast(t("rec_removed", { t: loc(r.title) }), { icon: "trash" });
      return true;
    } catch (e) {
      const b = e.body || {};
      if (b.error === "rec_in_use") {
        const users = b.users || [];
        const s = sheet({ title: t("rec_in_use_t", { t: loc(b.title) }), sub: t("rec_in_use_s"), narrow: true,
          body: h("ul", { class: "users" }, users.map((u) => h("li", {}, h("button", { class: "linkish", onclick: () => { s.close(); const uc = coll(u.collection); const ui = uc && uc.items.find((x) => x.key === u.id); if (ui) { R.sel = "c:" + uc.id; draw(); recordSheet(uc, ui); } } },
            h("span", { class: "badge grey" }, loc(coll(u.collection)?.one || u.collection)), " ", h("span", { dir: "auto" }, loc(u.title)))))),
          foot: [h("span", { class: "grow" }), h("button", { class: "btn btn-ink", onclick: () => s.close() }, t("done"))] });
      } else toast(errText(b), { bad: true });
      return false;
    }
  }

  // ── one record, added or edited ────────────────────────────────────────────────────────────────────────────────
  function recordSheet(c, it, opts = {}) {
    const isNew = !it;
    const draftKey = `mw.rec.${S.sid}.${c.id}`;
    let restored = null;
    if (isNew) { try { restored = JSON.parse(localStorage.getItem(draftKey) || "null"); } catch {} }
    const start = isNew ? { ...(restored || {}), ...(opts.values || {}) } : it.values;
    const widgets = new Map();
    let showMore = !isNew;
    const status = h("div", { class: "rec-status", role: "status", "aria-live": "polite" });
    const formBody = h("div", { class: "rform" });
    const req = c.fields.filter((f) => f.required && f.type !== "readonly");
    const opt = c.fields.filter((f) => !f.required && (!isNew || f.type !== "readonly"));
    let timer = null, saving = null;
    const dirty = new Set();
    const fieldEls = [];
    for (const f of [...req, ...opt]) {
      const w = widget(f, start[f.name], { onchange: (immediate) => { if (isNew) keepDraft(); else { dirty.add(f.name); schedule(immediate); } }, submit: () => isNew && add(false) });
      widgets.set(f.name, w);
      const el = h("div", { class: "rfield" + (f.required ? " req" : ""), dataset: { field: f.name } },
        h("div", { class: "rlabel", id: `rl-${f.name}` }, h("span", {}, loc(f.label)), f.required ? h("span", { class: "sr" }, ` (${t("rec_required_mark")})`) : !isNew ? null : h("span", { class: "opt" }, t("rec_optional"))),
        f.hint ? h("p", { class: "rhint" }, loc(f.hint)) : null, w.el, w.errEl);
      if (w.label) w.label(`rl-${f.name}`);
      fieldEls.push([f, el]);
    }
    const moreBtn = h("button", { class: "btn btn-quiet rmore", type: "button", "aria-expanded": String(showMore), onclick: () => { showMore = !showMore; layout(); } });
    function layout() {
      formBody.replaceChildren(...fieldEls.filter(([f]) => f.required || showMore || !isNew).map(([, el]) => el),
        ...(isNew && opt.length ? [moreBtn] : []));
      moreBtn.setAttribute("aria-expanded", String(showMore));
      moreBtn.replaceChildren(ic(showMore ? "up" : "down"), showMore ? t("rec_less") : t("rec_more"));
    }
    layout();
    if (restored && Object.keys(restored).length) status.replaceChildren(h("div", { class: "note info" }, ic("info"), h("span", {}, t("rec_restored"))));
    const title = isNew ? t("rec_new_title", { one: loc(c.one) }) : loc(it.title) || it.key;
    const foot = isNew
      ? [h("span", { class: "grow" }), h("button", { class: "btn", type: "button", onclick: () => { try { localStorage.removeItem(draftKey); } catch {} s.close(); } }, t("cancel")),
        h("button", { class: "btn", type: "button", id: "rec-save-another", onclick: () => add(true) }, t("rec_add_another")),
        h("button", { class: "btn btn-ink", type: "button", id: "rec-save", onclick: () => add(false) }, t("rec_add", { one: loc(c.one) }))]
      : [c.delete ? h("button", { class: "btn btn-ghost danger", type: "button", id: "rec-remove", "aria-label": t("rec_remove"), onclick: async () => { if (await remove(c, it)) s.close(); } }, ic("trash"), h("span", { class: "hide-sm" }, t("rec_remove"))) : null,
        c.add ? h("button", { class: "btn btn-ghost", type: "button", "aria-label": t("rec_duplicate"), onclick: async () => { await flush(); s.close(); duplicate(c, it); } }, ic("copy"), h("span", { class: "hide-sm" }, t("rec_duplicate"))) : null,
        h("span", { class: "grow" }), h("button", { class: "btn btn-ink", type: "button", id: "rec-done", onclick: async () => { await flush(); s.close(); } }, t("done"))];
    const s = sheet({ title, sub: isNew ? null : loc(c.one), label: title, body: h("form", { class: "rsheet", novalidate: true, onsubmit: (e) => { e.preventDefault(); if (isNew) add(false); } }, formBody, status), foot,
      onclose: () => { clearTimeout(timer); if (!isNew && dirty.size) save(); R.focusKey = it ? it.key : R.focusKey; draw(); } });
    s.sheet.classList.add("wide");
    setTimeout(() => { const first = formBody.querySelector("input:not([type=file]), textarea, select, button.chipt"); first && first.focus(); }, 40);

    function keepDraft() {
      const v = {};
      for (const [n, w] of widgets) { const x = w.get(); if (x != null && !(x && x.upload)) v[n] = x; }
      try { localStorage.setItem(draftKey, JSON.stringify(v)); } catch {}
    }
    function clearErrors() { for (const w of widgets.values()) w.err(null); }
    function showErrors(b) {
      clearErrors();
      const errs = b.errors || [];
      let first = null;
      for (const e of errs) {
        const w = widgets.get(e.field);
        if (w && (!e.collection || e.collection === c.id)) { w.err(errText(e), e.lang); first = first || w; }
      }
      status.replaceChildren(h("div", { class: "note bad" }, ic("alert"), h("span", {}, first ? t("rec_not_saved") : errs.length ? errText(errs[0]) : errText(b))));
      if (first) first.focus();
    }
    async function add(another) {
      const values = {};
      for (const [n, w] of widgets) { const f = fieldOf(c, n); if (f.type !== "readonly") values[n] = w.get(); }
      const btns = s.foot.querySelectorAll("button");
      btns.forEach((b) => (b.disabled = true));
      status.replaceChildren(h("div", { class: "note info" }, h("span", { class: "spin" }), h("span", {}, t("rec_saving"))));
      try {
        const r = await api("POST", `/api/s/${S.sid}/records/${c.id}`, { values });
        try { localStorage.removeItem(draftKey); } catch {}
        setChanges(r.changes);
        await load(true);
        toast(t("rec_added", { t: loc(r.title) }), { icon: "check" });
        if (opts.onadded) opts.onadded(r.id);
        if (another) {
          for (const w of widgets.values()) w.set(undefined);
          clearErrors();
          status.replaceChildren(h("div", { class: "note ok" }, ic("check"), h("span", {}, t("rec_added", { t: loc(r.title) }))));
          formBody.querySelector("input, textarea, select")?.focus();
        } else { R.focusKey = r.id; s.close(); }
      } catch (e) { showErrors(e.body || {}); }
      finally { btns.forEach((b) => (b.disabled = false)); }
    }
    function schedule(immediate) {
      clearTimeout(timer);
      status.replaceChildren(h("div", { class: "note info" }, h("span", { class: "spin" }), h("span", {}, t("rec_saving"))));
      timer = setTimeout(save, immediate ? 0 : 650);
    }
    async function flush() { clearTimeout(timer); if (dirty.size) await save(); else if (saving) await saving; }
    async function save() {
      if (!dirty.size) return;
      const values = {};
      for (const n of dirty) values[n] = widgets.get(n).get();
      const sent = new Set(dirty);
      dirty.clear();
      saving = (async () => {
        try {
          const r = await api("PUT", `/api/s/${S.sid}/records/${c.id}/${it.key}`, { values });
          setChanges(r.changes);
          clearErrors();
          status.replaceChildren(h("div", { class: "note ok" }, ic("check"), h("span", {}, t("rec_saved"))));
          await load(true);
          const nit = coll(c.id).items.find((x) => x.key === it.key);
          if (nit) {
            it = nit;
            s.head.querySelector("h2").textContent = loc(it.title) || it.key;
            for (const n of sent) if (!dirty.has(n)) widgets.get(n).commit?.(nit.values[n]);
          }
        } catch (e) { for (const n of sent) dirty.add(n); showErrors(e.body || {}); }
      })();
      await saving;
      saving = null;
    }
    return s;
  }

  // ── the details (one object: contact, company) ─────────────────────────────────────────────────────────────────
  function drawGroup(body, g) {
    const status = h("div", { class: "rec-status", role: "status", "aria-live": "polite" });
    const widgets = new Map();
    const dirty = new Set();
    let timer = null;
    const els = g.fields.map((f) => {
      const w = widget(f, g.values[f.name], { onchange: (imm) => { dirty.add(f.name); clearTimeout(timer); status.replaceChildren(h("div", { class: "note info" }, h("span", { class: "spin" }), h("span", {}, t("rec_saving")))); timer = setTimeout(save, imm ? 0 : 650); } });
      widgets.set(f.name, w);
      const el = h("div", { class: "rfield", dataset: { field: f.name } }, h("div", { class: "rlabel", id: `gl-${f.name}` }, h("span", {}, loc(f.label))), f.hint ? h("p", { class: "rhint" }, loc(f.hint)) : null, w.el, w.errEl);
      if (w.label) w.label(`gl-${f.name}`);
      return el;
    });
    async function save() {
      if (!dirty.size) return;
      const values = {};
      for (const n of dirty) values[n] = widgets.get(n).get();
      const sent = [...dirty]; dirty.clear();
      try {
        const r = await api("PUT", `/api/s/${S.sid}/settings/${g.id}`, { values });
        setChanges(r.changes);
        for (const w of widgets.values()) w.err(null);
        status.replaceChildren(h("div", { class: "note ok" }, ic("check"), h("span", {}, t("rec_saved"))));
        const fresh = await api("GET", `/api/s/${S.sid}/records`); R.data = fresh;
        const ng = group(g.id); if (ng) { g.values = ng.values; g.changed = ng.changed; }
        document.querySelector(`.rec-tab[data-sel="g:${g.id}"]`)?.replaceWith(navBtn("g:" + g.id, loc(g.label), null, (g.changed || []).length));
      } catch (e) {
        sent.forEach((n) => dirty.add(n));
        const errs = (e.body || {}).errors || [];
        for (const er of errs) widgets.get(er.field)?.err(errText(er), er.lang);
        status.replaceChildren(h("div", { class: "note bad" }, ic("alert"), h("span", {}, errs.length ? t("rec_not_saved") : errText(e.body || {}))));
      }
    }
    body.replaceChildren(h("div", { class: "rec-head" }, h("div", { class: "grow" }, h("h2", {}, loc(g.label)), h("p", {}, g.hint ? loc(g.hint) : t("rec_group_sub")))),
      h("form", { class: "card rform rgroup", novalidate: true, onsubmit: (e) => { e.preventDefault(); clearTimeout(timer); save(); } }, els, status));
  }

  // ── the fields ─────────────────────────────────────────────────────────────────────────────────────────────────
  function widget(f, value, cb) {
    const errEl = h("div", { class: "rerr", role: "alert" });
    const base = { errEl, err(msg) { errEl.replaceChildren(msg ? h("span", {}, ic("alert"), msg) : ""); errEl.parentNode?.classList.toggle("bad", !!msg); } };
    const fire = (imm) => cb.onchange && cb.onchange(imm);
    const enter = (e) => { if (e.key === "Enter" && !e.shiftKey && e.target.tagName === "INPUT") { e.preventDefault(); cb.submit && cb.submit(); } };
    const mk = {
      text: () => {
        const one = (lang, v) => {
          const attrs = { class: "input" + (f.long ? " area" : ""), value: f.long ? null : v ?? "", dir: lang ? X.ldir(lang) : (f.format ? "ltr" : "auto"), lang: lang || null,
            maxlength: f.max || (f.long ? 3000 : 300), oninput: () => fire(false), onkeydown: enter, spellcheck: f.format ? "false" : null, autocomplete: "off" };
          if (f.format === "email") Object.assign(attrs, { type: "email", inputmode: "email" });
          if (f.format === "phone") Object.assign(attrs, { type: "tel", inputmode: "tel" });
          if (f.format === "url") Object.assign(attrs, { type: "url", inputmode: "url" });
          const el = h(f.long ? "textarea" : "input", attrs);
          if (f.long) el.value = v ?? "";
          return el;
        };
        if (f.bilingual) {
          const ins = LANGS().map((l) => [l, one(l, value && value[l])]);
          const el = h("div", { class: "bi" }, ins.map(([l, inp]) => h("label", { class: "bil" }, h("span", { class: "lang-tag" }, X.lname(l)), inp)));
          return { el, focus: () => ins[0][1].focus(), get: () => Object.fromEntries(ins.map(([l, i]) => [l, i.value])),
            set: (v) => ins.forEach(([l, i]) => (i.value = (v && v[l]) || "")),
            label: (id) => ins.forEach(([l, i]) => i.setAttribute("aria-label", `${loc(f.label)} — ${X.lname(l)}`)),
            err: (msg, lang) => { base.err(msg); ins.forEach(([l, i]) => i.classList.toggle("bad", !!msg && (!lang || lang === l))); } };
        }
        const inp = one(null, value);
        return { el: inp, focus: () => inp.focus(), get: () => inp.value, set: (v) => (inp.value = v ?? ""), label: (id) => inp.setAttribute("aria-labelledby", id) };
      },
      number: () => {
        const inp = h("input", { class: "input num", inputmode: "numeric", dir: "ltr", value: value ?? "", oninput: () => fire(false), onkeydown: enter, autocomplete: "off" });
        return { el: inp, focus: () => inp.focus(), get: () => inp.value.trim() === "" ? null : inp.value.trim(), set: (v) => (inp.value = v ?? ""), label: (id) => inp.setAttribute("aria-labelledby", id) };
      },
      auto_number: () => {
        let auto = value === "auto" || value == null;
        const inp = h("input", { class: "input num", inputmode: "numeric", dir: "ltr", value: auto ? "" : value, oninput: () => fire(false), onkeydown: enter, autocomplete: "off", "aria-label": t("rec_typed") });
        const seg = h("div", { class: "seg", role: "group" });
        const paint = () => {
          seg.replaceChildren(...[[true, t("rec_auto")], [false, t("rec_typed")]].map(([a, l]) => h("button", { type: "button", "aria-pressed": String(auto === a),
            onclick: () => { if (auto === a) return; auto = a; paint(); if (!a) inp.focus(); fire(a || inp.value.trim() !== ""); } }, l)));
          inp.hidden = auto;
        };
        paint();
        return { el: h("div", { class: "autonum" }, seg, inp), focus: () => (auto ? seg.querySelector("button") : inp).focus(),
          get: () => (auto ? "auto" : inp.value.trim()), set: (v) => { auto = v === "auto" || v == null; inp.value = auto ? "" : v; paint(); }, label: (id) => seg.setAttribute("aria-labelledby", id) };
      },
      dates: () => {
        let vals = Array.isArray(value) ? value.slice() : value ? [value] : [""];
        if (!vals.length) vals = [""];
        const box = h("div", { class: "dates" });
        let lab = null;
        const paint = (focusLast) => {
          box.replaceChildren(...vals.map((v, i) => h("div", { class: "date-row" },
            h("input", { class: "input num", dir: "ltr", value: v, placeholder: "2026-11-17", inputmode: "numeric", autocomplete: "off", "aria-label": `${loc(f.label)} ${vals.length > 1 ? i + 1 : ""}`.trim(),
              oninput: (e) => { vals[i] = e.target.value; fire(false); }, onkeydown: enter }),
            vals.length > 1 ? h("button", { type: "button", class: "btn btn-ghost btn-icon btn-sm", "aria-label": t("remove"), onclick: () => { vals.splice(i, 1); paint(); fire(true); }, html: icon("x") }) : null)),
            f.many !== false ? h("button", { type: "button", class: "btn btn-quiet", onclick: () => { vals.push(""); paint(true); } }, ic("plus"), t("rec_add_date")) : null);
          if (focusLast) box.querySelectorAll("input")[vals.length - 1]?.focus();
        };
        paint();
        return { el: box, focus: () => box.querySelector("input").focus(), get: () => vals.map((v) => v.trim()).filter(Boolean), set: (v) => { vals = Array.isArray(v) && v.length ? v.slice() : [""]; paint(); }, label: (id) => (lab = id) };
      },
      choice: () => choiceOrRef(f, value, fire, (f.options || []).map((o) => [o.value, loc(o.label)])),
      ref: () => choiceOrRef(f, value, fire, (coll(f.to)?.items || []).map((i) => [i.key, loc(i.title)]), true),
      bool: () => {
        const inp = h("input", { type: "checkbox", checked: value ? true : null, onchange: () => fire(true) });
        return { el: h("label", { class: "check" }, inp, h("span", {}, loc(f.label))), focus: () => inp.focus(), get: () => inp.checked, set: (v) => (inp.checked = !!v) };
      },
      readonly: () => ({ el: h("div", { class: "ro" }, value == null || value === "" ? "—" : String(typeof value === "object" ? loc(value) : value), h("span", { class: "sub" }, t("rec_readonly"))), focus: () => {}, get: () => value, set: () => {} }),
      image: () => imageWidget(f, value, fire),
    };
    const w = (mk[f.type] || mk.readonly)();
    const out = { ...base, ...w, errEl };
    if (!w.err) out.err = base.err;
    else { const own = w.err; out.err = (m, lang) => { base.err(m); own(m, lang); }; }
    return out;
  }

  function choiceOrRef(f, value, fire, options, isRef) {
    const target = isRef ? coll(f.to) : null;
    if (!f.many) {
      const sel = h("select", { class: "input", onchange: () => fire(true) }, h("option", { value: "" }, t("rec_choose")), options.map(([v, l]) => h("option", { value: v, selected: v === value ? true : null }, l)));
      const addBtn = isRef && target && target.add ? h("button", { type: "button", class: "btn btn-quiet", onclick: () => newRef(target, (id) => { sel.append(h("option", { value: id }, titleOf(target.id, id))); sel.value = id; fire(true); setTimeout(() => sel.focus(), 60); }) }, ic("plus"), t("rec_add", { one: loc(target.one) })) : null;
      return { el: h("div", { class: "pick" }, sel, addBtn), focus: () => sel.focus(), get: () => sel.value || null, set: (v) => (sel.value = v || ""), label: (id) => sel.setAttribute("aria-labelledby", id) };
    }
    let vals = Array.isArray(value) ? value.slice() : value ? [value] : [];
    const box = h("div", { class: "multi" });
    if (!isRef) {                                                   // a fixed set: chips to switch on and off
      const paint = () => box.replaceChildren(...options.map(([v, l]) => h("button", { type: "button", class: "chipt", "aria-pressed": String(vals.includes(v)),
        onclick: () => { vals = vals.includes(v) ? vals.filter((x) => x !== v) : options.map(([o]) => o).filter((o) => vals.includes(o) || o === v); paint(); box.querySelector(`[data-v="${CSS.escape(v)}"]`)?.focus(); fire(true); }, dataset: { v } },
        vals.includes(v) ? h("span", { html: icon("check") }) : null, l)));
      paint();
      return { el: box, focus: () => box.querySelector("button")?.focus(), get: () => vals.slice(), set: (v) => { vals = Array.isArray(v) ? v.slice() : []; paint(); }, label: (id) => box.setAttribute("aria-labelledby", id) };
    }
    const add = h("select", { class: "input", "aria-label": t("rec_add_to", { label: loc(f.label) }),
      onchange: () => { if (add.value) { vals.push(add.value); paint(); fire(true); box.querySelector("select")?.focus(); } } });
    const paint = () => {
      add.replaceChildren(h("option", { value: "" }, t("rec_add_to", { label: lower(loc(f.label)) })), ...options.filter(([v]) => !vals.includes(v)).map(([v, l]) => h("option", { value: v }, l)));
      box.replaceChildren(h("ol", { class: "picked" }, vals.map((v, i) => h("li", {}, h("span", { class: "nm", dir: "auto" }, options.find(([o]) => o === v)?.[1] || v),
        i === 0 && vals.length > 1 ? h("span", { class: "badge grey" }, t("rec_main")) : null,
        i > 0 ? h("button", { type: "button", class: "btn btn-ghost btn-icon btn-sm", title: t("rec_make_main"), "aria-label": `${t("rec_up")}: ${options.find(([o]) => o === v)?.[1] || v}`, onclick: () => { vals.splice(i, 1); vals.splice(i - 1, 0, v); paint(); fire(true); }, html: icon("up") }) : null,
        h("button", { type: "button", class: "btn btn-ghost btn-icon btn-sm", "aria-label": `${t("remove")}: ${options.find(([o]) => o === v)?.[1] || v}`, onclick: () => { vals.splice(i, 1); paint(); fire(true); }, html: icon("x") })))),
        h("div", { class: "pick" }, add, target && target.add ? h("button", { type: "button", class: "btn btn-quiet", onclick: () => newRef(target, (id) => { options.push([id, titleOf(target.id, id)]); vals.push(id); paint(); fire(true); setTimeout(() => box.querySelector("select")?.focus(), 60); }) }, ic("plus"), t("rec_add", { one: loc(target.one) })) : null));
    };
    paint();
    return { el: box, focus: () => box.querySelector("select")?.focus(), get: () => vals.slice(), set: (v) => { vals = Array.isArray(v) ? v.slice() : []; paint(); }, label: (id) => box.setAttribute("aria-labelledby", id) };
  }
  function newRef(target, done) {
    recordSheet(target, null, { onadded: (id) => done(id) });
  }

  function imageWidget(f, value, fire) {
    let cur = value && (value.file || typeof value === "string") ? value : null;   // what the record has
    let up = null;                                                                    // a new upload, once chosen
    let removed = false;
    const accept = (f.accept || ["png", "jpg", "webp"]);
    const mime = accept.map((a) => ({ png: "image/png", jpg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" }[a])).join(",");
    const fileIn = h("input", { type: "file", accept: mime, class: "sr", "aria-label": t("rec_pic_choose") });
    const prog = h("div", { class: "progress", hidden: true }, h("i"));
    const pic = h("div", { class: "rpic" + (f.name === "logo" ? " logo" : "") });
    const note = h("div");
    const src = f.source ? h("input", { class: "input", type: "url", dir: "ltr", inputmode: "url", placeholder: "https://", value: (cur && cur.source) || "", oninput: () => fire(false), autocomplete: "off", "aria-label": t("rec_source") }) : null;
    const alts = f.alt ? X.langs().map((l) => [l, h("input", { class: "input", dir: X.ldir(l), lang: l, value: (cur && cur.alt && cur.alt[l]) || "", oninput: () => fire(false), autocomplete: "off", "aria-label": `${t("rec_alt")} — ${X.lname(l)}` })]) : [];
    const drop = h("div", { class: "drop rdrop" });
    const paint = () => {
      const url = up ? up.url : !removed && cur ? cur.url : null;
      pic.replaceChildren(url ? h("img", { src: url, alt: "" }) : h("span", { html: icon(f.name === "logo" ? "building" : "image") }));
      drop.replaceChildren(h("span", {}, t("rec_pic_drop")), " ",
        h("button", { class: "btn btn-sm", type: "button", onclick: () => fileIn.click() }, ic("upload"), url ? t("rec_pic_replace") : t("rec_pic_choose")),
        url ? h("button", { class: "btn btn-sm btn-ghost", type: "button", onclick: () => { up = null; removed = true; paint(); fire(true); } }, t("rec_pic_remove")) : null,
        h("p", {}, t("rec_pic_formats", { f: accept.map((a) => a.toUpperCase()).join(", "), kb: X.nf().format(f.max_kb || 2048) })), prog, fileIn);
    };
    paint();
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => { const fl = e.dataTransfer.files[0]; if (fl) send(fl); });
    fileIn.addEventListener("change", () => { if (fileIn.files[0]) send(fileIn.files[0]); });
    const cid = () => (R.data.collections.find((c) => c.fields.includes(f)) || {}).id;
    async function send(file) {
      note.replaceChildren();
      if (file.size > (f.max_kb || 2048) * 1024) { note.replaceChildren(h("div", { class: "note bad" }, ic("alert"), h("span", {}, errText({ code: "rec_img_big", kb: f.max_kb || 2048 })))); return; }
      prog.hidden = false; prog.firstChild.style.width = "0%";
      try {
        up = await X.upload(`/api/s/${S.sid}/rec-upload/${cid()}/${f.name}`, file, (p) => (prog.firstChild.style.width = Math.round(p * 100) + "%"));
        prog.hidden = true;
        removed = false;
        paint();
        note.replaceChildren(h("div", { class: "note ok" }, ic("check"), h("span", {}, t("rec_pic_ready"))));
        fire(true);
      } catch (e) {
        prog.hidden = true;
        note.replaceChildren(h("div", { class: "note bad" }, ic("alert"), h("span", {}, errText({ ...(e.body || {}), code: (e.body || {}).error }))));
      }
    }
    const extra = () => {
      const o = {};
      if (src) o.source = src.value.trim();
      if (alts.length) o.alt = Object.fromEntries(alts.map(([l, i]) => [l, i.value]));
      return o;
    };
    return {
      el: h("div", { class: "rimg" }, h("div", { class: "rimg-top" }, pic, drop), note,
        src ? h("label", { class: "rsub" }, h("span", {}, t("rec_source")), src) : null,
        alts.length ? h("div", { class: "rsub" }, h("span", {}, t("rec_alt")), h("div", { class: "bi" }, alts.map(([l, i]) => h("label", { class: "bil" }, h("span", { class: "lang-tag" }, X.lname(l)), i)))) : null),
      focus: () => drop.querySelector("button").focus(),
      get: () => (up ? { upload: up.id, ...extra() } : removed || !cur ? null : { file: cur.file || cur, ...extra() }),
      set: () => { up = null; removed = false; cur = null; if (src) src.value = ""; alts.forEach(([, i]) => (i.value = "")); note.replaceChildren(); paint(); },
      commit: (v) => { if (v !== undefined) { cur = v && (v.file || typeof v === "string") ? v : null; up = null; removed = false; } },
    };
  }

  // ── a change, in words (the review and History) ────────────────────────────────────────────────────────────────
  function describe(c) {
    if (c.type === "settings") {
      const g = group(c.group);
      const f = g && g.fields.find((x) => x.name === c.field);
      const text = t("ch_settings", { f: f ? loc(f.label) : c.field, g: g ? loc(g.label) : c.group });
      return { kind: g ? loc(g.label) : t("rec_ch"), text, before: f ? show(f, c.before) : String(c.before ?? "—"), after: f ? show(f, c.after) : String(c.after ?? "—"), dir: "auto" };
    }
    const col = coll(c.coll);
    const one = col ? loc(col.one) : c.coll;
    const name = loc(c.title) || c.rid;
    if (c.op === "added") return { kind: col ? loc(col.label) : c.coll, text: t("ch_added", { one, t: name }) };
    if (c.op === "removed") return { kind: col ? loc(col.label) : c.coll, text: t("ch_removed", { one, t: name }) };
    if (c.op === "order") return { kind: col ? loc(col.label) : c.coll, text: t("ch_order", { label: col ? loc(col.label) : c.coll }) };
    const fs = (c.fields || []).map((n) => (n === "_other" ? t("ch_other") : col && fieldOf(col, n) ? lower(loc(fieldOf(col, n).label)) : n));
    const out = { kind: col ? loc(col.label) : c.coll, text: t("ch_changed", { f: list(fs), t: name }) };
    if (col && c.fields.length === 1 && fieldOf(col, c.fields[0]) && fieldOf(col, c.fields[0]).type !== "image") {
      const f = fieldOf(col, c.fields[0]);
      out.before = show(f, c.before && c.before[f.name]);
      out.after = show(f, c.after && c.after[f.name]);
    }
    return out;
  }

  return { view, load, describe, errText, has: () => !!(R.data && R.sid === S.sid), reset: () => { R.data = null; R.sel = null; } };
}
