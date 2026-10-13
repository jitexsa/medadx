/** "Open Trading Account" application (ported from formVals/submitForm in the design). */
import { useEffect, useRef, useState } from 'preact/hooks';
import { fallbackRef, LEADS_SIMULATED, submitLead } from '@/lib/lead/submit';
import { checkFiles, FILE_RULES, isEmail, isPhone } from '@/lib/lead/validate';
import type { FormProduct } from './QuoteForm';
import './forms.css';

interface Country {
  en: string;
  ar: string;
  dial: string;
}
interface Form {
  company: string;
  bizType: string;
  country: string;
  city: string;
  license: string;
  name: string;
  role: string;
  email: string;
  dial: string;
  phone: string;
  products: string[];
  volume: string;
  markets: string[];
  consent: boolean;
}
const EMPTY: Form = {
  company: '',
  bizType: '',
  country: '',
  city: '',
  license: '',
  name: '',
  role: '',
  email: '',
  dial: '+966',
  phone: '',
  products: [],
  volume: '',
  markets: [],
  consent: false,
};
const DRAFT_KEY = 'mx-trade-draft';
const TTL = 24 * 60 * 60 * 1000;
const REQUIRED: (keyof Form)[] = ['company', 'bizType', 'country', 'city', 'name', 'email', 'phone', 'products', 'volume', 'consent'];

function loadDraft(): Form | null {
  try {
    localStorage.removeItem(DRAFT_KEY); // legacy: the old site kept PII here indefinitely
    const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (raw?.v === 1 && Date.now() - raw.savedAt < TTL) return { ...EMPTY, ...raw.data, consent: false };
  } catch {
    /* ignore */
  }
  return null;
}

export default function TradingWizard({
  locale,
  products,
  copy: T,
  ui: U,
  markets,
  countries,
  dials,
  homeHref,
  productsHref,
}: {
  locale: 'en' | 'ar';
  products: FormProduct[];
  copy: any;
  ui: Record<string, string>;
  markets: string[];
  countries: Country[];
  dials: string[];
  homeHref: string;
  productsHref: string;
}) {
  const ar = locale === 'ar';
  const [f, setF] = useState<Form>(EMPTY);
  const [hp, setHp] = useState('');
  const [files, setFiles] = useState<Record<string, File>>({});
  const [fileErr, setFileErr] = useState('');
  const [dragKey, setDragKey] = useState('');
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [refNo, setRefNo] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [activeOpt, setActiveOpt] = useState(-1);
  const startedAt = useRef(Date.now());
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const d = loadDraft();
    if (d) setF(d);
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || refNo) return;
    try {
      const { consent: _c, ...data } = f;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), data }));
    } catch {
      /* ignore */
    }
  }, [f]);

  const E = T.err;
  const errs: Partial<Record<keyof Form, string>> = {};
  if (!f.company.trim()) errs.company = E.required;
  if (!f.bizType) errs.bizType = E.required;
  if (!f.country.trim()) errs.country = E.required;
  if (!f.city.trim()) errs.city = E.required;
  if (!f.name.trim()) errs.name = E.required;
  if (!f.email.trim()) errs.email = E.required;
  else if (!isEmail(f.email)) errs.email = E.email;
  if (!f.phone.trim()) errs.phone = E.required;
  else if (!isPhone(f.phone)) errs.phone = E.phone;
  if (!f.products.length) errs.products = E.required;
  if (!f.volume) errs.volume = E.required;
  if (!f.consent) errs.consent = E.required;
  const shown = (k: keyof Form) => (touched[k] ? (errs[k] ?? '') : '');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const touch = (k: keyof Form) => setTouched((t) => ({ ...t, [k]: true }));
  const toggle = (k: 'products' | 'markets', v: string) =>
    setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));

  const filled = REQUIRED.filter((k) =>
    k === 'products' ? f.products.length : k === 'consent' ? f.consent : String(f[k] ?? '').trim(),
  ).length;
  const prog = Math.round((filled / REQUIRED.length) * 100);
  useEffect(() => {
    progRef.current?.style.setProperty('width', `${prog}%`);
  }, [prog]);
  const anyFilled =
    ['company', 'city', 'license', 'name', 'role', 'email', 'phone'].some((k) => String(f[k as keyof Form] ?? '').trim()) ||
    !!f.bizType ||
    f.products.length > 0;

  const q = f.country.trim().toLowerCase();
  const list = countries.filter((c) => !q || c.en.toLowerCase().includes(q) || c.ar.includes(f.country.trim()));
  const pickCountry = (c: Country) => {
    setF((x) => ({ ...x, country: ar ? c.ar : c.en, dial: c.dial }));
    setCountryOpen(false);
    setActiveOpt(-1);
  };

  const setFile = (key: string, file: File | undefined | null) => {
    if (!file) return;
    const next = { ...files, [key]: file };
    const c = checkFiles(Object.values(next));
    if (!c.ok) {
      setFileErr(U[`file_${c.reason}`] ?? '');
      return;
    }
    setFileErr('');
    setFiles(next);
    setDragKey('');
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setF(EMPTY);
    setTouched({});
    setFiles({});
  };

  async function submit(e: Event) {
    e.preventDefault();
    if (busy) return;
    if (Object.keys(errs).length) {
      setTouched(Object.fromEntries(REQUIRED.map((k) => [k, true])));
      summaryRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await submitLead(
        'trading-account',
        { ...f, products: f.products.map((id) => products.find((p) => p.id === id)?.short ?? id), lang: locale },
        Object.keys(files).length ? files : null,
        { honeypot: hp, startedAt: startedAt.current },
      );
      setRefNo(res.ref ?? fallbackRef());
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      window.scrollTo(0, 0);
      setTimeout(() => doneRef.current?.focus(), 50);
    } catch {
      alert(U.leadFailed);
    } finally {
      setBusy(false);
    }
  }

  if (refNo) {
    return (
      <div class="tw-done">
        <div class="tw-done__seal" aria-hidden="true">
          <span class="ring" />
          <span class="core">
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <path d="M9 20 L16 27 L29 12" stroke="#E9D9A8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <h2 ref={doneRef} tabIndex={-1} class="tw-done__t">
          {T.successT}
        </h2>
        <p class="tw-done__b">{T.successB}</p>
        <span class="qf-ref">
          <span class="label">{T.refL}</span>
          <span dir="ltr" class="mono">
            {refNo}
          </span>
        </span>
        <div class="tw-done__btns">
          <a href={homeHref} class="btn btn--primary btn--sm">
            {T.home}
          </a>
          <a href={productsHref} class="btn btn--outline btn--sm">
            {U.browse}
          </a>
        </div>
      </div>
    );
  }

  const chip = (on: boolean) => ({ class: 'chip', 'aria-pressed': on });
  const errCount = Object.keys(errs).filter((k) => touched[k as keyof Form]).length;
  const input = (k: keyof Form, extra: Record<string, unknown> = {}) => ({
    class: 'input',
    value: f[k] as string,
    'aria-invalid': !!shown(k),
    'aria-describedby': shown(k) ? `tw-e-${k}` : undefined,
    onInput: (e: Event) => set(k, (e.currentTarget as HTMLInputElement).value as never),
    onBlur: () => touch(k),
    ...extra,
  });
  const err = (k: keyof Form) =>
    shown(k) ? (
      <span class="field__error" id={`tw-e-${k}`}>
        {shown(k)}
      </span>
    ) : null;

  return (
    <form class="tw" noValidate onSubmit={submit}>
      <div class="tw-prog">
        <div class="tw-prog__top">
          <span class="tw-prog__l">{U.prog!.replace('{0}', String(prog))}</span>
          {anyFilled && (
            <span class="tw-prog__draft">
              <span class="tw-dot" aria-hidden="true" />
              {U.draft}
              <button type="button" onClick={clearDraft}>
                {U.clear}
              </button>
            </span>
          )}
        </div>
        <div
          class="tw-prog__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={prog}
          aria-label={U.prog!.replace('{0}', String(prog))}
        >
          <div class="tw-prog__fill" ref={progRef} />
        </div>
        {LEADS_SIMULATED && <p class="qf__dev">{U.notSent}</p>}
      </div>

      <div ref={summaryRef} tabIndex={-1} class="qf__errsum" role="alert" hidden={!errCount}>
        {errCount > 0 && U.formErrors}
      </div>

      {/* 01 Company */}
      <fieldset class="tw-sec">
        <legend class="tw-sec__h">
          <span class="tw-sec__n">01</span>
          <span class="tw-sec__rule" aria-hidden="true" />
          <span>{T.steps[0]}</span>
        </legend>
        <div class="tw-grid">
          <label class="field tw-full">
            <span class="field__label">{T.f.company} *</span>
            <input {...input('company', { autocomplete: 'organization' })} />
            {err('company')}
          </label>
          <div class="field tw-full" role="group" aria-labelledby="tw-biz-l">
            <span class="field__label" id="tw-biz-l">
              {T.f.bizType} *
            </span>
            <div class="pill-row">
              {T.f.bizTypes.map((b: string) => (
                <button
                  type="button"
                  {...chip(f.bizType === b)}
                  onClick={() => {
                    set('bizType', b);
                    touch('bizType');
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
            {err('bizType')}
          </div>
          <div class="field tw-combo">
            <label class="field__label" for="tw-country">
              {T.f.country} *
            </label>
            <div class="tw-combo__box">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" class="tw-combo__ic">
                <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="1.8" />
                <path d="M15 15 L20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              <input
                id="tw-country"
                role="combobox"
                aria-expanded={countryOpen && list.length > 0}
                aria-controls="tw-country-list"
                aria-autocomplete="list"
                aria-activedescendant={activeOpt >= 0 ? `tw-c-${activeOpt}` : undefined}
                autocomplete="country-name"
                placeholder={T.f.countryPh}
                {...input('country')}
                class="input tw-combo__in"
                onInput={(e) => {
                  set('country', e.currentTarget.value);
                  setCountryOpen(true);
                  setActiveOpt(-1);
                }}
                onFocus={() => setCountryOpen(true)}
                onBlur={() => {
                  touch('country');
                  setTimeout(() => setCountryOpen(false), 140);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCountryOpen(true);
                    setActiveOpt((a) => Math.min(list.length - 1, a + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveOpt((a) => Math.max(0, a - 1));
                  } else if (e.key === 'Enter' && countryOpen && activeOpt >= 0 && list[activeOpt]) {
                    e.preventDefault();
                    pickCountry(list[activeOpt]!);
                  } else if (e.key === 'Escape') setCountryOpen(false);
                }}
              />
            </div>
            {countryOpen && list.length > 0 && (
              <ul class="tw-combo__list" id="tw-country-list" role="listbox" aria-label={T.f.country}>
                {list.map((c, i) => (
                  <li
                    id={`tw-c-${i}`}
                    role="option"
                    aria-selected={i === activeOpt}
                    class={i === activeOpt ? 'is-active' : ''}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickCountry(c);
                    }}
                  >
                    <span>{ar ? c.ar : c.en}</span>
                    <span dir="ltr" class="mono">
                      {c.dial}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {err('country')}
          </div>
          <label class="field">
            <span class="field__label">{T.f.city} *</span>
            <input {...input('city', { autocomplete: 'address-level2' })} />
            {err('city')}
          </label>
          <label class="field">
            <span class="field__label">{T.f.license}</span>
            <input {...input('license')} dir="ltr" class="input input--mono" />
          </label>
          <div class="field tw-full">
            <span class="field__label">{T.f.uploadsT}</span>
            <div class="tw-uploads">
              {T.f.uploadList.map((up: { key: string; label: string }) => {
                const file = files[up.key];
                return (
                  <div
                    class={`tw-up${dragKey === up.key ? ' is-drag' : ''}${file ? ' has-file' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragKey(up.key);
                    }}
                    onDragLeave={() => setDragKey('')}
                    onDrop={(e) => {
                      e.preventDefault();
                      setFile(up.key, e.dataTransfer?.files?.[0]);
                    }}
                  >
                    <div class="tw-up__h">
                      <span class="tw-up__ic" aria-hidden="true">
                        <span class="dia dia--md" />
                      </span>
                      <span id={`tw-up-${up.key}`}>{up.label}</span>
                    </div>
                    {file ? (
                      <span class="tw-up__file">
                        <span class="dia dia--md" aria-hidden="true" />
                        <span>{file.name}</span>
                      </span>
                    ) : (
                      <span class="tw-up__txt">
                        {T.f.drop}{' '}
                        <label class="dropzone-label">
                          <input
                            type="file"
                            class="dropzone-input"
                            accept={FILE_RULES.accept}
                            aria-labelledby={`tw-up-${up.key}`}
                            onChange={(e) => setFile(up.key, e.currentTarget.files?.[0])}
                          />
                          <span class="dropzone-browse">{T.f.browse}</span>
                        </label>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {fileErr && <span class="field__error">{fileErr}</span>}
          </div>
        </div>
      </fieldset>

      {/* 02 Contact */}
      <fieldset class="tw-sec">
        <legend class="tw-sec__h">
          <span class="tw-sec__n">02</span>
          <span class="tw-sec__rule" aria-hidden="true" />
          <span>{T.steps[1]}</span>
        </legend>
        <div class="tw-grid">
          <label class="field">
            <span class="field__label">{T.f.name} *</span>
            <input {...input('name', { autocomplete: 'name' })} />
            {err('name')}
          </label>
          <label class="field">
            <span class="field__label">{T.f.role}</span>
            <input {...input('role', { autocomplete: 'organization-title' })} />
          </label>
          <label class="field">
            <span class="field__label">{T.f.email} *</span>
            <input {...input('email', { type: 'email', dir: 'ltr', autocomplete: 'email' })} class="input input--mono" />
            {err('email')}
          </label>
          <div class="field">
            <label class="field__label" for="tw-phone">
              {T.f.phone} *
            </label>
            <div dir="ltr" class="tw-phone">
              <select
                class="input input--mono tw-dial"
                aria-label="Dial code"
                value={f.dial}
                onChange={(e) => set('dial', e.currentTarget.value)}
              >
                {dials.map((d) => (
                  <option value={d}>{d}</option>
                ))}
              </select>
              <input
                id="tw-phone"
                {...input('phone', { type: 'tel', inputMode: 'tel', autocomplete: 'tel-national', placeholder: '5X XXX XXXX' })}
                class="input input--mono"
              />
            </div>
            {err('phone')}
          </div>
        </div>
      </fieldset>

      {/* 03 Requirements */}
      <fieldset class="tw-sec">
        <legend class="tw-sec__h">
          <span class="tw-sec__n">03</span>
          <span class="tw-sec__rule" aria-hidden="true" />
          <span>{T.steps[2]}</span>
        </legend>
        <div class="tw-col">
          <div class="field" role="group" aria-labelledby="tw-prod-l">
            <span class="field__label" id="tw-prod-l">
              {T.f.products} *
            </span>
            <div class="tw-prods">
              {products.map((p) => {
                const on = f.products.includes(p.id);
                return (
                  <button
                    type="button"
                    class={`tw-prod${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      toggle('products', p.id);
                      touch('products');
                    }}
                  >
                    <span class="tw-check" aria-hidden="true" />
                    <span class="tw-prod__copy">
                      <span class="tw-prod__name">{p.short}</span>
                      <span class="tw-prod__sub">{p.type}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {err('products')}
            {f.products.length > 0 && (
              <div class="tw-bags" aria-hidden="true">
                {f.products.map((id) => {
                  const p = products.find((x) => x.id === id)!;
                  return (
                    <div class="tw-bag">
                      <img src={p.bag} alt="" width={64} height={84} />
                      <span>{p.short}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div class="field" role="group" aria-labelledby="tw-vol-l">
            <span class="field__label" id="tw-vol-l">
              {T.f.volume} *
            </span>
            <div class="pill-row">
              {T.f.volumes.map((v: string) => (
                <button
                  type="button"
                  {...chip(f.volume === v)}
                  onClick={() => {
                    set('volume', v);
                    touch('volume');
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            {err('volume')}
          </div>
          <div class="field" role="group" aria-labelledby="tw-mkt-l">
            <span class="field__label" id="tw-mkt-l">
              {T.f.markets}
            </span>
            <div class="pill-row">
              {markets.map((m) => (
                <button type="button" {...chip(f.markets.includes(m))} onClick={() => toggle('markets', m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div class="field">
            <span class="field__label">{T.f.packaging}</span>
            <div class="tw-static">
              <span class="dia dia--md" aria-hidden="true" />
              {T.f.packagingV}
            </div>
          </div>
        </div>
      </fieldset>

      {/* 04 Consent */}
      <fieldset class="tw-sec">
        <legend class="tw-sec__h">
          <span class="tw-sec__n">04</span>
          <span class="tw-sec__rule" aria-hidden="true" />
          <span>{T.steps[3]}</span>
        </legend>
        <label class={`tw-consent${f.consent ? ' is-on' : ''}${shown('consent') ? ' is-bad' : ''}`}>
          <input
            type="checkbox"
            class="tw-consent__in"
            checked={f.consent}
            aria-invalid={!!shown('consent')}
            aria-describedby={shown('consent') ? 'tw-e-consent' : undefined}
            onChange={(e) => {
              set('consent', e.currentTarget.checked);
              touch('consent');
            }}
          />
          <span class="tw-check" aria-hidden="true" />
          <span>{T.consent}</span>
        </label>
        {err('consent')}
        <input
          class="qf__hp"
          tabIndex={-1}
          autocomplete="off"
          aria-hidden="true"
          name="company_website"
          value={hp}
          onInput={(e) => setHp(e.currentTarget.value)}
        />
      </fieldset>

      <div class="tw-submit">
        <button type="submit" class="btn btn--amber tw-submit__btn" disabled={busy}>
          {busy && <span class="qf-spin qf-spin--dark" aria-hidden="true" />}
          {busy ? T.submitting : T.submit}
        </button>
      </div>
    </form>
  );
}
