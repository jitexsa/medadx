/** Order-estimator selection (home buyer tools + sticky bar). Default mirrors the design. */
import { map } from 'nanostores';

export interface EstItem {
  packIdx: number;
  qty: number;
}
const KEY = 'mx-estimator';
const initial = (): Record<string, EstItem> => {
  if (typeof window === 'undefined') return { farah: { packIdx: 0, qty: 200 } };
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') ?? { farah: { packIdx: 0, qty: 200 } };
  } catch {
    return { farah: { packIdx: 0, qty: 200 } };
  }
};
export const $est = map<Record<string, EstItem>>(initial());
if (typeof window !== 'undefined') {
  $est.listen((v) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  });
}
export const clampQty = (v: number) => Math.max(1, Math.min(99999, Math.round(v) || 1));
export function setEst(id: string, patch: Partial<EstItem> | null) {
  const next = { ...$est.get() };
  if (patch === null) delete next[id];
  else next[id] = Object.assign({ packIdx: 0, qty: 100 }, next[id], patch);
  $est.set(next);
}
