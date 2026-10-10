'use client';

import Link from 'next/link';
import { Icon } from '../ui';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { ItemIc, Lvl } from './inventario';
import { porProveedor } from '@/lib/panel/catalogo';
import { short } from '@/lib/panel/dates';
import { fmt } from '@/lib/format';

// Proveedores (de ejemplo): qué provee cada uno, cuándo fue la última reposición, cuánto se le compró en el año y un
// atajo para registrar lo que llegó. Los artículos con stock bajo aparecen primero.
export function Proveedores() {
  const { inv, hoy, openSheet } = usePanel();
  const filas = porProveedor(inv, hoy);
  return (
    <>
    <header className="pn-head"><h1 className="pn-t" tabIndex={-1}>Proveedores</h1></header>
    <DemoBanner />
    <div className="pn-invl">
      {filas.map(p => {
        const orden = [...p.items].sort((a, b) => ['sin', 'bajo', 'ok'].indexOf(inv.nivel(a.id)) - ['sin', 'bajo', 'ok'].indexOf(inv.nivel(b.id)) || a.name.localeCompare(b.name, 'es'));
        const ult = p.ultima, uit = ult ? inv.byId.get(ult.itemId) : undefined;
        return (
          <section key={p.id} className="pn-card pn-prov" data-prov={p.id} aria-labelledby={`pn-pv-${p.id}`}>
            <header className="pn-prov-h">
              <span className="pn-ic"><Icon n="truck" /></span>
              <div className="pn-rt"><h2 className="pn-h2" id={`pn-pv-${p.id}`}>{p.nombre}</h2><small>{p.rubro}</small></div>
            </header>
            <dl className="pn-dl pn-prov-dl">
              <div><dt>Contacto</dt><dd>{p.contacto}</dd></div>
              <div><dt>Última reposición</dt><dd>{ult && uit ? <>{short(ult.ymd)} · {ult.qty} × {uit.name}</> : 'Todavía ninguna'}</dd></div>
              <div><dt>Comprado en los últimos 12 meses</dt><dd className="pn-num" data-comprado={p.comprado}>{fmt(p.comprado)}</dd></div>
            </dl>
            <details className="pn-how pn-prov-arts">
              <summary>{p.items.length === 1 ? '1 artículo' : `${p.items.length} artículos`}{p.bajo > 0 && <b className="pn-bajo">· {p.bajo} para reponer</b>}</summary>
              <ul className="pn-movs">
                {orden.map(it => (
                  <li key={it.id}>
                    <Link className="pn-inv" href={`/panel/inventario/${it.id}`} prefetch={false} data-id={it.id}>
                      <ItemIc it={it} />
                      <span className="pn-rt"><b>{it.name}</b><small>{it.brand} · costo {fmt(it.cost)}</small></span>
                      <span className="pn-mamt"><b className="pn-num">{inv.stock(it.id)} u.</b><Lvl n={inv.nivel(it.id)} /></span>
                      <Icon n="chev-r" cls="i sm pn-chev" />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <button type="button" className="btn btn-gray pn-reg" data-act="reponer-prov" onClick={() => openSheet({ t: 'reponer', prov: p.id })}><Icon n="truck" />Registrar lo que llegó</button>
          </section>
        );
      })}
    </div>
    </>
  );
}
