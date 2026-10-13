import { describe, expect, it } from 'vitest';
import { checkFiles, isEmail, isPhone, looksLikeBot, MIN_FILL_MS } from '../../src/lib/lead/validate';

const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

describe('lead validation', () => {
  it('emails', () => {
    expect(isEmail('buyer@hotel.sa')).toBe(true);
    expect(isEmail('nope@x')).toBe(false);
  });
  it('phones', () => {
    expect(isPhone('+966 59 127 8526')).toBe(true);
    expect(isPhone('0591278526')).toBe(true);
    expect(isPhone('12')).toBe(false);
    expect(isPhone('abc-def-ghi')).toBe(false);
  });
  it('files', () => {
    expect(checkFiles([file('licence.pdf', 'application/pdf', 1000)]).ok).toBe(true);
    expect(checkFiles([file('x.exe', 'application/x-msdownload', 10)])).toEqual({ ok: false, reason: 'type' });
    expect(checkFiles([file('big.pdf', 'application/pdf', 5 * 1024 * 1024)])).toEqual({ ok: false, reason: 'size' });
    expect(checkFiles(Array.from({ length: 4 }, (_, i) => file(`${i}.png`, 'image/png', 10)))).toEqual({ ok: false, reason: 'count' });
  });
  it('honeypot and fill time', () => {
    const now = 1_000_000;
    expect(looksLikeBot('', now - MIN_FILL_MS - 1, now)).toBe(false);
    expect(looksLikeBot('http://spam', now - 60_000, now)).toBe(true);
    expect(looksLikeBot('', now - 500, now)).toBe(true);
  });
});
