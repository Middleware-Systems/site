// range.js: the range page. An aisle chip shows that aisle; the search box matches a product's English or Arabic
// name, its family or its size ("500 g", "500g"). Families and aisles with nothing left are hidden, the count says how
// many products are shown, and the address keeps the aisle (#cheese) so a link opens on it.

const main = document.querySelector('[data-range]');

const fold = (s) => s.toLowerCase()
  .replace(/[ً-ٰٟ]/g, '')          // Arabic marks
  .replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ').trim();

function start() {
  if (!main) return;
  const ar = document.documentElement.lang === 'ar';
  const chips = [...document.querySelectorAll('[data-chip]')];
  const search = document.querySelector('[data-search]');
  const cards = [...main.querySelectorAll('.card')].map((el) => ({ el, aisle: el.dataset.aisle, q: fold(el.dataset.q) }));
  const fams = [...main.querySelectorAll('.fam')];
  const secs = [...main.querySelectorAll('[data-aisle-sec]')];
  const countOut = document.querySelector('[data-count]');
  const wordOut = document.querySelector('[data-count-word]');
  const none = document.querySelector('[data-none]');
  let aisle = 'all';

  const word = (n) => {
    const d = main.dataset;
    if (ar) return n <= 2 ? d.countOne : n <= 10 ? d.countFew : d.countMany;
    return n === 1 ? d.countOne : d.countFew;
  };

  function apply() {
    const terms = fold(search.value).split(' ').filter(Boolean);
    let n = 0;
    for (const c of cards) {
      const ok = (aisle === 'all' || c.aisle === aisle) && terms.every((t) => c.q.includes(t));
      c.el.hidden = !ok;
      if (ok) n++;
    }
    for (const f of fams) f.hidden = !f.querySelector('.card:not([hidden])');
    for (const s of secs) s.hidden = !s.querySelector('.card:not([hidden])');
    countOut.textContent = n;
    wordOut.textContent = word(n);
    none.hidden = n > 0;
  }

  function choose(k, scroll) {
    aisle = chips.some((c) => c.dataset.chip === k) ? k : 'all';
    for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.chip === aisle));
    apply();
    history.replaceState(null, '', aisle === 'all' ? location.pathname : `#${aisle}`);
    if (scroll) main.querySelector('.range-tools, [data-tools]')?.scrollIntoView({ block: 'start' });
  }

  chips.forEach((c) => c.addEventListener('click', () => choose(c.dataset.chip, false)));
  search.addEventListener('input', apply);
  addEventListener('hashchange', () => choose(location.hash.slice(1), true));
  const h = location.hash.slice(1);
  if (h) choose(h, false); else apply();
  main.dataset.ready = '1';
}

try { start(); } catch (err) { console.warn('range: every product stays shown', err); }
