/**
 * Home "Buyer tools": order estimator, compare, rice finder, optional raw-vs-cooked slider,
 * plus the sticky selection bar. Ported from uxVals() in the design.
 */
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { fmtInt, packKg } from '@/lib/catalog-shared';
import { $est, clampQty, setEst } from '@/stores/estimator';
import { $drawerOpen, openQuote } from '@/stores/quote';
import { useCssVar } from './useCssVar';
import './BuyerTools.css';

export interface ToolProduct {
  id: string;
  name: string;
  short: string;
  type: string;
  grain: string;
  aroma: string;
  use: string;
  packs: string[];
  bag: string;
  /** pack index → pack-specific bag image */
  packBags: Record<string, string>;
  href: string;
}

interface Copy {
  tools: { label: string; title: string; tabs: string[] };
  est: Record<string, string>;
  cmp: { pick: string; note: string; packs: string };
  find: {
    qs: string[];
    opts: string[][];
    result: string;
    packL: string;
    quote: string;
    tryEst: string;
    empty: string;
    why: Record<string, string>;
  };
  cook: { title: string; sub: string; raw: string; cooked: string };
  sticky: { sel: string; quote: string };
  bags: string;
  labels: { type: string; grain: string; aroma: string; use: string };
  waHref: string;
  viewProduct: string;
}

type Tab = 'est' | 'cmp' | 'find' | 'cook';

export default function BuyerTools({
  products,
  copy: U,
  cook,
  locale,
}: {
  products: ToolProduct[];
  copy: Copy;
  cook?: { raw: string; cooked: string; rawAlt: string; cookedAlt: string };
  locale: 'en' | 'ar';
}) {
  const tabs: Tab[] = cook ? ['est', 'cmp', 'find', 'cook'] : ['est', 'cmp', 'find'];
  const [tab, setTab] = useState<Tab>('est');
  const est = useStore($est);
  const byId = (id: string) => products.find((p) => p.id === id)!;
  const bagFor = (p: ToolProduct, pi: number) => p.packBags[String(pi)] ?? p.bag;

  // --- estimator ---------------------------------------------------------------------
  const estIds = products.map((p) => p.id).filter((id) => est[id]);
  let kg = 0;
  const rows = estIds.map((id) => {
    const p = byId(id);
    const it = est[id]!;
    const pi = Math.min(it.packIdx || 0, p.packs.length - 1);
    const rkg = packKg(p.packs[pi]!) * (it.qty || 0);
    kg += rkg;
    return { p, it, pi, rkg, img: bagFor(p, pi) };
  });
  const fill = kg / 25000;
  const contLabel =
    fill <= 1
      ? U.est.one!.replace('{0}', String(Math.max(kg > 0 ? 1 : 0, Math.round(fill * 100))))
      : U.est.multi!.replace('{0}', fill.toFixed(1));
  const quoteFromEst = () => {
    const o: Record<string, { packIdx: number; qty: string }> = {};
    rows.forEach((r) => (o[r.p.id] = { packIdx: r.pi, qty: String(r.it.qty || '') }));
    openQuote(o, rows.length > 0);
  };
  const fillRef = useRef<HTMLDivElement>(null);
  useCssVar(fillRef, 'width', `${Math.min(100, fill * 100).toFixed(1)}%`);

  // --- compare -----------------------------------------------------------------------------
  const [cmpSel, setCmpSel] = useState<string[]>(products.map((p) => p.id));
  const sel = products.filter((p) => cmpSel.includes(p.id));
  const toggleCmp = (id: string) => {
    const a = cmpSel.slice();
    const i = a.indexOf(id);
    if (i >= 0) {
      if (a.length > 2) a.splice(i, 1);
    } else a.push(id);
    setCmpSel(products.map((p) => p.id).filter((x) => a.includes(x)));
  };
  const cmpRows = [
    { k: U.labels.type, f: (p: ToolProduct) => p.type },
    { k: U.labels.grain, f: (p: ToolProduct) => p.grain },
    { k: U.labels.aroma, f: (p: ToolProduct) => p.aroma },
    { k: U.labels.use, f: (p: ToolProduct) => p.use },
    { k: U.cmp.packs, f: (p: ToolProduct) => p.packs.join(' · ') },
  ];

  // --- finder --------------------------------------------------------------------------------
  const [fd, setFd] = useState<number[]>([-1, -1, -1]);
  const fdDone = fd.every((v) => v >= 0);
  const recId = ['farah', 'farah', 'khayber', 'dhoqan'][fd[1]!] ?? 'farah';
  const rp = byId(recId) ?? products[0]!;
  const recPackIdx = Math.min([2, 1, 0][fd[2]!] ?? 0, rp.packs.length - 1);

  // --- cook slider -------------------------------------------------------------------------
  const [cookPos, setCookPos] = useState(50);
  const cookRef = useRef<HTMLDivElement>(null);
  useCssVar(cookRef, '--pos', `${cookPos}%`);

  // --- sticky bar ----------------------------------------------------------------------------
  const drawerOpen = useStore($drawerOpen);
  const [stickyOn, setStickyOn] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setStickyOn(window.scrollY > window.innerHeight * 0.9);
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const stickyVisible = stickyOn && !drawerOpen;
  useEffect(() => {
    document.body.classList.toggle('has-sticky', stickyVisible);
  }, [stickyVisible]);

  const tabId = (k: Tab) => `bt-tab-${k}`;
  const panelId = (k: Tab) => `bt-panel-${k}`;
  const onTabKey = (e: KeyboardEvent) => {
    const i = tabs.indexOf(tab);
    const dirMul = locale === 'ar' ? -1 : 1;
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + dirMul + tabs.length) % tabs.length;
    if (e.key === 'ArrowLeft') n = (i - dirMul + tabs.length) % tabs.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = tabs.length - 1;
    if (n >= 0) {
      e.preventDefault();
      setTab(tabs[n]!);
      document.getElementById(tabId(tabs[n]!))?.focus();
    }
  };

  return (
    <div class="bt">
      <div class="bt__head">
        <div>
          <div class="kicker">
            <span class="dia" aria-hidden="true" />
            <span class="kicker__text">{U.tools.label}</span>
          </div>
          <h3 class="bt__title">{U.tools.title}</h3>
        </div>
        <div class="bt__tabs" role="tablist" aria-label={U.tools.title} onKeyDown={onTabKey}>
          {tabs.map((k) => (
            <button
              type="button"
              role="tab"
              id={tabId(k)}
              aria-controls={panelId(k)}
              aria-selected={tab === k}
              tabIndex={tab === k ? 0 : -1}
              class="bt__tab"
              onClick={() => setTab(k)}
            >
              {U.tools.tabs[['est', 'cmp', 'find', 'cook'].indexOf(k)]}
            </button>
          ))}
        </div>
      </div>

      {/* Estimator */}
      <div class="bt__panel bt__grid" role="tabpanel" id={panelId('est')} aria-labelledby={tabId('est')} hidden={tab !== 'est'}>
        <div class="bt__col">
          <div class="bt__group">
            <span class="label">{U.est.prodMulti}</span>
            <div class="pill-row">
              {products.map((p) => {
                const on = !!est[p.id];
                return (
                  <button type="button" class="chip" data-product={p.id} aria-pressed={on} onClick={() => setEst(p.id, on ? null : {})}>
                    {on ? '✓ ' : '+ '}
                    {p.short}
                  </button>
                );
              })}
            </div>
          </div>
          {rows.map(({ p, it, pi, rkg }) => (
            <div class="bt__row" data-product={p.id} key={p.id}>
              <div class="bt__row-top">
                <span class="dot" aria-hidden="true" />
                <span class="bt__row-name">{p.short}</span>
                <span dir="ltr" class="bt__row-kg mono">
                  {fmtInt(rkg)} kg
                </span>
                <button
                  type="button"
                  class="bt__x"
                  aria-label={`${U.est.remove} ${p.short}`}
                  title={U.est.remove}
                  onClick={() => setEst(p.id, null)}
                >
                  ×
                </button>
              </div>
              <div class="bt__row-ctrl">
                <div dir="ltr" class="pill-row bt__packs" role="group" aria-label={U.est.pack}>
                  {p.packs.map((x, i) => (
                    <button type="button" class="chip chip--xs" aria-pressed={i === pi} onClick={() => setEst(p.id, { packIdx: i })}>
                      {x}
                    </button>
                  ))}
                </div>
                <div dir="ltr" class="bt__qty">
                  <button
                    type="button"
                    class="bt__step"
                    aria-label="−10"
                    onClick={() => setEst(p.id, { qty: clampQty((it.qty || 0) - 10) })}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    class="input input--mono bt__qty-in"
                    value={it.qty}
                    aria-label={`${U.est.qty} — ${p.short}`}
                    onChange={(e) => setEst(p.id, { qty: clampQty(parseFloat(e.currentTarget.value)) })}
                  />
                  <button
                    type="button"
                    class="bt__step"
                    aria-label="+10"
                    onClick={() => setEst(p.id, { qty: clampQty((it.qty || 0) + 10) })}
                  >
                    +
                  </button>
                  <span class="bt__unit">{U.bags}</span>
                </div>
              </div>
            </div>
          ))}
          {!rows.length && <div class="bt__empty">{U.est.empty}</div>}
        </div>
        <div class="bt__total">
          <div class="bt__total-glow" aria-hidden="true" />
          <div class="bt__total-bags" aria-hidden="true">
            {rows.slice(0, 3).map((r) => (
              <img src={r.img} alt="" width={120} height={150} />
            ))}
          </div>
          <div class="bt__total-num">
            <span class="label bt__light">{U.est.total}</span>
            <span dir="ltr" class="bt__kg" aria-live="polite">
              {fmtInt(kg)} kg
            </span>
            <span dir="ltr" class="bt__mt mono">
              {(kg / 1000).toFixed(1)} MT
            </span>
          </div>
          <div class="bt__cont">
            <div class="bt__cont-top">
              <span>{U.est.cont}</span>
              <span class="mono">{contLabel}</span>
            </div>
            <div
              class="bt__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round(fill * 100))}
              aria-label={U.est.cont}
            >
              <div class="bt__bar-fill" ref={fillRef} />
            </div>
            <span class="bt__note">{U.est.note}</span>
          </div>
          <button type="button" class="btn btn--gold bt__cta" onClick={quoteFromEst}>
            {U.est.cta}{' '}
            <span aria-hidden="true" class="flip-x">
              →
            </span>
          </button>
        </div>
      </div>

      {/* Compare */}
      <div class="bt__panel" role="tabpanel" id={panelId('cmp')} aria-labelledby={tabId('cmp')} hidden={tab !== 'cmp'}>
        <div class="bt__cmp-pick">
          <span class="label">{U.cmp.pick}</span>
          <div class="pill-row">
            {products.map((p) => (
              <button type="button" class="chip" data-product={p.id} aria-pressed={cmpSel.includes(p.id)} onClick={() => toggleCmp(p.id)}>
                {p.short}
              </button>
            ))}
          </div>
        </div>
        <div class="bt__table-wrap no-scrollbar">
          <table class={`bt__table cols-${sel.length}`}>
            <thead>
              <tr>
                <td />
                {sel.map((p) => (
                  <th scope="col" data-product={p.id}>
                    <img src={p.bag} alt="" width={70} height={96} />
                    <a href={p.href} class="bt__th-name">
                      <span class="dot" aria-hidden="true" />
                      {p.short}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cmpRows.map((r) => (
                <tr>
                  <th scope="row">
                    <span class="label">{r.k}</span>
                  </th>
                  {sel.map((p) => (
                    <td>{r.f(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span class="bt__small">{U.cmp.note}</span>
      </div>

      {/* Finder */}
      <div class="bt__panel bt__grid" role="tabpanel" id={panelId('find')} aria-labelledby={tabId('find')} hidden={tab !== 'find'}>
        <div class="bt__col bt__find-qs">
          {U.find.qs.map((q, gi) => (
            <fieldset class="bt__fq">
              <legend class="bt__fq-q">
                <span class={`bt__num${fd[gi]! >= 0 ? ' is-done' : ''}`}>0{gi + 1}</span>
                {q}
              </legend>
              <div class="pill-row">
                {U.find.opts[gi]!.map((o, oi) => (
                  <button
                    type="button"
                    class="chip"
                    aria-pressed={fd[gi] === oi}
                    onClick={() => {
                      const a = fd.slice();
                      a[gi] = oi;
                      setFd(a);
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div class={`bt__result${fdDone ? ' is-done' : ''}`} aria-live="polite">
          {!fdDone ? (
            <div class="bt__result-empty">
              <span class="dia dia--lg bt__pulse" aria-hidden="true" />
              <span>{U.find.empty}</span>
            </div>
          ) : (
            <>
              <div class="bt__rec">
                <img src={rp.bag} alt={rp.name} width={140} height={190} />
                <div class="bt__rec-copy">
                  <span class="label bt__gold">{U.find.result}</span>
                  <a href={rp.href} class="bt__rec-name">
                    {rp.name}
                  </a>
                  <span class="bt__rec-why">{U.find.why[rp.id]}</span>
                  <span class="bt__rec-pack">
                    {U.find.packL} · <span dir="ltr">{rp.packs[recPackIdx]}</span>
                  </span>
                </div>
              </div>
              <div class="pill-row">
                <button type="button" class="btn btn--primary btn--sm" onClick={() => openQuote({ [rp.id]: { packIdx: recPackIdx } })}>
                  {U.find.quote}
                </button>
                <button
                  type="button"
                  class="btn btn--outline btn--sm"
                  onClick={() => {
                    setEst(rp.id, { packIdx: recPackIdx });
                    setTab('est');
                  }}
                >
                  {U.find.tryEst}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Raw vs cooked (only when photos are configured) */}
      {cook && (
        <div class="bt__panel" role="tabpanel" id={panelId('cook')} aria-labelledby={tabId('cook')} hidden={tab !== 'cook'}>
          <span class="bt__small">{U.cook.sub}</span>
          <div class="bt__cook" dir="ltr" ref={cookRef}>
            <img src={cook.cooked} alt={cook.cookedAlt} class="bt__cook-img" />
            <div class="bt__cook-raw">
              <img src={cook.raw} alt={cook.rawAlt} class="bt__cook-img" />
            </div>
            <div class="bt__cook-handle" aria-hidden="true">
              <span>↔</span>
            </div>
            <span class="bt__cook-tag raw">{U.cook.raw}</span>
            <span class="bt__cook-tag cooked">{U.cook.cooked}</span>
          </div>
          <input
            dir="ltr"
            type="range"
            min="0"
            max="100"
            value={cookPos}
            class="bt__range"
            aria-label={U.cook.title}
            onInput={(e) => setCookPos(parseFloat(e.currentTarget.value) || 0)}
          />
        </div>
      )}

      {/* Sticky selection bar */}
      <div class={`bt-sticky${stickyVisible ? ' is-on' : ''}`} aria-hidden={!stickyVisible} inert={!stickyVisible}>
        <div class="bt-sticky__in">
          <img src={rows[0]?.img ?? products[0]!.bag} alt="" width={36} height={44} />
          <div class="bt-sticky__txt">
            <span class="label">{U.sticky.sel}</span>
            <span class="bt-sticky__name">
              {rows.length ? rows.map((r) => r.p.short).join(', ') : U.est.none} · <span dir="ltr">{fmtInt(kg)} kg</span>
            </span>
          </div>
          <a href={U.waHref} target="_blank" rel="noopener" aria-label="WhatsApp" class="bt-sticky__wa" data-track="whatsapp_click">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4 C7.6 4 4 7.4 4 11.6 C4 13.3 4.6 14.9 5.6 16.2 L4.8 19.5 L8.3 18.7 C9.4 19.3 10.7 19.6 12 19.6 C16.4 19.6 20 16.2 20 12 C20 7.4 16.4 4 12 4 Z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                d="M9.4 9.7 C9.4 9.7 9.9 9.2 10.3 9.6 L11.1 10.6 C11.4 10.9 11.2 11.3 10.9 11.6 C10.9 11.6 11 12.3 11.9 13.1 C12.8 13.9 13.4 14 13.4 14 C13.7 13.7 14.2 13.5 14.5 13.8 L15.4 14.7 C15.8 15.1 15.3 15.6 15.3 15.6 C14.6 16.3 13.3 16.4 11.5 14.9 C9.7 13.4 9 11.5 9.4 9.7 Z"
                fill="currentColor"
              />
            </svg>
          </a>
          <button type="button" class="bt-sticky__btn" onClick={quoteFromEst}>
            {U.sticky.quote}
          </button>
        </div>
      </div>
    </div>
  );
}
