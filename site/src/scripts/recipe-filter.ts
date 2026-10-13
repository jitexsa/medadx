/** Recipe index search + filters. Filters the server-rendered cards; state mirrors to ?q=&region=&course=&diff=. */
const q = document.querySelector<HTMLInputElement>('[data-rx-q]');
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-recipe]'));
const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-rx-filter]'));
const count = document.querySelector<HTMLElement>('[data-rx-count]');
const empty = document.querySelector<HTMLElement>('[data-rx-empty]');
const toggle = document.querySelector<HTMLButtonElement>('[data-rx-toggle]');
const panel = document.querySelector<HTMLElement>('[data-rx-filters]');
const dot = document.querySelector<HTMLElement>('[data-rx-dot]');
const clears = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-rx-clear]'));
const total = cards.length;

type Key = 'region' | 'course' | 'diff';
const state: Record<Key, string> & { q: string } = { q: '', region: '', course: '', diff: '' };
const params = new URLSearchParams(location.search);
(['q', 'region', 'course', 'diff'] as const).forEach((k) => (state[k] = params.get(k) ?? ''));

function apply() {
  const term = state.q.trim().toLowerCase();
  let shown = 0;
  for (const c of cards) {
    const ok =
      (!state.region || c.dataset.region === state.region) &&
      (!state.course || c.dataset.course === state.course) &&
      (!state.diff || c.dataset.diff === state.diff) &&
      (!term || (c.dataset.hay ?? '').includes(term));
    c.hidden = !ok;
    if (ok) shown++;
  }
  chips.forEach((ch) => ch.setAttribute('aria-pressed', String(state[ch.dataset.rxFilter as Key] === ch.dataset.value)));
  const any = !!(state.q || state.region || state.course || state.diff);
  if (count) count.textContent = shown === total ? `${total} recipes` : `${shown} of ${total}`;
  if (empty) empty.hidden = shown > 0;
  if (dot) dot.hidden = !(state.region || state.course || state.diff);
  clears.forEach((b) => (b.hidden = b.closest('[data-rx-empty]') ? false : !any));
  const p = new URLSearchParams();
  (['q', 'region', 'course', 'diff'] as const).forEach((k) => state[k] && p.set(k, state[k]));
  history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
}

if (q) {
  q.value = state.q;
  q.addEventListener('input', () => {
    state.q = q.value;
    apply();
  });
}
chips.forEach((ch) =>
  ch.addEventListener('click', () => {
    const k = ch.dataset.rxFilter as Key;
    state[k] = state[k] === ch.dataset.value ? '' : ch.dataset.value!;
    apply();
  }),
);
toggle?.addEventListener('click', () => {
  if (!panel) return;
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
});
clears.forEach((b) =>
  b.addEventListener('click', () => {
    state.q = state.region = state.course = state.diff = '';
    if (q) q.value = '';
    apply();
  }),
);
if (state.region || state.course || state.diff) {
  if (panel) panel.hidden = false;
  toggle?.setAttribute('aria-expanded', 'true');
}
apply();

export {};
