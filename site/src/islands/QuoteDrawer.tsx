/** Quick-inquiry drawer (ported from the design's drawer + drSend/drFull logic). */
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { packKg } from '@/lib/catalog-shared';
import { isPhone } from '@/lib/lead/validate';
import { fallbackRef, submitLead } from '@/lib/lead/submit';
import { $drawerOpen, $quoteItems, closeQuote, savePrefill, setQuoteItem } from '@/stores/quote';
import { useFocusTrap } from './useFocusTrap';
import './QuoteDrawer.css';

interface Product {
  id: string;
  name: string;
  short: string;
  packs: string[];
  img: string;
}
interface Copy {
  products: string;
  pickOne: string;
  total: string;
  eyebrow: string;
  title: string;
  sub: string;
  name: string;
  company: string;
  phone: string;
  product: string;
  pack: string;
  qty: string;
  send: string;
  full: string;
  req: string;
  phoneErr: string;
  okT: string;
  okB: string;
  ref: string;
  close: string;
  bags: string;
  wa: string;
  contactHref: string;
  waHref: string;
  leadFailed: string;
}

export default function QuoteDrawer({ locale, products, copy: U }: { locale: 'en' | 'ar'; products: Product[]; copy: Copy }) {
  const open = useStore($drawerOpen);
  const items = useStore($quoteItems);
  const [form, setForm] = useState({ name: '', company: '', phone: '', hp: '' });
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(Date.now());
  const panel = useRef<HTMLElement>(null);

  useFocusTrap(panel, open, closeQuote);

  useEffect(() => {
    if (open) {
      setSent(null);
      setTouched(false);
      startedAt.current = Date.now();
    }
  }, [open]);

  if (!open) return null;

  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
  const ids = products.map((p) => p.id).filter((id) => items[id]);
  let kg = 0;
  let bags = 0;
  const lines = ids.map((id) => {
    const p = products.find((x) => x.id === id)!;
    const it = items[id]!;
    const pi = Math.min(it.packIdx || 0, p.packs.length - 1);
    const q = parseFloat(String(it.qty).replace(/[^\d.]/g, '')) || 0;
    kg += q * packKg(p.packs[pi]!);
    bags += q;
    return { p, pack: p.packs[pi]!, qty: it.qty, text: `${p.short} · ${p.packs[pi]}${q ? ` × ${fmt(q)} ${U.bags}` : ''}` };
  });
  const errName = touched && !form.name.trim() ? U.req : '';
  const errPhone = touched ? (!form.phone.trim() ? U.req : !isPhone(form.phone) ? U.phoneErr : '') : '';
  const errItems = touched && !ids.length ? U.pickOne : '';
  const summary = bags ? `${fmt(bags)} ${U.bags} · ${fmt(kg)} kg` : `${ids.length} × ${U.product}`;
  const wa = `${U.waHref}${U.waHref.includes('?') ? '&' : '?'}text=${encodeURIComponent(U.wa + lines.map((l) => l.text).join('; '))}`;

  async function send() {
    if (!form.name.trim() || !isPhone(form.phone) || !ids.length) {
      setTouched(true);
      return;
    }
    setBusy(true);
    try {
      const res = await submitLead(
        'quick-quote',
        { name: form.name, company: form.company, phone: form.phone, items: lines.map((l) => l.text), lang: locale },
        null,
        { honeypot: form.hp, startedAt: startedAt.current },
      );
      setSent(res.ref ?? fallbackRef('MX-Q'));
    } catch {
      alert(U.leadFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="qd" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div class="qd__scrim" onClick={closeQuote} aria-hidden="true" />
      <aside ref={panel} class="qd__panel" role="dialog" aria-modal="true" aria-labelledby="qd-title">
        <div class="qd__head">
          <div>
            <div class="kicker">
              <span class="dia" aria-hidden="true" />
              <span class="kicker__text">{U.eyebrow}</span>
            </div>
            <h2 id="qd-title" class="qd__title">
              {U.title}
            </h2>
            <p class="qd__sub">{U.sub}</p>
          </div>
          <button type="button" class="qd__x" onClick={closeQuote} aria-label={U.close}>
            ×
          </button>
        </div>

        <div class="qd__body">
          {sent ? (
            <div class="qd__ok" role="status">
              <span class="qd__stamp" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 38 38" fill="none">
                  <path d="M9 20 L16 27 L29 12" stroke="#E9D9A8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <h3>{U.okT}</h3>
              <p>{U.okB}</p>
              <span class="qd__ref">
                <span class="label">{U.ref}</span>
                <span dir="ltr" class="mono">
                  {sent}
                </span>
              </span>
            </div>
          ) : (
            <form
              class="qd__form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              id="qd-form"
            >
              <label class="field">
                <span class="field__label">{U.name} *</span>
                <input
                  class="input"
                  autocomplete="name"
                  value={form.name}
                  aria-invalid={!!errName}
                  aria-describedby={errName ? 'qd-e-name' : undefined}
                  onInput={(e) => setForm({ ...form, name: e.currentTarget.value })}
                />
                {errName && (
                  <span class="field__error" id="qd-e-name">
                    {errName}
                  </span>
                )}
              </label>
              <label class="field">
                <span class="field__label">{U.company}</span>
                <input
                  class="input"
                  autocomplete="organization"
                  value={form.company}
                  onInput={(e) => setForm({ ...form, company: e.currentTarget.value })}
                />
              </label>
              <label class="field">
                <span class="field__label">{U.phone} *</span>
                <input
                  class="input input--mono"
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  autocomplete="tel"
                  placeholder="+966 5X XXX XXXX"
                  value={form.phone}
                  aria-invalid={!!errPhone}
                  aria-describedby={errPhone ? 'qd-e-phone' : undefined}
                  onInput={(e) => setForm({ ...form, phone: e.currentTarget.value })}
                />
                {errPhone && (
                  <span class="field__error" id="qd-e-phone">
                    {errPhone}
                  </span>
                )}
              </label>
              {/* Honeypot: hidden from people, tempting for bots. */}
              <input
                class="qd__hp"
                tabIndex={-1}
                autocomplete="off"
                aria-hidden="true"
                name="company_website"
                value={form.hp}
                onInput={(e) => setForm({ ...form, hp: e.currentTarget.value })}
              />

              <fieldset class="qd__products">
                <legend class="field__label">{U.products} *</legend>
                {products.map((p) => {
                  const on = !!items[p.id];
                  const it = items[p.id];
                  return (
                    <div class={`qd__card${on ? ' is-on' : ''}`} data-product={p.id} key={p.id}>
                      <button type="button" class="qd__pick" aria-pressed={on} onClick={() => setQuoteItem(p.id, on ? null : {})}>
                        <span class="qd__check" aria-hidden="true" />
                        <img src={p.img} alt="" width={36} height={42} loading="lazy" />
                        <span class="qd__pname">{p.name}</span>
                      </button>
                      {on && (
                        <div class="qd__opts">
                          <label class="field">
                            <span class="label">{U.pack}</span>
                            <select
                              class="input qd__small"
                              dir="ltr"
                              value={String(Math.min(it!.packIdx, p.packs.length - 1))}
                              onChange={(e) => setQuoteItem(p.id, { packIdx: parseInt(e.currentTarget.value, 10) || 0 })}
                            >
                              {p.packs.map((x, i) => (
                                <option value={String(i)}>{x}</option>
                              ))}
                            </select>
                          </label>
                          <label class="field">
                            <span class="label">{U.qty}</span>
                            <input
                              class="input input--mono qd__small"
                              type="number"
                              min="1"
                              dir="ltr"
                              inputMode="numeric"
                              value={it!.qty}
                              onInput={(e) => setQuoteItem(p.id, { qty: e.currentTarget.value })}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
                {errItems && <span class="field__error">{errItems}</span>}
              </fieldset>

              {ids.length > 0 && (
                <div class="qd__summary">
                  {lines.map((l) => (
                    <span dir="ltr">{l.text}</span>
                  ))}
                  <strong>
                    {U.total}: <span dir="ltr">{summary}</span>
                  </strong>
                </div>
              )}
              <div class="sr-only" aria-live="polite">
                {[errName, errPhone, errItems].filter(Boolean).join('. ')}
              </div>
            </form>
          )}
        </div>

        <div class="qd__foot">
          {sent ? (
            <button type="button" class="btn btn--primary btn--block" onClick={closeQuote}>
              {U.close}
            </button>
          ) : (
            <>
              <div class="qd__row">
                <button type="submit" form="qd-form" class="btn btn--amber qd__send" disabled={busy}>
                  {busy && <span class="qd__spin" aria-hidden="true" />}
                  {U.send}
                </button>
                <a href={wa} target="_blank" rel="noopener" aria-label="WhatsApp" class="qd__wa" data-track="whatsapp_click">
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
              </div>
              <a
                href={U.contactHref}
                class="qd__full"
                onClick={() => {
                  savePrefill({ name: form.name, company: form.company, phone: form.phone });
                  closeQuote();
                }}
              >
                {U.full}
              </a>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
