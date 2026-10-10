'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon, Render } from '../ui';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { CATS } from '@/lib/data/catalog';
import { productos, resumir } from '@/lib/panel/catalogo';
import { fmt, fmtPct } from '@/lib/format';

const pct = (p: number | null) => (p === null ? '—' : fmtPct(p).replace('+', ''));

// Categorías de la tienda: cuántos productos tiene cada una, cuánto vale su stock, su margen promedio y si se muestra
// en la tienda. Maqueta: ocultar una categoría no cambia la tienda (se guarda en la etapa 2).
export function CatalogoCategorias() {
  const { inv, toast } = usePanel();
  const [ocultas, setOcultas] = useState<string[]>([]);
  const todos = productos(inv);
  const cambiar = (id: string, t: string) => {
    const oculta = !ocultas.includes(id);
    setOcultas(o => (oculta ? [...o, id] : o.filter(x => x !== id)));
    toast(`${t}: ${oculta ? 'oculta en la tienda' : 'se muestra en la tienda'}. Maqueta: la tienda no cambia.`);
  };
  return (
    <>
    <header className="pn-head"><h1 className="pn-t" tabIndex={-1}>Categorías</h1></header>
    <DemoBanner />
    <div className="pn-invl">
      <ul className="pn-card pn-movs pn-cats">
        {CATS.filter(c => c.id !== 'todo').map(c => {
          const r = resumir(todos.filter(i => i.cat === c.id), inv), visible = !ocultas.includes(c.id);
          return (
            <li key={c.id} className="pn-catrow" data-cat={c.id} data-visible={visible}>
              <Link className="pn-inv" href={`/panel/productos?cat=${c.id}`} prefetch={false}>
                <span className="pn-ic pn-ic-r"><Render r={c.r} /></span>
                <span className="pn-rt"><b>{c.t}</b><small>{r.n === 1 ? '1 producto' : `${r.n} productos`} · {r.unidades} u. · margen {pct(r.margen)}</small></span>
                <span className="pn-mamt"><b className="pn-num">{fmt(r.valor)}</b><small>stock al costo</small></span>
              </Link>
              <label className="pn-tgl">
                <input type="checkbox" role="switch" checked={visible} onChange={() => cambiar(c.id, c.t)} aria-label={`Mostrar ${c.t} en la tienda`} />
                <span aria-hidden="true" />
              </label>
            </li>
          );
        })}
      </ul>
      <p className="pn-hint"><Icon n="info" cls="i sm" /> Tocá una categoría para ver sus productos. El interruptor la muestra u oculta en la tienda (en la maqueta no se guarda).</p>
    </div>
    </>
  );
}
