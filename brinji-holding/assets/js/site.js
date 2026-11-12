// BRINJI Holding — everything that moves or answers. Each part works alone and does nothing on a page without its markup.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ── header: clear over the opening, solid once the page moves, out of the way while reading down ── */
(() => {
  const hd = $('[data-header]');
  if (!hd) return;
  let last = scrollY, ticking = false;
  const run = () => {
    ticking = false;
    const y = scrollY;
    hd.classList.toggle('is-solid', y > 24);
    const menuOpen = !$('[data-menu]').hidden;
    if (!menuOpen) hd.classList.toggle('is-away', y > 520 && y > last + 4 ? true : y < last - 4 ? false : hd.classList.contains('is-away'));
    last = y;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  run();
})();

/* ── the small-screen menu ── */
(() => {
  const btn = $('[data-menu-open]'), menu = $('[data-menu]');
  if (!btn || !menu) return;
  $$('.menu-list > li', menu).forEach((li, i) => li.style.setProperty('--i', i));
  const set = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    $('[data-header]').classList.toggle('is-solid', open || scrollY > 24);
    $('[data-header]').classList.remove('is-away');
    if (open) $('a', menu).focus({ preventScroll: true });
  };
  btn.addEventListener('click', () => set(menu.hidden));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [btn, ...$$('a', menu)];
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
})();

/* ── things arrive as they are reached ── */
(() => {
  const els = $$('[data-reveal]');
  if (!els.length) return;
  if (!('IntersectionObserver' in window) || calm) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  els.forEach((e) => io.observe(e));
})();

/* ── large figures count up once ── */
(() => {
  const els = $$('.stat-n[data-count]').filter((e) => /[,+]/.test(e.textContent));
  if (!els.length || calm || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      const el = en.target, final = el.textContent, to = Number(el.dataset.count), plus = final.includes('+');
      const t0 = performance.now(), dur = 1500;
      const step = (now) => {
        const k = clamp((now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(to * e).toLocaleString('en-US') + (plus ? '+' : '');
        if (k < 1) requestAnimationFrame(step); else el.textContent = final;
      };
      requestAnimationFrame(step);
    }
  }, { threshold: .6 });
  els.forEach((e) => io.observe(e));
})();

/* ── the opening ── */
(() => {
  const hero = $('[data-hero]');
  if (!hero) return;
  if (calm) hero.classList.add('is-flat');
  let ticking = false;
  const run = () => {
    ticking = false;
    if (hero.classList.contains('is-flat')) return;
    const r = hero.getBoundingClientRect();
    const span = r.height - innerHeight;
    const p = span > 0 ? clamp(-r.top / span) : 0;
    hero.style.setProperty('--p', p.toFixed(4));
    hero.classList.toggle('is-b', p > .22);
    hero.dispatchEvent(new Event('hero:draw'));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener('resize', run, { passive: true });
  run();
  import('./hero.js').then((m) => m.start(hero)).catch((e) => console.warn(e));
})();

/* ── the map: light a company's row and column; filter by role ── */
(() => {
  for (const board of $$('[data-board]')) {
    const light = (cell, on) => {
      $(`.board-row[data-row="${cell.dataset.row}"]`, board)?.classList.toggle('is-lit', on);
      $(`.board-col[data-col="${cell.dataset.col}"]`, board)?.classList.toggle('is-lit', on);
    };
    for (const d of $$('.cell .disc', board)) {
      const cell = d.closest('.cell');
      d.addEventListener('pointerenter', () => light(cell, true));
      d.addEventListener('pointerleave', () => light(cell, false));
      d.addEventListener('focus', () => light(cell, true));
      d.addEventListener('blur', () => light(cell, false));
    }
    $$('.is-ghost .ring', board).forEach((r, i) => r.style.setProperty('--i', i));
  }
  const filter = $('[data-filter="roles"]');
  if (!filter) return;
  filter.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const v = b.dataset.v;
    $$('.chip', filter).forEach((c) => { const on = c === b; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
    for (const board of $$('[data-board]')) {
      board.classList.toggle('is-filtered', !!v);
      $$('.cell .disc', board).forEach((d) => d.classList.toggle('is-match', !v || d.dataset.roles.split(' ').includes(v)));
    }
    $$('[data-co-card]').forEach((c) => c.classList.toggle('is-off', !!v && !c.dataset.roles.split(' ').includes(v)));
  });
})();

/* ── the network: a circle answers with its branch ── */
(() => {
  for (const net of $$('[data-net]')) {
    const read = $('[data-net-read]', net);
    if (!read) continue;
    const put = (name, pos, wh, veh) => {
      $('[data-f=name]', read).textContent = name;
      $('[data-f=pos]', read).textContent = pos;
      $('[data-f=wh]', read).textContent = wh;
      $('[data-f=veh]', read).textContent = veh;
    };
    const total = () => put(read.dataset.totalName, read.dataset.totalPos, read.dataset.totalWh, read.dataset.totalVeh);
    let pinned = null;
    const show = (n) => put(n.dataset.name, n.dataset.pos, n.dataset.wh, n.dataset.veh);
    for (const n of $$('.net-node', net)) {
      n.addEventListener('pointerenter', () => show(n));
      n.addEventListener('pointerleave', () => (pinned ? show(pinned) : total()));
      n.addEventListener('focus', () => show(n));
      n.addEventListener('blur', () => (pinned ? show(pinned) : total()));
      n.addEventListener('click', () => {
        pinned?.classList.remove('is-on');
        pinned = pinned === n ? null : n;
        pinned?.classList.add('is-on');
        pinned ? show(pinned) : total();
      });
    }
  }
})();

/* ── the wall of brands: drift only while seen; filter; a brand opens in place ── */
(() => {
  for (const d of $$('[data-drift]')) {
    if (!('IntersectionObserver' in window)) break;
    new IntersectionObserver((es) => d.classList.toggle('is-paused', !es[0].isIntersecting)).observe(d);
  }
  const wall = $('[data-wall]');
  const filter = $('[data-filter="rel"]');
  if (wall && filter) {
    filter.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      const v = b.dataset.v;
      $$('.chip', filter).forEach((c) => { const on = c === b; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      const apply = () => $$('li', wall).forEach((li) => { li.hidden = !!v && li.dataset.rel !== v; });
      if (document.startViewTransition && !calm) document.startViewTransition(apply); else apply();
    });
  }
  const dlg = $('[data-brand-dialog]');
  if (wall && dlg && dlg.showModal) {
    wall.addEventListener('click', (e) => {
      const b = e.target.closest('[data-brand]');
      if (!b) return;
      const logo = $('[data-f=logo]', dlg);
      logo.replaceChildren(...[...b.children].filter((c) => !c.classList.contains('vh')).map((c) => c.cloneNode(true)));
      $('[data-f=name]', dlg).textContent = b.dataset.name;
      $('[data-f=rel]', dlg).textContent = b.dataset.relname;
      $('[data-f=note]', dlg).textContent = b.dataset.note;
      for (const k of ['owner', 'by']) {
        $(`[data-row=${k}]`, dlg).hidden = !b.dataset[k];
        $(`[data-f=${k}]`, dlg).textContent = b.dataset[k];
      }
      dlg.showModal();
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }
})();

/* ── the enquiry: pick a door, and the message is addressed to the company behind it ── */
(() => {
  const form = $('[data-enquiry]');
  if (!form) return;
  const out = $('[data-to-out]', form), msg = $('[data-ask-out]', form);
  const q = new URLSearchParams(location.search);
  const about = q.get('about'), toId = q.get('to');
  let chosen = null;
  const radios = $$('input[name=about]', form);
  const sync = () => {
    const r = radios.find((x) => x.checked) || radios[0];
    const names = r.dataset.to.split('|'), ids = r.dataset.toIds.split('|');
    const i = toId && r.value === about ? ids.indexOf(toId) : -1;
    chosen = { label: r.dataset.label, email: r.dataset.email, to: i >= 0 ? names[i] : names.join(' · ') };
    out.textContent = chosen.to;
    msg.placeholder = r.dataset.ask;
  };
  if (about) { const r = radios.find((x) => x.value === about); if (r) r.checked = true; }
  radios.forEach((r) => r.addEventListener('change', sync));
  sync();

  const fail = (field, text) => {
    field.classList.add('is-bad');
    let e = $('.err', field);
    if (!e) { e = document.createElement('span'); e.className = 'err'; e.setAttribute('role', 'alert'); field.append(e); }
    e.textContent = text;
  };
  const clear = (field) => { field.classList.remove('is-bad'); $('.err', field)?.remove(); };
  $$('.field', form).forEach((f) => $('input,textarea', f).addEventListener('input', () => clear(f)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let first = null;
    for (const f of $$('.field', form)) {
      const el = $('input,textarea', f);
      clear(f);
      if (el.required && !el.value.trim()) { fail(f, form.dataset.required); first ??= el; }
      else if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())) { fail(f, form.dataset.badEmail); first ??= el; }
    }
    if (first) { first.focus(); return; }
    const v = (n) => form.elements[n].value.trim();
    const lines = [v('message'), '', '—', v('name'), v('company'), v('email'), v('phone')].filter((x, i) => x || i === 1);
    const subject = form.dataset.subject.replace('{label}', chosen.label) + (chosen.to ? ' · ' + chosen.to : '');
    const href = `mailto:${chosen.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    const done = $('[data-done]', form);
    $('[data-done-text]', done).textContent = form.dataset.done.replace('{to}', chosen.to).replace('{email}', chosen.email);
    $$('fieldset', form).forEach((f) => { f.hidden = true; });
    done.hidden = false;
    done.focus();
    form.dataset.sent = href;
    location.href = href;
  });
  $('[data-again]', form)?.addEventListener('click', () => {
    $$('fieldset', form).forEach((f) => { f.hidden = false; });
    $('[data-done]', form).hidden = true;
    msg.value = '';
    msg.focus();
  });
})();

/* ── three offices, three clocks ── */
(() => {
  const times = $$('[data-time]'), clocks = $$('[data-clock]');
  if (!times.length && !clocks.length) return;
  const parts = (tz) => {
    try {
      const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      return [Number(f.find((p) => p.type === 'hour').value), Number(f.find((p) => p.type === 'minute').value)];
    } catch { return null; }
  };
  const tick = () => {
    for (const el of times) { const p = parts(el.dataset.time); if (p) el.textContent = `${String(p[0]).padStart(2, '0')}:${String(p[1]).padStart(2, '0')}`; }
    for (const c of clocks) {
      const p = parts(c.dataset.clock);
      if (!p) continue;
      $('.hh', c).style.setProperty('--a', `${(p[0] % 12) * 30 + p[1] * .5}deg`);
      $('.mm', c).style.setProperty('--a', `${p[1] * 6}deg`);
    }
  };
  tick();
  setInterval(tick, 20000);
})();
