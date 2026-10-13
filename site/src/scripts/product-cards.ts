/** Product cards: pack-size chips (swap to the pack photo when one exists) and hover zoom. */
document.querySelectorAll<HTMLElement>('[data-pcard]').forEach((card) => {
  const chips = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-pack]'));
  const cta = card.querySelector<HTMLElement>('[data-quote-add]');
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      const i = chip.dataset.pack!;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      const media = Array.from(card.querySelectorAll<HTMLElement>('[data-pack-media]'));
      const hasPackImg = media.some((m) => m.dataset.packMedia === i);
      media.forEach((m) => {
        m.hidden = m.dataset.packMedia === 'life' ? hasPackImg && !card.hasAttribute('data-keep-life') : m.dataset.packMedia !== i;
      });
      cta?.setAttribute('data-pack-idx', i);
    }),
  );
  const zoom = card.querySelector<HTMLElement>('[data-zoom]');
  zoom?.addEventListener('mousemove', (e) => {
    const r = zoom.getBoundingClientRect();
    zoom.style.transformOrigin = `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`;
  });
  zoom?.addEventListener('mouseleave', () => (zoom.style.transformOrigin = '50% 50%'));
});

export {};
