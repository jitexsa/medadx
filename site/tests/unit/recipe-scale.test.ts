// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

describe('servings scaler', async () => {
  const { scaleLine, fmtQty, parseVal } = await import('../../src/scripts/recipe-tools');
  it('parses unicode fractions', () => {
    expect(parseVal('2½')).toBe(2.5);
    expect(parseVal('¾')).toBe(0.75);
  });
  it('formats to kitchen fractions', () => {
    expect(fmtQty(1.5)).toBe('1½');
    expect(fmtQty(0.33)).toBe('⅓');
    expect(fmtQty(12.4)).toBe('12');
  });
  it('scales the leading quantity only', () => {
    expect(scaleLine('500 g (2½ cups) basmati', 2)).toBe('1000 g (2½ cups) basmati');
    expect(scaleLine('2–3 green chillies', 2)).toBe('4–6 green chillies');
    expect(scaleLine('Salt to taste', 2)).toBe('Salt to taste');
  });
});
