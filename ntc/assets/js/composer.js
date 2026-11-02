/* composer.js — the enquiry: what the visitor fills in becomes one message, in the page's language (Arabic in the
   spoken register — a person sends it). Instagram cannot be pre-filled from a website, so the message is copied and
   the chat opened; WhatsApp gets a button only when a number is confirmed (content/contact.json). */
(() => {
  const box = document.querySelector('[data-composer]');
  if (!box) return;
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const M = data.msg, lang = data.lang;
  const form = box.querySelector('form');
  const out = box.querySelector('[data-msg]');
  const note = box.querySelector('[data-send-note]');
  const noteText = note.textContent;

  const q = new URLSearchParams(location.search);
  const pre = q.get('set'), preC = q.get('c');
  if (pre && data.sets[pre]) { const cb = form.querySelector(`input[name="sets"][value="${pre}"]`); if (cb) cb.checked = true; }

  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  // English: "01, 02 and 03"; Arabic repeats the و: «01 و02 و03»
  const listOf = arr => arr.length < 2 ? arr.join('') : lang === 'ar' ? arr.join(M.and)
    : arr.slice(0, -1).join(', ') + M.and + arr[arr.length - 1];

  function compose() {
    const f = new FormData(form);
    const who = f.get('who') || 'other', name = (f.get('name') || '').trim(), city = (f.get('city') || '').trim();
    const sets = f.getAll('sets'), qty = (f.get('qty') || '').trim(), extra = (f.get('note') || '').trim();
    const lines = [M.hello];
    const id = [];
    if (name) id.push(fill(M.me, { name }));
    if (data.who[who]) id.push(fill(name ? M.from : M.we, { who: data.who[who] }));
    if (city) id.push(fill(M.in, { city }));
    if (id.length) {
      let s = id.join(' ');
      if (lang === 'en') s = s[0].toUpperCase() + s.slice(1);
      lines.push(s + '.');
    }
    // our numbers are not their article codes (CLAIMS C17): each set travels with the name on its box
    const named = sets.map(id => id + ' (' + (data.boxes[id] || '') + ')');
    lines.push(sets.length === 0 ? M.about_none : fill(sets.length === 1 ? M.about : M.about_many, { sets: listOf(named) }));
    if (sets.length === 1 && sets[0] === pre && preC && data.sets[pre]) lines.push(fill(M.colour, { i: preC, n: data.sets[pre] }));
    if (qty) lines.push(fill(M.qty, { qty }));
    if (extra) lines.push(extra);
    return lines.join('\n');
  }
  function update() {
    const m = compose();
    out.textContent = m;
    const wa = box.querySelector('[data-send="wa"]');
    if (wa && data.whatsapp) wa.href = 'https://wa.me/' + data.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(m);
    note.textContent = noteText; note.classList.remove('is-done');
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    try {
      const r = document.createRange(); r.selectNodeContents(out);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      const ok = document.execCommand('copy'); s.removeAllRanges(); return ok;
    } catch (e) { return false; }
  }
  box.querySelector('[data-send="ig"]').addEventListener('click', async () => {
    const ok = await copy(out.textContent);
    note.textContent = ok ? data.ui.copied : data.ui.copy_fail;
    note.classList.toggle('is-done', ok);
  });
})();
