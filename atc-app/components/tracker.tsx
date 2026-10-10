'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon, Wa } from './ui';
import { STEPS, type TrackFound, type TrackResult } from '@/lib/data/tracking';
import { fmt, vars } from '@/lib/format';
import { longDate, shortDateTime } from '@/lib/hours';

declare global { interface Window { turnstile?: { reset: (el?: string | HTMLElement) => void } } }

const MSG = {
  incompleto: 'Completá el código de tu comprobante (por ejemplo 7KQ2-9M) y los últimos 3 números de tu teléfono.',
  no_encontrada: 'No encontramos una orden con esos datos. Revisá el comprobante o escribinos por WhatsApp.',
  demasiados_intentos: 'Hiciste muchos intentos seguidos. Esperá unos minutos o escribinos por WhatsApp.',
  no_disponible: 'No pudimos consultar el seguimiento en este momento. Probá en un rato o escribinos por WhatsApp.',
  verificacion: 'No pudimos verificar que seas una persona. Recargá la página y probá de nuevo.',
  solicitud_invalida: 'Revisá el código y el teléfono, e intentá de nuevo.',
  origen: 'No pudimos procesar el pedido. Recargá la página e intentá de nuevo.',
};

// Lo que escribe la gente → formato del comprobante: mayúsculas, sin I/L/O (Crockford), "7KQ2-9M".
// Si pegan el código completo ("AT-7KQ2-9M"), se quita el prefijo AT (igual que normalize_code en la base).
const tidyCode = (s: string) => {
  let v = s.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (v.length === 8 && v.startsWith('AT')) v = v.slice(2);
  v = v.replace(/[IL]/g, '1').replace(/O/g, '0').slice(0, 6);
  return v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4)}` : v;
};

function Order({ o, onAgain }: { o: TrackFound; onAgain: () => void }) {
  const idx = STEPS.findIndex(s => s.id === o.estado), cur = STEPS[idx];
  const steps = useRef<HTMLOListElement>(null);
  // La barra avanza una vez hasta el estado actual (confirma dónde está la orden).
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => steps.current?.style.setProperty('--pg', String(idx / (STEPS.length - 1)))));
    return () => cancelAnimationFrame(id);
  }, [idx]);
  const msg = o.estado === 'aprobacion' && o.presupuesto
    ? `¡Hola! Apruebo el presupuesto de la orden ${o.codigo} (${fmt(o.presupuesto)}). ¡Gracias!`
    : `¡Hola! Te escribo por la orden ${o.codigo} (${o.equipo}).`;
  return (
    <div className="tres">
      <div className="tres-top">
        <div><small>Orden</small><h3>{o.codigo}</h3><p>{o.equipo} · {o.cliente}</p></div>
        <span className="sbadge" style={vars({ '--c': cur.c })}><i></i>{cur.t}</span>
      </div>
      <ol className="tsteps" style={vars({ '--pg': 0 })} ref={steps}>
        {STEPS.map((s, i) => (
          <li key={s.id} className={`ts ${i <= idx ? 'done' : ''} ${i === idx ? 'cur' : ''}`} style={vars({ '--d': `${(i * .15).toFixed(2)}s` })}><span className="b"><Icon n={s.ic} /></span>{s.s || s.t}</li>
        ))}
      </ol>
      <div className="tmeta">
        {o.presupuesto != null && <span><Icon n="zap" cls="i sm" />Presupuesto: <b>{fmt(o.presupuesto)}</b></span>}
        {o.garantia_hasta && <span><Icon n="clock" cls="i sm" />Garantía hasta el {longDate(o.garantia_hasta)}</span>}
      </div>
      <ul className="tl">
        {o.novedades.map((e, i) => (
          <li key={`${e.fecha}-${i}`} style={vars({ '--d': `${(.2 + i * .08).toFixed(2)}s` })}>
            <b>{STEPS.find(s => s.id === e.estado)?.t}</b><time dateTime={e.fecha}>{shortDateTime(e.fecha)}</time>{e.nota && <p>{e.nota}</p>}
          </li>
        ))}
      </ul>
      <div className="tact">
        <Wa className="btn btn-wa btn-sm" text={msg}><Icon n="wa" cls="i sm" />{o.estado === 'aprobacion' ? 'Aprobar presupuesto' : 'Hablar con el técnico'}</Wa>
        <button className="btn btn-gray btn-sm" id="tAgain" type="button" onClick={onAgain}>Buscar otra orden</button>
      </div>
    </div>
  );
}

export function Tracker({ demo, turnstileKey, nonce }: { demo: boolean; turnstileKey?: string; nonce?: string }) {
  const [code, setCode] = useState('');
  const [tel, setTel] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ order?: TrackFound; err?: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const telRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const fail = (err: string) => {
    setOut({ err });
    const f = form.current; if (f) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
  };

  async function search(c: string, t: string) {
    if (c.length < 7 || t.length < 3) { fail(MSG.incompleto); return; }
    setBusy(true);
    try {
      const token = form.current ? new FormData(form.current).get('cf-turnstile-response') : null;
      const res = await fetch('/api/seguimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: `AT-${c}`, telefono3: t, ...(typeof token === 'string' ? { turnstileToken: token } : {}) }),
      });
      const r: TrackResult | null = await res.json().catch(() => null);
      if (r?.ok) setOut({ order: r });
      else fail(MSG[(r && !r.ok && r.motivo) || (res.status === 429 ? 'demasiados_intentos' : 'no_disponible')]);
    } catch {
      fail(MSG.no_disponible);
    } finally {
      setBusy(false);
      if (turnstileKey) window.turnstile?.reset();
    }
  }

  const onSubmit = (e: FormEvent) => { e.preventDefault(); search(code, tel); };
  const again = () => { setOut(null); setCode(''); setTel(''); codeRef.current?.focus(); };

  return (
    <section className="sec" id="seguimiento">
      <div className="wrap track">
        <div className="rv">
          <span className="kicker">Seguimiento online</span>
          <h2 className="h2">¿Cómo va tu reparación? <span className="muted">Miralo ahora.</span></h2>
          <p className="lede">Ingresá el código de tu comprobante y seguí cada paso, sin tener que llamar.</p>
          <ul className="feat">
            <li><Icon n="check-c" /><span><b>Siempre al día.</b> Cada vez que el técnico actualiza la orden, lo ves acá.</span></li>
            <li><Icon n="check-c" /><span><b>Notas del técnico</b> en cada etapa, en palabras simples.</span></li>
            <li><Icon n="check-c" /><span><b>Aviso por WhatsApp</b> cuando tu equipo está listo.</span></li>
            <li><Icon n="lock" /><span><b>Privado.</b> Se necesita el código de tu comprobante y tu teléfono. Mostramos solo lo mínimo.</span></li>
          </ul>
        </div>
        <div className="card rv" style={vars({ '--d': '.1s' })}>
          <h3>Buscar mi orden</h3>
          <p>El código está en el comprobante que te entregamos.</p>
          <form className="tform" id="tform" noValidate ref={form} onSubmit={onSubmit}>
            <label className="field"><span>Código de orden</span><span className="inp"><span className="pre">AT-</span>
              <input id="tCode" ref={codeRef} inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={7} placeholder="7KQ2-9M"
                value={code} onChange={e => { const v = tidyCode(e.target.value); setCode(v); if (v.length === 7) telRef.current?.focus(); }} /></span></label>
            <label className="field"><span>Últimos 3 dígitos del teléfono</span><span className="inp"><Icon n="phone" cls="i sm" />
              <input id="tTel" ref={telRef} inputMode="numeric" autoComplete="off" maxLength={3} placeholder="321"
                value={tel} onChange={e => setTel(e.target.value.replace(/\D/g, '').slice(0, 3))} /></span></label>
            {turnstileKey && <div className="cf-turnstile" data-sitekey={turnstileKey} data-action="seguimiento" data-size="flexible" data-language="es"></div>}
            <button className="btn" id="tBtn" type="submit" disabled={busy}>{busy ? <><span className="spin"></span><span>Buscando…</span></> : <span>Rastrear</span>}</button>
          </form>
          {demo && (
            <div className="hint">Probá la demo:
              {[['7KQ2-9M', '321'], ['3FJ8-WX', '548'], ['9TR4-6P', '777']].map(([c, t]) => (
                <button key={c} type="button" data-demo={`${c},${t}`} onClick={() => { setCode(c); setTel(t); search(c, t); }}>AT-{c} · {t}</button>
              ))}
            </div>
          )}
          <div id="tOut" aria-live="polite">
            {out?.err && <div className="err"><Icon n="bell" cls="i sm" /><span>{out.err}</span></div>}
            {out?.order && <Order key={out.order.codigo} o={out.order} onAgain={again} />}
          </div>
        </div>
      </div>
      {turnstileKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />}
    </section>
  );
}
