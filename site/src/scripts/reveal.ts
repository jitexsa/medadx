/** Scroll reveal + count-up (ported from the design's armObservers/animateCount). */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));

function countUp(el: HTMLElement) {
  const raw = el.dataset.count ?? '0';
  const to = parseFloat(raw) || 0;
  const suf = el.dataset.countSuf ?? '';
  const dec = (raw.split('.')[1] ?? '').length;
  if (reduce) return;
  const t0 = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / 1500);
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (reduce || !('IntersectionObserver' in window)) {
  els.forEach((el) => el.classList.add('is-in', 'is-instant'));
} else {
  const vh = window.innerHeight;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const el = e.target as HTMLElement;
        if (el.hasAttribute('data-count')) countUp(el);
        else el.classList.add('is-in');
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -7% 0px' },
  );
  for (const el of els) {
    const r = el.getBoundingClientRect();
    // Already on screen at load: show without animating (no flash of hidden content).
    if (r.top < vh * 0.94 && r.bottom > 0) el.classList.add('is-in', 'is-instant');
    else io.observe(el);
  }
  counters.forEach((el) => io.observe(el));
  // Safety net (as in the source): reveal anything on screen the observer missed.
  setTimeout(() => {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
    }
  }, 1200);
}

export {};
