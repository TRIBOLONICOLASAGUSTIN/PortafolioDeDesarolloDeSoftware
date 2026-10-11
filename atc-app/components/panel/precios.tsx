'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '../ui';
import { Chips } from './chips';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { GRUPOS, ItemIc } from './inventario';
import { productos } from '@/lib/panel/catalogo';
import { bajoCosto, margenDe, PCT_MAX, PCT_MIN, previsualizar, REDONDEOS, type Alcance, type Redondeo } from '@/lib/panel/precios';
import { csvPrecios } from '@/lib/panel/csv';
import { fmt, fmtPct } from '@/lib/format';

const pct = (p: number) => fmtPct(p).replace('+', '');
const CATS_PROD = GRUPOS.filter(g => g.id !== 'piezas');
/** "todo", "cat:insumos" o "marca:HP" (el valor del select) */
const alcanceDe = (v: string): Alcance => (v.startsWith('cat:') ? { t: 'cat', id: v.slice(4) } : v.startsWith('marca:') ? { t: 'marca', id: v.slice(6) } : { t: 'todo' });
/** "10", "-5", "7,5" → número (o NaN) */
const aNumero = (s: string) => (/^\s*[−-]?\d{1,3}([.,]\d{1,2})?\s*$/.test(s) ? Number(s.trim().replace('−', '-').replace(',', '.')) : NaN);

// Lista de precios: costo, precio y margen de cada producto, y un aumento (o rebaja) en % para todo, una categoría o
// una marca, con redondeo y vista previa antes de aplicar. Maqueta: el cambio dura lo que la visita.
export function Precios() {
  const { inv, ajustar, toast } = usePanel();
  const [alc, setAlc] = useState('todo');
  const [txt, setTxt] = useState('');
  const [red, setRed] = useState<Redondeo>('999');
  const todos = productos(inv);
  const marcas = [...new Set(todos.map(i => i.brand))].sort((a, b) => a.localeCompare(b, 'es'));
  const n = aNumero(txt), valido = Number.isFinite(n) && n >= PCT_MIN && n <= PCT_MAX && n !== 0;
  const vacio = txt.trim() === '', err = !vacio && !valido;
  const cambios = valido ? previsualizar(todos, alcanceDe(alc), n, red) : [];
  const bajo = cambios.filter(bajoCosto).length;
  const aplicar = () => {
    for (const c of cambios) ajustar(c.id, { price: c.despues });
    toast(`${cambios.length === 1 ? 'Se cambió 1 precio' : `Se cambiaron ${cambios.length} precios`}. Maqueta: no se guardó.`);
  };
  const exportar = () => {
    const rows = CATS_PROD.flatMap(g => todos.filter(i => i.cat === g.id).map(i => ({ cat: g.t, marca: i.brand, nombre: i.name, costo: i.cost, precio: i.price ?? 0, margen: margenDe(i.price ?? 0, i.cost) })));
    const url = URL.createObjectURL(new Blob([csvPrecios(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'atc-lista-de-precios-EJEMPLO.csv';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Se descargó la lista de precios (datos de ejemplo).');
  };
  return (
    <>
    <header className="pn-head">
      <h1 className="pn-t" tabIndex={-1}>Lista de precios</h1>
      <div className="pn-btns">
        <button type="button" className="btn btn-gray pn-reg" data-act="exportar-precios" onClick={exportar}><Icon n="download" />Exportar planilla</button>
      </div>
    </header>
    <DemoBanner />
    <div className="pn-invl">
      <section className="pn-card pn-aum" aria-labelledby="pn-aum-t">
        <h2 className="pn-h2" id="pn-aum-t">Cambiar precios</h2>
        <p className="pn-hint">Un aumento (o una rebaja, con signo menos) para todos los productos, una categoría o una marca. Antes de aplicar ves cómo queda cada uno.</p>
        <div className="pn-aum-f">
          <label className="pn-sel"><span>A qué productos</span>
            <select className="pn-in" id="pn-aum-alc" value={alc} onChange={e => setAlc(e.target.value)}>
              <option value="todo">Todos los productos</option>
              <optgroup label="Categoría">{CATS_PROD.map(g => <option key={g.id} value={`cat:${g.id}`}>{g.t}</option>)}</optgroup>
              <optgroup label="Marca">{marcas.map(m => <option key={m} value={`marca:${m}`}>{m}</option>)}</optgroup>
            </select>
          </label>
          <label className="pn-sel"><span>Porcentaje</span>
            <span className="pn-pct">
              <input className="pn-in pn-num" id="pn-aum-pct" autoComplete="off" placeholder="p. ej. 10" value={txt} onChange={e => setTxt(e.target.value)}
                aria-invalid={err || undefined} aria-describedby="pn-aum-err" />
              <span aria-hidden="true">%</span>
            </span>
          </label>
        </div>
        <div className="pn-fld">
          <span className="pn-lab" aria-hidden="true">Redondeo</span>
          <Chips name="pn-aum-red" legend="Redondeo" value={red} onChange={setRed} options={REDONDEOS} />
        </div>
        <p className="pn-warn-t" id="pn-aum-err" role={err ? 'alert' : undefined}>{err ? 'Escribí un porcentaje entre −50 y 100 (por ejemplo 10 o −5).' : ''}</p>
        {valido && (
          <div className="pn-prev-l">
            <p className="pn-count" id="pn-aum-n" role="status">{cambios.length === 0 ? 'Con ese redondeo ningún precio cambia.' : cambios.length === 1 ? 'Cambia 1 precio' : `Cambian ${cambios.length} precios`}{bajo > 0 && <b className="pn-bajo"> · {bajo === 1 ? '1 queda' : `${bajo} quedan`} por debajo del costo</b>}</p>
            {cambios.length > 0 && (
              <ul className="pn-movs pn-cambios">
                {cambios.map(c => {
                  const it = inv.byId.get(c.id)!;
                  return (
                    <li key={c.id} className="pn-cambio" data-id={c.id} data-antes={c.antes} data-despues={c.despues}>
                      <ItemIc it={it} />
                      <span className="pn-rt"><b>{it.name}</b><small>margen {pct(c.margenAntes)}<span aria-hidden="true"> → </span><span className="sr"> pasa a </span>{pct(c.margenDespues)}{bajoCosto(c) && <em className="pn-ns"> · debajo del costo</em>}</small></span>
                      <span className="pn-mamt"><b className="pn-num">{fmt(c.despues)}</b><small><span className="sr">antes </span><s>{fmt(c.antes)}</s></small></span>
                    </li>
                  );
                })}
              </ul>
            )}
            {cambios.length > 0 && <button type="button" className="btn btn-full" id="pn-aum-ok" onClick={aplicar}><Icon n="check" />Aplicar {cambios.length === 1 ? '1 cambio' : `${cambios.length} cambios`}</button>}
          </div>
        )}
      </section>
      {CATS_PROD.map(g => {
        const xs = todos.filter(i => i.cat === g.id);
        return xs.length ? (
          <section key={g.id} className="pn-card pn-invg" data-cat={g.id} aria-labelledby={`pn-lp-${g.id}`}>
            <h2 className="pn-day" id={`pn-lp-${g.id}`}>{g.t}</h2>
            <ul className="pn-movs">
              {xs.map(it => (
                <li key={it.id}>
                  <Link className="pn-inv pn-lprecio" href={`/panel/productos/${it.id}`} prefetch={false} data-id={it.id} data-precio={it.price ?? 0}>
                    <ItemIc it={it} />
                    <span className="pn-rt"><b>{it.name}</b><small>{it.brand} · costo {fmt(it.cost)} · margen {pct(margenDe(it.price ?? 0, it.cost))}</small></span>
                    <span className="pn-mamt"><b className="pn-num">{fmt(it.price ?? 0)}</b></span>
                    <Icon n="chev-r" cls="i sm pn-chev" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null;
      })}
    </div>
    </>
  );
}
