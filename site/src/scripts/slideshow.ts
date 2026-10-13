/** Cross-fade slideshow ([data-slideshow]) with dots + pause button; 7s interval (About hero). */
document.querySelectorAll<HTMLElement>('[data-slideshow]').forEach((root) => {
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-slide-dot]'));
  const pause = root.querySelector<HTMLButtonElement>('[data-slide-pause]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  let hover = false;
  let paused = reduce;
  let timer = 0;
  const show = (n: number) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => {
      s.classList.toggle('is-active', k === i);
      s.setAttribute('aria-hidden', String(k !== i));
    });
    dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  };
  const restart = () => {
    window.clearInterval(timer);
    if (!reduce) timer = window.setInterval(() => !hover && !paused && !document.hidden && show(i + 1), 7000);
  };
  dots.forEach((d, k) =>
    d.addEventListener('click', () => {
      show(k);
      restart();
    }),
  );
  root.addEventListener('mouseenter', () => (hover = true));
  root.addEventListener('mouseleave', () => (hover = false));
  root.addEventListener('focusin', () => (hover = true));
  root.addEventListener('focusout', () => (hover = false));
  pause?.addEventListener('click', () => {
    paused = !paused;
    pause.classList.toggle('is-paused', paused);
    const l = paused ? pause.dataset.labelPlay : pause.dataset.labelPause;
    if (l) pause.setAttribute('aria-label', l);
  });
  if (reduce) pause?.classList.add('is-paused');
  show(0);
  restart();
});

export {};
