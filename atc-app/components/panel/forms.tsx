'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui';
import { Chips } from './chips';
import { Field, aria } from './field';
import { usePanel } from './panel-shell';
import { PAYS, type PayId } from '@/lib/whatsapp';
import { CATS_NUEVO, cobroSchema, editarSchema, errores, gastoSchema, nuevoSchema, repoSchema, toInt, ventaSchema } from '@/lib/panel/schemas';
import { UMBRAL } from '@/lib/data/inventario';
import { GRUPOS } from './inventario';
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

function Cantidad({ id, label, value, onChange, error, max = 999, autoFocus, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; max?: number; autoFocus?: boolean; hint?: string }) {
  const q = toInt(value);
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <span className="pn-qty">
        <button type="button" aria-label="Una menos" onClick={() => onChange(String(Math.max(1, (q || 1) - 1)))}><Icon n="minus" /></button>
        <input className="pn-in pn-num" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)} data-autofocus={autoFocus || undefined} {...aria(id, error, !!hint)} />
        <button type="button" aria-label="Una más" onClick={() => onChange(String(Math.min(max, (q || 0) + 1)))}><Icon n="plus" /></button>
      </span>
    </Field>
  );
}

export function VentaForm({ pre }: { pre?: string }) {
  const { hoy, agregar, nuevoId, toast, closeSheet, inv } = usePanel();
  const ini = pre ? inv.byId.get(pre) : undefined;
  const [productId, setProduct] = useState(ini?.price ? ini.id : '');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState(ini?.price ? String(ini.price) : '');
  const [cost, setCost] = useState(ini?.price ? String(ini.cost) : '');
  const [pay, setPay] = useState<PayId>('transferencia');
  const [note, setNote] = useState('');
  const { err, setErr, limpiar, fallar, alerta } = useErr();
  // Solo productos (las piezas no se venden sueltas). Precio, costo y stock vigentes: los que cambió el dueño en esta visita.
  const productos = inv.items.filter(x => x.price !== null);
  const p = inv.byId.get(productId), stock = p ? inv.stock(p.id) : 0;
  const q = toInt(qty), u = toInt(unit), c = toInt(cost);
  const listo = p && q > 0 && u > 0 && c >= 0;

  const elegir = (id: string) => {
    setProduct(id);
    const x = inv.byId.get(id);
    if (x?.price) { setUnit(String(x.price)); setCost(String(x.cost)); setErr(e => ({ ...e, unit: '', unitCost: '' })); }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = ventaSchema.safeParse({ productId, qty: q, unit: u, unitCost: c, pay, note });
    const ex = r.success ? {} : errores(r.error);
    if (p && q > stock) ex.qty = stock > 0 ? `Hay ${stock} en stock` : 'No hay stock';
    if (!r.success || Object.keys(ex).length) {
      fallar(ex, [['productId', 'f-prod'], ['qty', 'f-qty'], ['unit', 'f-unit'], ['unitCost', 'f-cost'], ['note', 'f-note']]);
      return;
    }
    const v = r.data, now = ahoraReal(hoy, toast);
    if (!now) return;
    agregar({ kind: 'venta', id: nuevoId('V'), ymd: hoy, hm: now.hm, pay: v.pay, status: 'sin-guardar', items: [{ productId: v.productId, qty: v.qty, unit: v.unit, unitCost: v.unitCost }], note: v.note || undefined });
    toast('Maqueta: se descontó del stock y se agregó a la lista, pero no se guardó.');
    closeSheet();
  };
  return (
    <form className="pn-form" noValidate onSubmit={submit}>
      {alerta}
      <Field id="f-prod" label="Producto" error={err.productId} hint={p?.kit ? 'Al venderla se descuentan sus piezas del stock' : undefined}>
        <select className="pn-in" value={productId} onChange={e => limpiar('productId', elegir)(e.target.value)} data-autofocus={!ini || undefined} {...aria('f-prod', err.productId, !!p?.kit)}>
          <option value="">Elegí un producto</option>
          {productos.map(x => { const n = inv.stock(x.id); return <option key={x.id} value={x.id} disabled={n <= 0}>{x.brand} {x.name}{n > 0 ? ` · ${n} en stock` : ' · sin stock'}</option>; })}
        </select>
      </Field>
      <Cantidad id="f-qty" label="Cantidad" value={qty} onChange={limpiar('qty', setQty)} error={err.qty} max={stock || 999} autoFocus={!!ini} />
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
      <div className="pn-foot"><button className="btn btn-full" type="submit">Agregar venta</button></div>
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
      <div className="pn-foot"><button className="btn btn-full" type="submit">Agregar cobro</button></div>
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
      <div className="pn-foot"><button className="btn btn-full" type="submit">Agregar gasto</button></div>
    </form>
  );
}

/* Inventario: reposición, edición y alta. Como el resto de la maqueta, cambian lo que se ve pero no se guardan. */
export function ReponerForm({ pre }: { pre?: string }) {
  const { hoy, inv, moverStock, ajustar, toast, closeSheet } = usePanel();
  const ini = pre ? inv.byId.get(pre) : undefined;
  const ok = ini && !ini.kit ? ini : undefined;
  const [itemId, setItem] = useState(ok?.id ?? '');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState(ok ? String(ok.cost) : '');
  const [prov, setProv] = useState('');
  const { err, setErr, limpiar, fallar, alerta } = useErr();
  // Las PC armadas no se reponen: se reponen sus piezas
  const it = inv.byId.get(itemId), s = it ? inv.stock(it.id) : 0;
  const q = toInt(qty), c = toInt(cost);
  const elegir = (id: string) => {
    setItem(id);
    const x = inv.byId.get(id);
    if (x) { setCost(String(x.cost)); setErr(e => ({ ...e, unitCost: '' })); }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = repoSchema.safeParse({ itemId, qty: q, unitCost: c, prov });
    if (!r.success) { fallar(errores(r.error), [['itemId', 'f-ritem'], ['qty', 'f-rqty'], ['unitCost', 'f-rcost'], ['prov', 'f-prov']]); return; }
    const v = r.data, now = ahoraReal(hoy, toast);
    if (!now) return;
    moverStock({ itemId: v.itemId, ymd: hoy, hm: now.hm, tipo: 'repo', qty: v.qty, unitCost: v.unitCost, note: v.prov || undefined });
    if (it && v.unitCost !== it.cost) ajustar(v.itemId, { cost: v.unitCost });
    toast('Maqueta: se sumó al stock, pero no se guardó.');
    closeSheet();
  };
  return (
    <form className="pn-form" noValidate onSubmit={submit}>
      {alerta}
      <Field id="f-ritem" label="Producto o pieza" error={err.itemId}>
        <select className="pn-in" value={itemId} onChange={e => limpiar('itemId', elegir)(e.target.value)} data-autofocus={!ok || undefined} {...aria('f-ritem', err.itemId)}>
          <option value="">Elegí qué repusiste</option>
          {GRUPOS.map(g => {
            const xs = inv.items.filter(i => i.cat === g.id && !i.kit);
            return xs.length ? <optgroup key={g.id} label={g.t}>{xs.map(x => <option key={x.id} value={x.id}>{x.brand} {x.name} · hay {inv.stock(x.id)}</option>)}</optgroup> : null;
          })}
        </select>
      </Field>
      <Cantidad id="f-rqty" label="Cantidad que entró" value={qty} onChange={limpiar('qty', setQty)} error={err.qty} autoFocus={!!ok} />
      <Plata id="f-rcost" label="Costo por unidad" value={cost} onChange={limpiar('unitCost', setCost)} error={err.unitCost} hint="Si cambió, pasa a ser el costo del producto" />
      <Field id="f-prov" label="Proveedor (opcional)" error={err.prov}>
        <input className="pn-in" maxLength={60} value={prov} onChange={e => limpiar('prov', setProv)(e.target.value)} {...aria('f-prov', err.prov)} />
      </Field>
      {it && q > 0 && (
        <p className="pn-prev" id="pn-prev">
          Stock <b className="pn-num">{s} → {s + q}</b>{c > 0 && <> · Pagaste <b className="pn-num">{fmt(q * c)}</b></>}
          <span className="pn-hint">No va como gasto: el costo se descuenta cuando lo vendés.</span>
        </p>
      )}
      <div className="pn-foot"><button className="btn btn-full" type="submit">Sumar al stock</button></div>
    </form>
  );
}

export function EditarForm({ id }: { id: string }) {
  const { hoy, inv, ajustar, moverStock, toast, closeSheet } = usePanel();
  const it = inv.byId.get(id), s0 = inv.stock(id);
  const [name, setName] = useState(it?.name ?? '');
  const [price, setPrice] = useState(it?.price != null ? String(it.price) : '');
  const [cost, setCost] = useState(it ? String(it.cost) : '');
  const [umbral, setUmbral] = useState(String(it?.umbral ?? UMBRAL));
  const [stock, setStock] = useState(String(s0));
  const { err, limpiar, fallar, alerta } = useErr();
  if (!it) return <p className="pn-empty">No encontramos ese producto.</p>;
  const conPrecio = it.price !== null, conCosto = !it.kit;
  const u = toInt(price), c = conCosto ? toInt(cost) : it.cost;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = editarSchema.safeParse({ name, price: conPrecio ? u : null, cost: conCosto ? c : null, umbral: toInt(umbral), stock: conCosto ? toInt(stock) : null });
    if (!r.success) { fallar(errores(r.error), [['name', 'f-ename'], ['price', 'f-eprice'], ['cost', 'f-ecost'], ['stock', 'f-estock'], ['umbral', 'f-eumb']]); return; }
    const v = r.data, now = ahoraReal(hoy, toast);
    if (!now) return;
    ajustar(id, { name: v.name, umbral: v.umbral, ...(v.price !== null && { price: v.price }), ...(v.cost !== null && { cost: v.cost }) });
    // Si contó otra cantidad, la diferencia queda como ajuste (con fecha y hora, como cualquier movimiento)
    if (v.stock !== null && v.stock !== s0) moverStock({ itemId: id, ymd: hoy, hm: now.hm, tipo: 'ajuste', qty: v.stock - s0, note: `Conteo: ${v.stock}` });
    toast('Maqueta: se actualizó, pero no se guardó.');
    closeSheet();
  };
  return (
    <form className="pn-form" noValidate onSubmit={submit}>
      {alerta}
      <Field id="f-ename" label="Nombre" error={err.name}>
        <input className="pn-in" maxLength={80} value={name} data-autofocus onChange={e => limpiar('name', setName)(e.target.value)} {...aria('f-ename', err.name)} />
      </Field>
      {(conPrecio || conCosto) && (
        <div className="pn-2">
          {conPrecio && <Plata id="f-eprice" label="Precio" value={price} onChange={limpiar('price', setPrice)} error={err.price} />}
          {conCosto && <Plata id="f-ecost" label="Costo" value={cost} onChange={limpiar('cost', setCost)} error={err.cost} hint="Solo lo ves vos" />}
        </div>
      )}
      {!conCosto && <p className="pn-hint">El costo de la PC es la suma de sus piezas: se cambia en cada pieza.</p>}
      {conPrecio && u > 0 && c >= 0 && (
        <p className="pn-prev" id="pn-prev">
          Ganancia por unidad <b className="pn-num">{fmtMonto(u - c)}</b> ({fmtPct((u - c) / u).replace('+', '')})
          {c >= u && <span className="pn-warn"><Icon n="info" cls="i xs" /> El costo es igual o mayor que el precio.</span>}
        </p>
      )}
      <div className="pn-2">
        {conCosto && (
          <Field id="f-estock" label="Stock contado" error={err.stock} hint="Si no coincide, queda un ajuste">
            <input className="pn-in pn-num" inputMode="numeric" value={stock} onChange={e => limpiar('stock', setStock)(e.target.value)} {...aria('f-estock', err.stock, true)} />
          </Field>
        )}
        <Field id="f-eumb" label="Avisar desde" error={err.umbral} hint="Unidades: stock bajo">
          <input className="pn-in pn-num" inputMode="numeric" value={umbral} onChange={e => limpiar('umbral', setUmbral)(e.target.value)} {...aria('f-eumb', err.umbral, true)} />
        </Field>
      </div>
      <div className="pn-foot"><button className="btn btn-full" type="submit">Aplicar cambios</button></div>
    </form>
  );
}

export function NuevoForm() {
  const { hoy, crear, toast, closeSheet } = usePanel();
  const router = useRouter();
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('1');
  const [umbral, setUmbral] = useState(String(UMBRAL));
  const { err, limpiar, fallar, alerta } = useErr();
  const u = toInt(price), c = toInt(cost);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = nuevoSchema.safeParse({ cat, brand, name, price: u, cost: c, stock: toInt(stock), umbral: toInt(umbral) });
    if (!r.success) { fallar(errores(r.error), [['cat', 'f-ncat'], ['brand', 'f-nbrand'], ['name', 'f-nname'], ['price', 'f-nprice'], ['cost', 'f-ncost'], ['stock', 'f-nstock'], ['umbral', 'f-numb']]); return; }
    const v = r.data, now = ahoraReal(hoy, toast);
    if (!now) return;
    const id = crear({ tipo: 'producto', cat: v.cat, r: CATS_NUEVO.find(x => x.id === v.cat)?.r, brand: v.brand, name: v.name, price: v.price, cost: v.cost, umbral: v.umbral, activo: true }, v.stock, now.hm);
    toast('Maqueta: se agregó al inventario, pero no se guardó.');
    closeSheet();
    router.push(`/panel/inventario/${id}`);
  };
  return (
    <form className="pn-form" noValidate onSubmit={submit}>
      {alerta}
      <Field id="f-ncat" label="Categoría" error={err.cat} hint="Las PC armadas se cargan con su lista de piezas (etapa 2).">
        <select className="pn-in" value={cat} data-autofocus onChange={e => limpiar('cat', setCat)(e.target.value)} {...aria('f-ncat', err.cat, true)}>
          <option value="">Elegí una categoría</option>
          {CATS_NUEVO.map(x => <option key={x.id} value={x.id}>{x.t}</option>)}
        </select>
      </Field>
      <div className="pn-2">
        <Field id="f-nbrand" label="Marca" error={err.brand}>
          <input className="pn-in" maxLength={40} value={brand} onChange={e => limpiar('brand', setBrand)(e.target.value)} {...aria('f-nbrand', err.brand)} />
        </Field>
        <Field id="f-nname" label="Nombre" error={err.name}>
          <input className="pn-in" maxLength={80} value={name} onChange={e => limpiar('name', setName)(e.target.value)} {...aria('f-nname', err.name)} />
        </Field>
      </div>
      <div className="pn-2">
        <Plata id="f-nprice" label="Precio" value={price} onChange={limpiar('price', setPrice)} error={err.price} />
        <Plata id="f-ncost" label="Costo" value={cost} onChange={limpiar('cost', setCost)} error={err.cost} hint="Solo lo ves vos" />
      </div>
      <div className="pn-2">
        <Field id="f-nstock" label="Stock inicial" error={err.stock}>
          <input className="pn-in pn-num" inputMode="numeric" value={stock} onChange={e => limpiar('stock', setStock)(e.target.value)} {...aria('f-nstock', err.stock)} />
        </Field>
        <Field id="f-numb" label="Avisar desde" error={err.umbral} hint="Unidades: stock bajo">
          <input className="pn-in pn-num" inputMode="numeric" value={umbral} onChange={e => limpiar('umbral', setUmbral)(e.target.value)} {...aria('f-numb', err.umbral, true)} />
        </Field>
      </div>
      {u > 0 && c >= 0 && <p className="pn-prev" id="pn-prev">Ganancia por unidad <b className="pn-num">{fmtMonto(u - c)}</b> ({fmtPct((u - c) / u).replace('+', '')})</p>}
      <div className="pn-foot"><button className="btn btn-full" type="submit">Agregar producto</button></div>
    </form>
  );
}
