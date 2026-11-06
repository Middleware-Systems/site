// trade.js: the distributors' section. The family selector shows that family's rows of the pack table, and the
// enquiry form writes an email to New Park's sales address in the reader's own mail program (nothing is sent from
// the page; it asks for name, company and country first, and says so if one is missing).

function finder() {
  const box = document.querySelector('[data-finder]');
  if (!box) return;
  const sel = box.querySelector('[data-finder-select]');
  const rows = [...box.querySelectorAll('tbody tr')];
  const wrap = box.querySelector('.table-wrap');
  const show = () => {
    for (const r of rows) r.hidden = r.dataset.family !== sel.value;
    wrap.scrollTop = 0;
  };
  sel.addEventListener('change', show);
  show();
  box.dataset.ready = '1';
}

function enquiry() {
  const form = document.querySelector('[data-enquiry]');
  if (!form) return;
  const need = form.querySelector('.enquiry-need');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const req = [...form.querySelectorAll('[required]')];
    let missing = null;
    for (const f of req) {
      const bad = !f.value.trim();
      f.setAttribute('aria-invalid', String(bad));
      if (bad && !missing) missing = f;
    }
    need.hidden = !missing;
    if (missing) { missing.focus(); return; }
    const lines = [...form.querySelectorAll('.field')].map((l) => {
      const v = l.querySelector('input, select, textarea').value.trim();
      return v ? `${l.querySelector('span').textContent}: ${v}` : null;
    }).filter(Boolean);
    const subject = `${form.dataset.subject} · ${form.company.value.trim()} · ${form.country.value.trim()}`;
    const href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    form.dataset.mailto = href;
    location.href = href;
  });
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });
}

try { finder(); enquiry(); } catch (err) { console.warn('trade:', err); }
