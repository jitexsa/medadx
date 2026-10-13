/**
 * Home hero bag carousel (ported from applyHeroSlots / heroAuto* / onHero* in the design).
 * Auto-advances every 3.6s; pauses on hover/focus, when the tab is hidden, via the
 * pause button (WCAG 2.2.2), and never auto-plays with prefers-reduced-motion.
 */
const stage = document.querySelector<HTMLElement>('[data-hero-stage]');
const hero = document.querySelector<HTMLElement>('[data-hero]');

if (stage && hero) {
  const POS = ['front', 'left', 'back', 'right'] as const;
  const PAR: Record<(typeof POS)[number], string> = { front: '1.6', left: '0.8', right: '0.8', back: '0.5' };
  const slots = Array.from(stage.querySelectorAll<HTMLElement>('[data-slot]'));
  const feats = Array.from(stage.querySelectorAll<HTMLElement>('[data-feat]'));
  const dots = Array.from(stage.querySelectorAll<HTMLButtonElement>('[data-dot]'));
  const pauseBtn = stage.querySelector<HTMLButtonElement>('[data-hero-pause]');
  const n = slots.length;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let front = 0;
  let hovering = false;
  let userPaused = reduce;
  let timer = 0;

  const render = () => {
    slots.forEach((s, i) => {
      const pos = POS[(((i - front) % n) + n) % n]!;
      s.dataset.pos = pos;
      const btn = s.querySelector<HTMLElement>('[data-parallax]');
      if (btn) btn.dataset.parallax = PAR[pos];
      btn?.setAttribute('aria-current', pos === 'front' ? 'true' : 'false');
    });
    feats.forEach((f, i) => (f.hidden = i !== front));
    dots.forEach((d, i) => (i === front ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  };

  const go = (i: number) => {
    front = ((i % n) + n) % n;
    render();
    restart();
  };

  const tick = () => {
    if (hovering || userPaused || document.hidden) return;
    front = (front + 1) % n;
    render();
  };
  const restart = () => {
    window.clearInterval(timer);
    if (!reduce) timer = window.setInterval(tick, 3600);
  };

  stage.addEventListener('mouseenter', () => (hovering = true));
  stage.addEventListener('mouseleave', () => (hovering = false));
  stage.addEventListener('focusin', () => (hovering = true));
  stage.addEventListener('focusout', () => (hovering = false));

  // Bag click: bring to front; clicking the front bag advances.
  let dragged = false;
  stage.querySelectorAll<HTMLButtonElement>('[data-bag]').forEach((b) =>
    b.addEventListener('click', () => {
      if (dragged) {
        dragged = false;
        return;
      }
      const i = Number(b.dataset.bag);
      go(i === front ? i + 1 : i);
    }),
  );
  dots.forEach((d) => d.addEventListener('click', () => go(Number(d.dataset.dot))));

  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.classList.toggle('is-paused', userPaused);
    const label = userPaused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause;
    if (label) pauseBtn.setAttribute('aria-label', label);
  });
  if (reduce) pauseBtn?.classList.add('is-paused');

  // Swipe (42px threshold, horizontal only). RTL flips direction.
  let sx = 0;
  let sy = 0;
  let down = false;
  const rtl = document.documentElement.dir === 'rtl';
  stage.addEventListener('pointerdown', (e) => {
    sx = e.clientX;
    sy = e.clientY;
    down = true;
    dragged = false;
  });
  stage.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      dragged = true;
      go(front + (dx < 0 !== rtl ? 1 : -1));
    }
  });

  // Mouse parallax.
  if (!reduce) {
    let raf = 0;
    window.addEventListener(
      'mousemove',
      (e) => {
        const r = hero.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight || raf) return;
        const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
        raf = requestAnimationFrame(() => {
          raf = 0;
          stage.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
            const d = parseFloat(el.dataset.parallax ?? '0');
            el.style.transform = `translate3d(${(-nx * d * 9).toFixed(1)}px,${(-ny * d * 9).toFixed(1)}px,0)`;
          });
        });
      },
      { passive: true },
    );
  }

  render();
  restart();
}

export {};
