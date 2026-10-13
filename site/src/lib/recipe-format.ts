/** Display helpers ported from recipes.html. */
export const shortTime = (t: string) =>
  String(t || '')
    .split('(')[0]!
    .replace(/minutes?/i, 'min')
    .replace(/hours?/i, 'hr')
    .trim();

export function riceType(rice: string) {
  const s = rice.toLowerCase();
  if (s.includes('basmati')) return 'Basmati';
  if (s.includes('short') || s.includes('medium')) return 'Short-grain';
  if (s.includes('sona masoori')) return 'Sona masoori';
  if (s.includes('jeerakasala') || s.includes('kaima')) return 'Jeerakasala';
  if (s.includes('long')) return 'Long-grain';
  return rice;
}

export const regionSlug = (region: string) => (region === 'Saudi' ? 'saudi' : 'indian-pakistani');
export const diffSlug = (d: string) => d.toLowerCase();
