// day.js: «A Damascus day». The section takes the colour of the hour being read (dawn blue, noon cream, the amber
// afternoon, the night), and the dial beside it keeps the time: its hands follow the scroll from 07:00 to 21:00.

const day = document.querySelector('[data-day]');

function start() {
  if (!day) return;
  const hours = [...day.querySelectorAll('[data-hour]')];
  const hh = day.querySelector('[data-hand-h]');
  const mm = day.querySelector('[data-hand-m]');
  const out = day.querySelector('[data-dial-time]');
  const mins = hours.map((h) => { const [a, b] = h.dataset.time.split(':').map(Number); return a * 60 + b; });

  const phase = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) day.dataset.phase = e.target.dataset.hour;
  }, { rootMargin: '-48% 0px -48% 0px' });
  hours.forEach((h) => phase.observe(h));

  let queued = false;
  function tick() {
    queued = false;
    const mid = innerHeight * 0.5;
    const tops = hours.map((h) => h.getBoundingClientRect().top);
    let t = mins[0];
    for (let i = 0; i < hours.length; i++) {
      if (tops[i] <= mid) {
        const next = i + 1 < hours.length ? tops[i + 1] : tops[i] + hours[i].offsetHeight;
        const f = Math.max(0, Math.min(1, (mid - tops[i]) / Math.max(1, next - tops[i])));
        t = mins[i] + f * ((i + 1 < mins.length ? mins[i + 1] : mins[i] + 60) - mins[i]);
      }
    }
    t = Math.min(t, mins[mins.length - 1] + 59);
    const h = Math.floor(t / 60), m = Math.floor(t % 60);
    hh.setAttribute('transform', `rotate(${(h % 12) * 30 + m * 0.5} 100 100)`);
    mm.setAttribute('transform', `rotate(${m * 6} 100 100)`);
    const m5 = Math.floor(m / 5) * 5;
    out.textContent = `${String(h).padStart(2, '0')}:${String(m5).padStart(2, '0')}`;
  }
  const q = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  addEventListener('scroll', q, { passive: true });
  addEventListener('resize', q);
  tick();
}

try { start(); } catch (err) { console.warn('day: the dial stays at 07:00', err); }
