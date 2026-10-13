/** Contact page "Request a quote" form (ported from quoteVals/submitQuote in the design). */
import { useEffect, useRef, useState } from 'preact/hooks';
import { fmtInt, packKg } from '@/lib/catalog-shared';
import { fallbackRef, LEADS_SIMULATED, submitLead } from '@/lib/lead/submit';
import { checkFiles, FILE_RULES, isEmail, isPhone } from '@/lib/lead/validate';
import { $quoteItems, takePrefill } from '@/stores/quote';
import './forms.css';

export interface FormProduct {
  id: string;
  name: string;
  short: string;
  type: string;
  packs: string[];
  bag: string;
  packBags: Record<string, string>;
}
type Line = { product: string; size: string; qty: string };
const emptyLine = (): Line => ({ product: '', size: '', qty: '' });

export default function QuoteForm({
  locale,
  products,
  copy: C,
}: {
  locale: 'en' | 'ar';
  products: FormProduct[];
  copy: Record<string, string>;
}) {
  const [q, setQ] = useState({ name: '', company: '', email: '', phone: '', message: '', hp: '' });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [linesTouched, setLinesTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { ref: string; rows: (Line & { id: string })[]; qty: number; kg: number }>(null);
  const startedAt = useRef(Date.now());
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  // Prefill from the quote drawer (contact + selected products) or ?product=<id>.
  useEffect(() => {
    const pre = takePrefill();
    if (pre.name || pre.company || pre.phone)
      setQ((v) => ({ ...v, name: pre.name ?? '', company: pre.company ?? '', phone: pre.phone ?? '' }));
    const items = $quoteItems.get();
    const fromStore = products
      .filter((p) => items[p.id])
      .map((p) => {
        const it = items[p.id]!;
        return { product: p.id, size: p.packs[Math.min(it.packIdx, p.packs.length - 1)] ?? '', qty: it.qty };
      });
    const param = new URLSearchParams(location.search).get('product');
    if (fromStore.length) setLines(fromStore);
    else if (param && products.some((p) => p.id === param)) setLines([{ product: param, size: '', qty: '' }]);
  }, []);

  const byId = (id: string) => products.find((p) => p.id === id);
  const errs: Record<string, string> = {};
  if (!q.name.trim()) errs.name = C.required!;
  if (!q.email.trim()) errs.email = C.required!;
  else if (!isEmail(q.email)) errs.email = C.emailErr!;
  if (!q.phone.trim()) errs.phone = C.required!;
  else if (!isPhone(q.phone)) errs.phone = C.phoneErr!;
  const badQty = (ln: Line) => !!ln.product && !!ln.size && !((parseFloat(String(ln.qty).replace(/[^\d.]/g, '')) || 0) > 0);
  if (lines.some(badQty)) errs.qty = C.qtQtyErr!;
  const shown = (k: string) => (touched[k] ? errs[k] : '');

  let totQty = 0;
  let totKg = 0;
  for (const ln of lines) {
    const n = parseFloat(String(ln.qty).replace(/[^\d.]/g, '')) || 0;
    totQty += n;
    totKg += packKg(ln.size) * n;
  }
  const chosen = [...new Set(lines.map((l) => l.product).filter(Boolean))].map(byId).filter(Boolean) as FormProduct[];
  const bags: string[] = [];
  for (const ln of lines) {
    const p = byId(ln.product);
    if (!p) continue;
    const img = p.packBags[String(p.packs.indexOf(ln.size))] ?? p.bag;
    if (!bags.includes(img)) bags.push(img);
  }

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch, ...(patch.product !== undefined ? { size: '' } : {}) } : l)));

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    const c = checkFiles([f]);
    if (!c.ok) {
      setFileErr(C[`file_${c.reason}`] ?? '');
      setFile(null);
      return;
    }
    setFileErr('');
    setFile(f);
  };

  async function submit(e: Event) {
    e.preventDefault();
    if (busy) return;
    if (Object.keys(errs).length) {
      setTouched({ name: true, email: true, phone: true });
      setLinesTouched(true);
      summaryRef.current?.focus();
      return;
    }
    setBusy(true);
    const filled = lines.filter((l) => l.product && l.size && String(l.qty).trim());
    try {
      const res = await submitLead(
        'quote',
        {
          name: q.name,
          company: q.company,
          email: q.email,
          phone: q.phone,
          message: q.message,
          lines: filled.map((l) => ({ product: byId(l.product)?.short ?? l.product, size: l.size, qty: l.qty })),
          totals: { qty: totQty, kg: totKg },
          lang: locale,
        },
        file ? { file } : null,
        { honeypot: q.hp, startedAt: startedAt.current },
      );
      setDone({ ref: res.ref ?? fallbackRef(), rows: filled.map((l) => ({ ...l, id: l.product })), qty: totQty, kg: totKg });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => doneRef.current?.focus(), 50);
    } catch {
      alert(C.leadFailed);
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    setDone(null);
    setQ({ name: '', company: '', email: '', phone: '', message: '', hp: '' });
    setLines([emptyLine()]);
    setFile(null);
    setTouched({});
    setLinesTouched(false);
    startedAt.current = Date.now();
  };

  if (done) {
    return (
      <div class="qf-done">
        <div class="qf-stamp" aria-hidden="true">
          <span class="r1" />
          <span class="r2" />
          <span class="core" />
          <svg width="40" height="40" viewBox="0 0 38 38" fill="none">
            <path d="M10 20 L16.5 27 L28 13" stroke="#E9D9A8" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <h2 ref={doneRef} tabIndex={-1} class="qf-done__t">
          {C.qSuccessT}
        </h2>
        <p class="qf-done__b">{C.qSuccessB}</p>
        <span class="qf-ref">
          <span class="label">{C.refL}</span>
          <span dir="ltr" class="mono">
            {done.ref}
          </span>
        </span>
        {done.rows.length > 0 && (
          <div class="qf-sum">
            <div class="label qf-sum__h">{C.qSummaryT}</div>
            {done.rows.map((r) => (
              <div class="qf-sum__row" data-product={r.id}>
                <span class="dot" aria-hidden="true" />
                <span class="qf-sum__p">{byId(r.id)?.short}</span>
                <span class="mono qf-sum__s">{r.size}</span>
                <span aria-hidden="true">×</span>
                <span class="mono qf-sum__q">{r.qty}</span>
              </div>
            ))}
            <div class="qf-sum__tot">
              <span class="label">{C.qtTotalKg}</span>
              <strong>
                {fmtInt(done.qty)} {C.qtUnits} · {fmtInt(done.kg)} kg
                {done.kg >= 1000 && ` · ${(done.kg / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} t`}
              </strong>
            </div>
          </div>
        )}
        <button type="button" class="btn btn--outline qf-again" onClick={reset}>
          {C.another}
        </button>
      </div>
    );
  }

  const errList = Object.entries(errs).filter(([k]) => (k === 'qty' ? linesTouched : touched[k]));
  return (
    <form class="qf" noValidate onSubmit={submit}>
      <h2 class="qf__t">{C.formT}</h2>
      <p class="qf__sub">{C.formSub}</p>
      {LEADS_SIMULATED && <p class="qf__dev">{C.notSent}</p>}

      <div class={`qf-panel${chosen.length ? ' has-sel' : ''}`} data-product={chosen[0]?.id} aria-hidden="true">
        <div class="qf-panel__bags">
          {(bags.length ? bags : products.map((p) => p.bag)).map((b) => (
            <img src={b} alt="" width={90} height={116} class={bags.length ? 'sel' : ''} />
          ))}
        </div>
        {chosen.length > 0 && (
          <div class="qf-panel__cap">
            {chosen.length === 1 && <div class="label qf-panel__type">{chosen[0]!.type}</div>}
            <div class="qf-panel__name">{chosen.length === 1 ? chosen[0]!.name : chosen.map((p) => p.short).join(' · ')}</div>
          </div>
        )}
      </div>

      <div ref={summaryRef} tabIndex={-1} class="qf__errsum" role="alert" hidden={!errList.length}>
        {errList.length > 0 && C.formErrors}
      </div>

      <div class="qf__grid">
        <label class="field">
          <span class="field__label">{C.fName} *</span>
          <input
            class="input"
            autocomplete="name"
            value={q.name}
            aria-invalid={!!shown('name')}
            aria-describedby={shown('name') ? 'qf-e-name' : undefined}
            onInput={(e) => setQ({ ...q, name: e.currentTarget.value })}
            onBlur={() => setTouched({ ...touched, name: true })}
          />
          {shown('name') && (
            <span class="field__error" id="qf-e-name">
              {shown('name')}
            </span>
          )}
        </label>
        <label class="field">
          <span class="field__label">{C.fCompany}</span>
          <input
            class="input"
            autocomplete="organization"
            value={q.company}
            onInput={(e) => setQ({ ...q, company: e.currentTarget.value })}
          />
        </label>
        <label class="field">
          <span class="field__label">{C.fEmail} *</span>
          <input
            class="input input--mono"
            type="email"
            dir="ltr"
            autocomplete="email"
            value={q.email}
            aria-invalid={!!shown('email')}
            aria-describedby={shown('email') ? 'qf-e-email' : undefined}
            onInput={(e) => setQ({ ...q, email: e.currentTarget.value })}
            onBlur={() => setTouched({ ...touched, email: true })}
          />
          {shown('email') && (
            <span class="field__error" id="qf-e-email">
              {shown('email')}
            </span>
          )}
        </label>
        <label class="field">
          <span class="field__label">{C.fPhone} *</span>
          <input
            class="input input--mono"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autocomplete="tel"
            value={q.phone}
            aria-invalid={!!shown('phone')}
            aria-describedby={shown('phone') ? 'qf-e-phone' : undefined}
            onInput={(e) => setQ({ ...q, phone: e.currentTarget.value })}
            onBlur={() => setTouched({ ...touched, phone: true })}
          />
          {shown('phone') && (
            <span class="field__error" id="qf-e-phone">
              {shown('phone')}
            </span>
          )}
        </label>
        <input
          class="qf__hp"
          tabIndex={-1}
          autocomplete="off"
          aria-hidden="true"
          name="company_website"
          value={q.hp}
          onInput={(e) => setQ({ ...q, hp: e.currentTarget.value })}
        />

        <fieldset class="qf-lines">
          <legend class="field__label">{C.fProduct}</legend>
          <table class="qf-table">
            <thead>
              <tr>
                <th scope="col">{C.qtProduct}</th>
                <th scope="col">{C.qtSize}</th>
                <th scope="col">{C.qtQty}</th>
                <td />
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, i) => {
                const p = byId(ln.product);
                const bad = linesTouched && badQty(ln);
                return (
                  <tr data-product={p?.id}>
                    <td>
                      <span class="qf-dot" aria-hidden="true" />
                      <select
                        aria-label={`${C.qtProduct} ${i + 1}`}
                        value={ln.product}
                        onChange={(e) => setLine(i, { product: e.currentTarget.value })}
                      >
                        <option value="">{C.qtSelProd}</option>
                        {products.map((x) => (
                          <option value={x.id}>{x.short}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`${C.qtSize} ${i + 1}`}
                        value={ln.size}
                        disabled={!p}
                        onChange={(e) => setLine(i, { size: e.currentTarget.value })}
                      >
                        <option value="">{p ? C.qtSelSize : C.qtSelProdFirst}</option>
                        {(p?.packs ?? []).map((s) => (
                          <option value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`${C.qtQty} ${i + 1}`}
                        value={ln.qty}
                        placeholder={C.qtQtyPh}
                        inputMode="numeric"
                        dir="ltr"
                        aria-invalid={bad}
                        class={bad ? 'is-bad' : ''}
                        onInput={(e) => setLine(i, { qty: e.currentTarget.value })}
                      />
                    </td>
                    <td>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          class="qf-x"
                          aria-label={`${C.qtRemove} ${i + 1}`}
                          title={C.qtRemove}
                          onClick={() => setLines(lines.filter((_, k) => k !== i))}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" class="qf-add" onClick={() => setLines([...lines, emptyLine()])}>
            <span aria-hidden="true">+</span> {C.qtAdd}
          </button>
          {linesTouched && errs.qty && (
            <div class="field__error qf-qtyerr" role="alert">
              {errs.qty}
            </div>
          )}
          {totKg > 0 && (
            <div class="qf-totals">
              <div>
                <span class="label">{C.qtTotalQty}</span>
                <strong>
                  {fmtInt(totQty)} <small>{C.qtUnits}</small>
                </strong>
              </div>
              <div class="qf-totals__kg">
                <span class="label">{C.qtTotalKg}</span>
                <strong>
                  {fmtInt(totKg)} <small>kg</small>
                  {totKg >= 1000 && <small> · {(totKg / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} t</small>}
                </strong>
              </div>
            </div>
          )}
          <span class="qf-hint">{C.fQty}</span>
        </fieldset>

        <div class="field qf-full">
          <span class="field__label" id="qf-file-l">
            {C.upload}
          </span>
          <div
            class={`qf-drop${drag ? ' is-drag' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pickFile(e.dataTransfer?.files?.[0]);
            }}
          >
            <span class="qf-drop__ic" aria-hidden="true">
              <span class="dia" />
            </span>
            {file ? (
              <span class="qf-drop__file">
                <span class="dia dia--md" aria-hidden="true" />
                <span>
                  {C.uploaded}: {file.name}
                </span>
              </span>
            ) : (
              <span class="qf-drop__txt">
                {C.drop}{' '}
                <label class="dropzone-label">
                  <input
                    type="file"
                    class="dropzone-input"
                    accept={FILE_RULES.accept}
                    aria-labelledby="qf-file-l"
                    onChange={(e) => pickFile(e.currentTarget.files?.[0])}
                  />
                  <span class="dropzone-browse">{C.browse}</span>
                </label>
              </span>
            )}
          </div>
          {fileErr && <span class="field__error">{fileErr}</span>}
        </div>

        <label class="field qf-full">
          <span class="field__label">{C.fMsg}</span>
          <textarea
            class="input"
            rows={3}
            placeholder={C.fMsgPh}
            value={q.message}
            onInput={(e) => setQ({ ...q, message: e.currentTarget.value })}
          />
        </label>
      </div>
      <button type="submit" class="btn btn--primary btn--block qf__send" disabled={busy}>
        {busy && <span class="qf-spin" aria-hidden="true" />}
        {busy ? C.sending : C.send}
      </button>
    </form>
  );
}
