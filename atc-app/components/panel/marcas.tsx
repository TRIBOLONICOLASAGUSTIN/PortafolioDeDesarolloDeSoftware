'use client';

import Link from 'next/link';
import { LOGOS } from '../brand-logos';
import { Icon } from '../ui';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { porMarca } from '@/lib/panel/catalogo';
import { MARCAS_CARRUSEL } from '@/lib/data/marcas';
import { fmt } from '@/lib/format';

// Marcas: las de los productos y las del carrusel de la tienda. Una marca en el carrusel sin productos cargados se marca
// para revisar (CLAUDE.md: en el carrusel van solo marcas que el local vende de verdad).
export function Marcas() {
  const { inv } = usePanel();
  const filas = porMarca(inv, MARCAS_CARRUSEL.filter(m => LOGOS[m]));
  const revisar = filas.filter(f => f.carrusel && f.n === 0).length;
  return (
    <>
    <header className="pn-head"><h1 className="pn-t" tabIndex={-1}>Marcas</h1></header>
    <DemoBanner />
    <div className="pn-invl">
      {revisar > 0 && <p className="pn-demo" id="pn-m-revisar"><Icon n="info" cls="i sm" /><span><b>{revisar === 1 ? '1 marca del carrusel' : `${revisar} marcas del carrusel`} sin productos cargados.</b> Confirmá que las vendés; si no, conviene sacarlas del carrusel.</span></p>}
      <ul className="pn-card pn-movs pn-marcas">
        {filas.map(f => {
          const cuerpo = (
            <>
              <span className="pn-ic pn-mlogo" aria-hidden="true">{LOGOS[f.marca] ? <svg viewBox={LOGOS[f.marca].vb}><path d={LOGOS[f.marca].d} /></svg> : <b>{f.marca.slice(0, 2).toUpperCase()}</b>}</span>
              <span className="pn-rt">
                <b>{f.marca}</b>
                <small>{f.n === 0 ? 'Sin productos cargados' : `${f.n === 1 ? '1 producto' : `${f.n} productos`} · ${f.unidades} u. · ${fmt(f.valor)} al costo`}</small>
              </span>
              <span className="pn-mtags">{f.carrusel && <small className={`pn-mtag${f.n ? '' : ' rev'}`}>{f.n ? 'En el carrusel' : 'En el carrusel · revisar'}</small>}</span>
            </>
          );
          return (
            <li key={f.marca} data-marca={f.marca} data-n={f.n}>
              {f.n > 0 ? <Link className="pn-inv" href={`/panel/productos?marca=${encodeURIComponent(f.marca)}`} prefetch={false}>{cuerpo}</Link> : <div className="pn-inv">{cuerpo}</div>}
            </li>
          );
        })}
      </ul>
    </div>
    </>
  );
}
