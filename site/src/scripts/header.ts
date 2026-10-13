/** Header behaviour: scrolled state, theme toggle, accessible mobile menu. */

const header = document.querySelector<HTMLElement>('[data-header]');

// --- scrolled state ---------------------------------------------------------------
if (header) {
  let ticking = false;
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    ticking = false;
  };
  update();
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
}

// --- theme --------------------------------------------------------------------------
const themeBtn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const syncThemeLabel = () => {
  if (!themeBtn) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  const label = dark ? themeBtn.dataset.labelLight : themeBtn.dataset.labelDark;
  if (label) {
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
  }
};
syncThemeLabel();
themeBtn?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('mx-theme', next);
  } catch {
    /* storage unavailable (private mode) — theme still applies for this page */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#12110C' : '#1F3D2A');
  syncThemeLabel();
});

// --- mobile menu -----------------------------------------------------------------------
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');

function setMenu(open: boolean, returnFocus = false) {
  if (!toggle || !menu || !header) return;
  menu.hidden = !open;
  header.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  const label = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
  if (label) toggle.setAttribute('aria-label', label);
  if (open) menu.querySelector<HTMLElement>('a')?.focus();
  else if (returnFocus) toggle.focus();
}

toggle?.addEventListener('click', () => setMenu(menu?.hidden ?? true));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false, true);
});
window.matchMedia('(min-width: 1200px)').addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});

export {};
