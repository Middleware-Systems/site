/* site.js — what every page shares: the header over the hero, the reveal, the mill's film, the sets rail, the
   collection filter and a set's colourways. No framework; every feature degrades to plain HTML without it. */
(() => {
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rtl = document.documentElement.dir === 'rtl';
  const body = document.body;

  // header: transparent over the hero until the page moves
  if (body.classList.contains('pg-home')) {
    const on = () => body.classList.toggle('is-scrolled', window.scrollY > 40);
    addEventListener('scroll', on, { passive: true }); on();
  }

  // reveal
  if (!reduce && 'IntersectionObserver' in window) {
    const els = document.querySelectorAll('main section:not(.hero) .eyebrow, main section:not(.hero) .h2, main section:not(.hero) > .wrap .body, .root, .yarn-lab, .robe-fig, .trio-c, .fam-h, .tb-mark');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => { el.classList.add('rv'); io.observe(el); });
  }

  // the mill: one stage on wide screens (the chapter in the middle of the screen chooses the film), a film per chapter
  // on narrow ones (each plays while it is on screen). Reduced motion: the posters only.
  const mill = document.querySelector('.mill');
  if (mill) {
    const wide = matchMedia('(min-width: 961px)');
    const stage = [...mill.querySelectorAll('.stage-frame video')];
    const label = mill.querySelector('[data-stage-label]');
    const chapters = [...mill.querySelectorAll('.chapter')];
    const play = v => { if (!reduce) { v.preload = 'auto'; const p = v.play(); if (p) p.catch(() => {}); } };
    const choose = id => {
      chapters.forEach(c => c.classList.toggle('is-on', c.dataset.chapter === id));
      if (!wide.matches) return;
      stage.forEach(v => {
        const on = v.dataset.clip === id;
        v.classList.toggle('is-on', on);
        on ? play(v) : v.pause();
      });
      const ch = chapters.find(c => c.dataset.chapter === id);
      if (label && ch) label.textContent = ch.querySelector('.chapter-n').textContent;
    };
    const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) choose(e.target.dataset.chapter); }),
      { rootMargin: '-45% 0px -45% 0px' });
    chapters.forEach(c => io2.observe(c));
    const inline = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (wide.matches) { v.pause(); return; }
      e.isIntersecting ? play(v) : v.pause();
    }), { threshold: 0.5 });
    mill.querySelectorAll('.chapter-media video').forEach(v => inline.observe(v));
    new IntersectionObserver(es => { if (!es[0].isIntersecting) stage.forEach(v => v.pause()); else { const on = stage.find(v => v.classList.contains('is-on')); if (on && wide.matches) play(on); } })
      .observe(mill);
    if (chapters[0]) chapters[0].classList.add('is-on');
  }

  // the rail: drag with a mouse (touch and trackpads scroll natively)
  document.querySelectorAll('[data-rail]').forEach(rail => {
    let x0 = 0, s0 = 0, down = false, moved = false;
    rail.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; x0 = e.clientX; s0 = rail.scrollLeft;
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 5) { moved = true; rail.classList.add('is-drag'); }
      if (moved) rail.scrollLeft = s0 - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return; down = false;
      setTimeout(() => rail.classList.remove('is-drag'), 0);
    });
  });

  // the collection's filter
  const chips = [...document.querySelectorAll('.pg-collection .chip[data-filter]')];
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.setAttribute('aria-pressed', x === c));
    const f = c.dataset.filter;
    document.querySelectorAll('.fam').forEach(s => { s.hidden = !(f === 'all' || s.dataset.fam === f); });
  }));

  // a set's colourways
  const gal = document.querySelector('[data-gallery]');
  if (gal) {
    const main = gal.querySelector('.g-main');
    const count = gal.querySelector('.g-count');
    const thumbs = [...gal.querySelectorAll('.thumb')];
    const ask = document.querySelector('[data-ask]');
    const select = (b, focus) => {
      const i = +b.dataset.i;
      thumbs.forEach(x => { const on = x === b; x.setAttribute('aria-checked', on); x.tabIndex = on ? 0 : -1; });
      if (focus) b.focus();
      main.classList.add('is-swapping');
      const img = new Image();
      img.onload = img.onerror = () => {
        main.srcset = b.dataset.w480 + ' 480w, ' + b.dataset.w960 + ' 960w';
        main.src = b.dataset.w960;
        main.alt = main.dataset.altTpl.replace('{i}', i);
        main.classList.remove('is-swapping');
      };
      img.src = b.dataset.w960;
      count.textContent = count.dataset.countTpl.replace('{i}', i);
      if (ask) ask.href = ask.dataset.askBase.replace('#', '&c=' + i + '#');
    };
    thumbs.forEach((b, k) => {
      b.tabIndex = k === 0 ? 0 : -1;
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', e => {
        const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', bk = rtl ? 'ArrowRight' : 'ArrowLeft';
        let j = null;
        if (e.key === fwd || e.key === 'ArrowDown') j = (k + 1) % thumbs.length;
        if (e.key === bk || e.key === 'ArrowUp') j = (k - 1 + thumbs.length) % thumbs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = thumbs.length - 1;
        if (j !== null) { e.preventDefault(); select(thumbs[j], true); }
      });
    });
  }
})();
