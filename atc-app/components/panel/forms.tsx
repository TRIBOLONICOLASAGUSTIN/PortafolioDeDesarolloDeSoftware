'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from '../ui';
import { Chips } from './chips';
import { Field, aria } from './field';
import { usePanel } from './panel-shell';
import { PRODUCTS, byId } from '@/lib/data/catalog';
import { COSTOS } from '@/lib/data/panel';
import { PAYS, type PayId } from '@/lib/whatsapp';
import { cobroSchema, errores, gastoSchema, toInt, ventaSchema } from '@/lib/panel/schemas';
import { GASTO_CATS, type GastoCat } from '@/lib/panel/types';
import { addDays } from '@/lib/panel/dates';
import { fmt, fmtMonto, fmtPct } from '@/lib/format';
import { storeStamp } from '@/lib/hours';

/* Formularios de la maqueta: validan como en la etapa 2, pero lo cargado no se guarda
   (queda en la lista con "Sin guardar" hasta que se recarga la página). */
const PAY_OPTS = PAYS.map(([id, t]) => [id, t]) as [PayId, string][];
const AVISO = 'Maqueta: se agregó a la lista, pero no se guardó.';
/** Errores del formulario: al corregir un campo se borra su error; al enviar con errores, el foco va al primero
   y se anuncia (aunque ese campo ya tuviera el foco, en cuyo caso el lector no lo vuelve a leer). */
function useErr() {
  const [err, setErr] = useState<Record<string, string>>({});
  const [alerta, setAlerta] = useState({ n: 0, msg: '' });
  const limpiar = <T,>(k: string, set: (v: T) => void) => (v: T) => {
    set(v);
    setErr(e => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  };
  const fallar = (e: Record<string, string>, orden: [string, string][]) => {
    setErr(e);
    const k = orden.find(([campo]) => e[campo]);
    if (k) document.getElementById(k[1])?.focus();
    const msg = k ? e[k[0]] : Object.values(e)[0] ?? '';
    setAlerta(a => ({ n: a.n + 1, msg: `Revisá el formulario: ${msg}` }));
  };
  return { err, setErr, limpiar, fallar, alerta: <p key={alerta.n} className="sr" role="alert">{alerta.msg}</p> };
}

/** Hora real del registro (el panel pudo quedar abierto horas). Si ya cambió el día, se pide recargar. */
function ahoraReal(hoy: string, toast: (m: string) => void) {
  const now = storeStamp();
  if (now.ymd !== hoy) { toast('Cambió el día: recargá el panel para registrar con la fecha de hoy.'); return null; }
  return now;
}

function Pago({ value, onChange, error }: { value: PayId; onChange: (p: PayId) => void; error?: string }) {
  return (
    <div className="pn-fld" id="f-pay">
      <span className="pn-lab" aria-hidden="true">Medio de pago</span>
      <Chips name="pn-pago" legend="Medio de pago" value={value} onChange={onChange} options={PAY_OPTS} />
      {error && <p className="pn-err">{error}</p>}
    </div>
  );
}

function Plata({ id, label, value, onChange, error, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <span className="pn-money"><span aria-hidden="true">$</span>
        <input className="pn-in pn-num" inputMode="numeric" autoComplete="off" value={value} onChange={e => onChange(e.target.value)} {...aria(id, error, !!hint)} />
      </span>
    </Field>
  );
}

export function VentaForm() {
  const { hoy, agregar, nuevoId, toast, closeSheet } = usePanel();
  const [productId, setProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [cost, setCost] = useState('');
  const [pay, setPay] = useState<PayId>('transferencia');
  const [note, setNote] = useState('');
  const { err, setErr, limpiar, fallar, alerta } = useErr();
  const p = byId[productId];
  const q = toInt(qty), u = toInt(unit), c = toInt(cost);
  const listo = p && q > 0 && u > 0 && c >= 0;

  const elegir = (id: string) => {
    setProduct(id);
    if (byId[id]) { setUnit(String(byId[id].price)); setCost(String(COSTOS[id])); setErr(e => ({ ...e, unit: '', unitCost: '' })); }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = ventaSchema.safeParse({ productId, qty: q, unit: u, unitCost: c, pay, note });
    const ex = r.success ? {} : errores(r.error);
    if (p && q > p.stock) ex.qty = `Hay ${p.stock} en stock`;
    if (!r.success || Object.keys(ex).length) {
      fallar(ex, [['productId', 'f-prod'], ['qty', 'f-qty'], ['unit', 'f-unit'], ['unitCost', 'f-cost'], ['note', 'f-note']]);
      return;
    }
    const v = r.data, now = ahoraReal(hoy, toast);
    if (!now) return;
    agregar({ kind: 'venta', id: nuevoId('V'), ymd: hoy, hm: now.hm, pay: v.pay, status: 'sin-guardar', items: [{ productId: v.productId, qty: v.qty, unit: v.unit, unitCost: v.unitCost }], note: v.note || undefined });
    toast(AVISO);
    closeSheet();
  };
  return (
    <form className="pn-form" noValidate onSubmit={submit}>
      {alerta}
      <Field id="f-prod" label="Producto" error={err.productId}>
        <select className="pn-in" value={productId} onChange={e => limpiar('productId', elegir)(e.target.value)} data-autofocus {...aria('f-prod', err.productId)}>
          <option value="">Elegí un producto</option>
          {PRODUCTS.map(x => <option key={x.id} value={x.id} disabled={!x.stock}>{x.brand} {x.name}{x.stock ? ` · ${x.stock} en stock` : ' · sin stock'}</option>)}
        </select>
      </Field>
      <Field id="f-qty" label="Cantidad" error={err.qty}>
        <span className="pn-qty">
          <button type="button" aria-label="Una menos" onClick={() => limpiar('qty', setQty)(String(Math.max(1, (q || 1) - 1)))}><Icon n="minus" /></button>
          <input className="pn-in pn-num" inputMode="numeric" value={qty} onChange={e => limpiar('qty', setQty)(e.target.value)} {...aria('f-qty', err.qty)} />
          <button type="button" aria-label="Una más" onClick={() => limpiar('qty', setQty)(String(Math.min(p?.stock || 999, (q || 0) + 1)))}><Icon n="plus" /></button>
        </span>
      </Field>
      <div className="pn-2">
        <Plata id="f-unit" label="Precio por unidad" value={unit} onChange={limpiar('unit', setUnit)} error={err.unit} />
        <Plata id="f-cost" label="Costo por unidad" value={cost} onChange={limpiar('unitCost', setCost)} error={err.unitCost} hint="Solo lo ves vos" />
      </div>
      <Pago value={pay} onChange={setPay} error={err.pay} />
      <Field id="f-note" label="Nota (opcional)" error={err.note}>
        <input className="pn-in" maxLength={140} value={note} onChange={e => limpiar('note', setNote)(e.target.value)} {...aria('f-note', err.note)} />
      </Field>
      {listo && (
        <p className="pn-prev" id="pn-prev">
          Total <b className="pn-num">{fmt(q * u)}</b> · Ganancia <b className="pn-num">{fmtMonto(q * (u - c))}</b>{u > 0 && <> ({fmtPct((u - c) / u).replace('+', '')})</>}
          {c > u && <span className="pn-warn"><Icon n="info" cls="i xs" /> El costo es mayor que el precio: en esta venta perdés plata.</span>}
        </p>
      )}
      <button className="btn btn-full" type="submit">Agregar venta</button>
    </form>
  );
}

export function CobroForm({ code: pre }: { code?: string }) {
  const { hoy, agregar, nuevoId, toast, closeSheet, listas } = usePanel();
  const ini = listas.find(r => r.codigo === pre) ?? listas[0];
  const [code, setCode] = useState(ini?.codigo ?? '');
  const [amount, setAmount] = useState(ini?.presupuesto ? String(ini.presupuesto) : '');
  const [parts, setParts] = useState('0');
  const [pay, setPay] = useState<PayId>('efectivo');
  const { err, limpiar, fallar, alerta } = useErr();
  if (!listas.length) return <p className="pn-empty">No hay órdenes listas para cobrar.</p>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = cobroSchema.safeParse({ code, amount: toInt(amount), partsCost: toInt(parts), pay });
    if (!r.success) { fallar(errores(r.error), [['code', 'f-ord'], ['amount', 'f-amt'], ['partsCost', 'f-parts']]); return; }
    const o = listas.find(x => x.codigo === r.data.code)!;
    const svcId = /impresora/i.test(o.equipo) ? 'imp' : /notebook/i.test(o.equipo) ? 'nb' : 'pc';
    const now = ahoraReal(hoy, toast);
    if (!now) return;
    agregar({ kind: 'reparacion', id: nuevoId('R'), ymd: hoy, hm: now.hm, pay: r.data.pay, status: 'sin-guardar', orderCode: o.codigo, equipo: o.equipo, svcId, amount: r.data.amount, partsCost: r.data.partsCost });
    toast(AVISO);
    closeSheet();
  };
  return (
    <form className="pn-form" noValidate onSubmit={submit}>
      {alerta}
      <Field id="f-ord" label="Orden lista para retirar" error={err.code}>
        <select className="pn-in" value={code} data-autofocus onChange={e => { setCode(e.target.value); const o = listas.find(x => x.codigo === e.target.value); if (o?.presupuesto) setAmount(String(o.presupuesto)); }} {...aria('f-ord', err.code)}>
          {listas.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} · {o.equipo}</option>)}
        </select>
      </Field>
      <div className="pn-2">
        <Plata id="f-amt" label="Cobraste" value={amount} onChange={limpiar('amount', setAmount)} error={err.amount} />
        <Plata id="f-parts" label="Repuestos" value={parts} onChange={limpiar('partsCost', setParts)} error={err.partsCost} hint="Lo que te costaron (0 si no hubo)" />
      </div>
      <Pago value={pay} onChange={setPay} error={err.pay} />
      <button className="btn btn-full" type="submit">Agregar cobro</button>
    </form>
  );
}

export function GastoForm() {
  const { hoy, agregar, nuevoId, toast, closeSheet } = usePanel();
  const [cat, setCat] = useState<GastoCat | ''>('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [pay, setPay] = useState<PayId>('transferencia');
  const [ymd, setYmd] = useState(hoy);
  const { err, limpiar, fallar, alerta } = useErr();
  const min = addDays(hoy, -365);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = gastoSchema.safeParse({ cat, concept, amount: toInt(amount), pay, ymd });
    const ex = r.success ? {} : errores(r.error);
    if (!ex.ymd && (ymd > hoy || ymd < min)) ex.ymd = 'Elegí una fecha del último año, hasta hoy';
    if (!r.success || Object.keys(ex).length) { fallar(ex, [['cat', 'f-cat'], ['concept', 'f-con'], ['amount', 'f-gamt'], ['ymd', 'f-date']]); return; }
    const g = r.data, now = ahoraReal(hoy, toast);
    if (!now) return;
    agregar({ kind: 'gasto', id: nuevoId('G'), ymd: g.ymd, hm: g.ymd === hoy ? now.hm : '12:00', pay: g.pay, status: 'sin-guardar', cat: g.cat as GastoCat, concept: g.concept, amount: g.amount });
    toast(AVISO);
    closeSheet();
  };
  return (
    <form className="pn-form" noValidate onSubmit={submit}>
      {alerta}
      <Field id="f-cat" label="Categoría" error={err.cat} hint="La mercadería que comprás para vender no va acá: su costo se descuenta al registrar la venta.">
        <select className="pn-in" value={cat} data-autofocus onChange={e => limpiar('cat', setCat)(e.target.value as GastoCat)} {...aria('f-cat', err.cat, true)}>
          <option value="">Elegí una categoría</option>
          {GASTO_CATS.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
        </select>
      </Field>
      <Field id="f-con" label="En qué fue" error={err.concept}>
        <input className="pn-in" maxLength={80} value={concept} onChange={e => limpiar('concept', setConcept)(e.target.value)} placeholder="Por ejemplo: luz de septiembre" {...aria('f-con', err.concept)} />
      </Field>
      <div className="pn-2">
        <Plata id="f-gamt" label="Monto" value={amount} onChange={limpiar('amount', setAmount)} error={err.amount} />
        <Field id="f-date" label="Fecha" error={err.ymd}>
          <input className="pn-in" type="date" min={min} max={hoy} value={ymd} onChange={e => limpiar('ymd', setYmd)(e.target.value)} {...aria('f-date', err.ymd)} />
        </Field>
      </div>
      <Pago value={pay} onChange={setPay} error={err.pay} />
      <button className="btn btn-full" type="submit">Agregar gasto</button>
    </form>
  );
}
