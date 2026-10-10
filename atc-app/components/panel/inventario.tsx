'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon, Render } from '../ui';
import { Chips } from './chips';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { CATS } from '@/lib/data/catalog';
import { FILTROS, NIVEL, type Filtro, type Item, type Nivel } from '@/lib/panel/inventario';
import { fmt, fmtPct, norm } from '@/lib/format';

/** Categorías del catálogo y, al final, las piezas con las que se arman las PC */
export const GRUPOS: { id: string; t: string }[] = [...CATS.filter(c => c.id !== 'todo').map(c => ({ id: c.id, t: c.t })), { id: 'piezas', t: 'Piezas para armar PC' }];
export const grupo = (cat: string) => GRUPOS.find(g => g.id === cat)?.t ?? cat;

export const margen = (it: Item) => (it.price ? fmtPct((it.price - it.cost) / it.price).replace('+', '') : '');
export const unidades = (n: number) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`;

/** Ícono de cada artículo: la ilustración del producto o el de la pieza */
export function ItemIc({ it, cls = '' }: { it: Item; cls?: string }) {
  return <span className={`pn-ic${it.r ? ' pn-ic-r' : ''}${cls}`}>{it.r ? <Render r={it.r} /> : <Icon n={it.icon ?? 'package'} />}</span>;
}
/** Estado del stock, con el color de la tienda ("Últimas unidades" en naranja, "Sin stock" en rojo) */
export const Lvl = ({ n, className = '' }: { n: Nivel; className?: string }) => <small className={`pn-lvl ${n}${className}`}>{NIVEL[n]}</small>;

// Inventario: cuánto hay de cada cosa y cuánto vale. Cada fila abre su ficha.
export function Inventario({ filtro: inicial }: { filtro: Filtro }) {
  const { inv, openSheet } = usePanel();
  const [filtro, setFiltro] = useState<Filtro>(inicial);
  const [q, setQ] = useState('');
  const nBajo = inv.items.filter(i => inv.nivel(i.id) === 'bajo').length;
  const nSin = inv.items.filter(i => inv.nivel(i.id) === 'sin').length;
  const t = norm(q.trim());
  const pasa = (i: Item) =>
    (filtro === 'todos' || (filtro === 'piezas' ? i.tipo === 'pieza' : inv.nivel(i.id) === filtro)) && (!t || norm(`${i.name} ${i.brand} ${grupo(i.cat)}`).includes(t));
  const grupos = GRUPOS.map(g => ({ ...g, items: inv.items.filter(i => i.cat === g.id && pasa(i)) })).filter(g => g.items.length);
  const n = grupos.reduce((a, g) => a + g.items.length, 0);

  const elegir = (f: Filtro) => {
    setFiltro(f);
    history.replaceState(null, '', f === 'todos' ? '/panel/inventario' : `/panel/inventario?filtro=${f}`);
  };
  return (
    <>
    <header className="pn-head">
      <h1 className="pn-t" tabIndex={-1}>Inventario</h1>
      <div className="pn-btns">
        <button type="button" className="btn btn-gray pn-reg" data-act="reponer" onClick={() => openSheet({ t: 'reponer' })}><Icon n="truck" />Reponer</button>
        <button type="button" className="btn pn-reg" data-act="nuevo" onClick={() => openSheet({ t: 'nuevo' })}><Icon n="plus" />Nuevo producto</button>
      </div>
    </header>
    <DemoBanner />
    <div className="pn-invl">
      <dl className="pn-kpis">
        <div><dt>Valor del stock</dt><dd><b className="pn-num" id="pn-inv-valor">{fmt(inv.valor)}</b><small>al costo</small></dd></div>
        <div><dt>Stock bajo</dt><dd><b className="pn-num" id="pn-inv-bajo">{nBajo}</b><small>{nBajo === 1 ? 'artículo' : 'artículos'}</small></dd></div>
        <div><dt>Sin stock</dt><dd><b className="pn-num" id="pn-inv-sin">{nSin}</b><small>{nSin === 1 ? 'artículo' : 'artículos'}</small></dd></div>
      </dl>
      <div className="pn-tools">
        <span className="pn-search">
          <Icon n="search" cls="i sm" />
          <input type="search" className="pn-in" id="pn-buscar" aria-label="Buscar en el inventario" placeholder="Buscar" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
        </span>
        <Chips name="pn-filtro" legend="Mostrar" value={filtro} onChange={elegir} options={FILTROS} />
      </div>
      <p className="pn-count" role="status">{n === 1 ? '1 artículo' : `${n} artículos`}{t ? ` para “${q.trim()}”` : ''}</p>
      {grupos.map(g => (
        <section key={g.id} className="pn-card pn-invg" data-cat={g.id} aria-labelledby={`pn-g-${g.id}`}>
          <h2 className="pn-day" id={`pn-g-${g.id}`}>{g.t}</h2>
          <ul className="pn-movs">
            {g.items.map(it => {
              const s = inv.stock(it.id), nv = inv.nivel(it.id);
              return (
                <li key={it.id}>
                  <Link className="pn-inv" href={`/panel/inventario/${it.id}`} prefetch={false} data-id={it.id} data-stock={s} data-nivel={nv}>
                    <ItemIc it={it} />
                    <span className="pn-rt">
                      <b>{it.name}</b>
                      <small>
                        {it.brand} · {it.price !== null ? <>{fmt(it.price)} · margen {margen(it)}</> : <>costo {fmt(it.cost)}</>}
                        {!it.activo && <em className="pn-ns"> · Pausado</em>}
                        {it.nuevo && <em className="pn-ns"> · Sin guardar</em>}
                      </small>
                    </span>
                    <span className="pn-mamt"><b className="pn-num">{s} u.</b><Lvl n={nv} /></span>
                    <Icon n="chev-r" cls="i sm pn-chev" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {!grupos.length && <p className="pn-empty">{t ? 'No encontramos nada con esa búsqueda.' : 'No hay artículos con ese filtro.'}</p>}
    </div>
    </>
  );
}
