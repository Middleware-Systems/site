// main.js: what every page shares. The header settles once the page scrolls, the menu opens on a phone, and the
// marked blocks arrive once as they come into view (never for a reader who asked for reduced motion: the CSS keeps
// them still and visible).

const root = document.documentElement;
root.classList.add('js');
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

const top = document.querySelector('[data-top]');
const onScroll = () => {
  if (window.scrollY > 24) top.setAttribute('data-scrolled', '');
  else top.removeAttribute('data-scrolled');
};
onScroll();
addEventListener('scroll', onScroll, { passive: true });

const btn = document.querySelector('.top-menu');
const menu = document.getElementById('menu');
if (btn && menu) {
  const label = btn.querySelector('.label');
  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    label.textContent = open ? btn.dataset.close : btn.dataset.open;
    if (open) menu.setAttribute('data-open', '');
    else menu.removeAttribute('data-open');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  matchMedia('(min-width: 861px)').addEventListener('change', (m) => { if (m.matches) set(false); });
}

const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('is-in'); seen.unobserve(e.target); }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
document.querySelectorAll('.reveal, .hour').forEach((el) => seen.observe(el));
