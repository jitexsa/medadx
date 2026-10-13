/** Pure helpers safe to import in client islands (no astro:content). */

/** "Farah – Golden Sella Basmati" → "Farah" (same rule as the source design). */
export const shortName = (name: string) => name.split('–')[0]!.split(' - ')[0]!.split('-')[0]!.trim();

/** Pack label → kilograms ("40 kg", "1 كجم" → 40, 1). */
export const packKg = (label: string) => parseFloat(String(label).replace(/[^\d.]/g, '')) || 0;

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
