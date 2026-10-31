// The page's behaviour: header, menu, the once-only reveals (band feed, route, plan), the clocks, the forms — and the
// stage, loaded after first paint. Every part works without the others; nothing here is needed to read the page.

// the hidden starting states (bands not yet fed, the route not yet travelled) exist only while this script runs
document.documentElement.classList.add('ready');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// header: solid once the cover is behind it
const top = $('[data-top]');
const solid = () => top.classList.toggle('solid', scrollY > 24);
addEventListener('scroll', solid, { passive: true });
solid();

// the menu sheet
const sheet = $('[data-sheet]'), menuBtn = $('[data-menu]');
let menuOpen = false;
const setMenu = open => {
  menuOpen = open;
  sheet.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  $('span', menuBtn).textContent = open ? menuBtn.dataset.shut : menuBtn.dataset.open;
  document.documentElement.classList.toggle('menu-open', open);
  if (open) $('a', sheet).focus(); else menuBtn.focus({ preventScroll: true });
};
menuBtn.addEventListener('click', e => { e.preventDefault(); setMenu(!menuOpen); });
$$('[data-close]', sheet).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

// the language switch keeps the reader's place
$$('a[hreflang]').forEach(a => a.addEventListener('click', () => { if (location.hash) a.href = a.href.split('#')[0] + location.hash; }));

// once-only reveals: each runs the first time it is a third into view; reduced motion sees the end state at once
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -30% 0px' });
$$('[data-feed], [data-route], [data-plan]').forEach(el => io.observe(el));
$$('[data-route] .station').forEach((s, i) => s.style.setProperty('--i', i));

// the clocks: each office's local time, on the minute; the UTC offset stays if Intl cannot say
const clocks = $$('[data-tz]');
const tick = () => clocks.forEach(t => {
  try {
    t.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: t.dataset.tz }).format(new Date());
  } catch (_) { /* keep the offset */ }
});
if (clocks.length) { tick(); setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000); }

// forms: there is no endpoint yet, so a submit says so, loudly, and points to WhatsApp and the phones
$$('[data-form]').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault();
  const big = $('[data-big]', f), file = $('input[type=file]', f), note = $('[data-note]', f);
  note.hidden = true;
  if (big) big.hidden = true;
  if (!f.reportValidity()) return;                                     // the required fields first, in the browser's own words
  if (file && file.files[0] && file.files[0].size > Number(file.dataset.max)) { big.hidden = false; return; }
  note.hidden = false;
  note.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}));
$$('input[type=file]').forEach(inp => inp.addEventListener('change', () => {
  const name = inp.closest('.file').querySelector('[data-file-name]');
  if (!name.dataset.none) name.dataset.none = name.textContent;
  name.textContent = inp.files[0] ? inp.files[0].name : name.dataset.none;
}));

// the phone dock: the two doors, once the stage is behind and while no form is on screen
const dock = $('[data-dock]'), stageEl = $('[data-stage]');
const onScreen = new Set();
const formIO = new IntersectionObserver(es => {
  es.forEach(e => e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target));
  dockState();
}, { threshold: .05 });
$$('#careers, #contact').forEach(f => formIO.observe(f));
function dockState() {
  const past = stageEl.getBoundingClientRect().bottom < innerHeight * .6;
  const show = past && onScreen.size === 0;
  dock.classList.toggle('show', show);
  dock.setAttribute('aria-hidden', String(!show));
  $$('a', dock).forEach(a => a.tabIndex = show ? 0 : -1);
}
addEventListener('scroll', dockState, { passive: true });

// "Network" lands on the finished map, not on the cover
$$('a[href="#network"]').forEach(a => a.addEventListener('click', e => {
  if (!stageEl.classList.contains('is-live')) return;
  e.preventDefault();
  const r = stageEl.getBoundingClientRect();
  scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * .96, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}));

// the stage, after first paint
const go = () => import('./stage.js').then(m => m.stage(stageEl)).catch(err => {
  console.warn('stage:', err.message);
  stageEl.classList.remove('is-live', 'has-points');
});
if (document.readyState === 'complete') requestAnimationFrame(go); else addEventListener('load', () => requestAnimationFrame(go), { once: true });
