'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '../ui';
import { Chips } from './chips';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { GRUPOS, grupo, ItemIc, margen } from './inventario';
import { ESTADOS_PROD, productos, resumir, type EstadoProd } from '@/lib/panel/catalogo';
import type { Item } from '@/lib/panel/inventario';
import { fmt, fmtMargen, norm } from '@/lib/format';

const CATS_PROD = GRUPOS.filter(g => g.id !== 'piezas');

// Productos: lo que se vende en la tienda, con precio, margen y si está a la vista. Cada fila abre su ficha.
// Filtros por estado, categoría y marca (también por ?estado=, ?cat= y ?marca=, que valida el servidor).
export function Productos({ estado: e0, cat: c0, marca: m0 }: { estado: EstadoProd; cat: string; marca: string }) {
  const { inv, openSheet } = usePanel();
  const [estado, setEstado] = useState<EstadoProd>(e0);
  const [cat, setCat] = useState(c0);
  const [marca, setMarca] = useState(m0);
  const [q, setQ] = useState('');
  const todos = productos(inv), r = resumir(todos, inv);
  const marcas = [...new Set(todos.map(i => i.brand))].sort((a, b) => a.localeCompare(b, 'es'));
  const t = norm(q.trim());
  const pasa = (i: Item) => (estado === 'todos' || (estado === 'activos') === i.activo) && (!cat || i.cat === cat) && (!marca || i.brand === marca)
    && (!t || norm(`${i.name} ${i.brand} ${grupo(i.cat)}`).includes(t));
  const grupos = CATS_PROD.map(g => ({ ...g, items: todos.filter(i => i.cat === g.id && pasa(i)) })).filter(g => g.items.length);
  const n = grupos.reduce((a, g) => a + g.items.length, 0);
  // La dirección refleja los filtros (se puede compartir o volver con "Atrás")
  const url = (e: EstadoProd, c: string, m: string) => {
    const p = new URLSearchParams();
    if (e !== 'todos') p.set('estado', e);
    if (c) p.set('cat', c);
    if (m) p.set('marca', m);
    const qs = p.toString();
    history.replaceState(null, '', `/panel/productos${qs ? `?${qs}` : ''}`);
  };
  return (
    <>
    <header className="pn-head">
      <h1 className="pn-t" tabIndex={-1}>Productos</h1>
      <div className="pn-btns">
        <button type="button" className="btn pn-reg" data-act="nuevo" onClick={() => openSheet({ t: 'nuevo' })}><Icon n="plus" />Nuevo producto</button>
      </div>
    </header>
    <DemoBanner />
    <div className="pn-invl">
      <dl className="pn-kpis">
        <div><dt>En la tienda</dt><dd><b className="pn-num" id="pn-p-activos">{r.activos}</b><small>de {r.n} productos</small></dd></div>
        <div><dt>Pausados</dt><dd><b className="pn-num" id="pn-p-pausados">{r.n - r.activos}</b><small>no se muestran</small></dd></div>
        <div><dt>Margen promedio</dt><dd><b className="pn-num" id="pn-p-margen">{fmtMargen(r.margen)}</b><small>sobre el precio</small></dd></div>
      </dl>
      <div className="pn-tools">
        <span className="pn-search">
          <Icon n="search" cls="i sm" />
          <input type="search" className="pn-in" id="pn-buscar" aria-label="Buscar productos" placeholder="Buscar" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
        </span>
        <Chips name="pn-estado" legend="Mostrar" value={estado} onChange={v => { setEstado(v); url(v, cat, marca); }} options={ESTADOS_PROD} />
      </div>
      <div className="pn-sels">
        <label className="pn-sel"><span>Categoría</span>
          <select className="pn-in" id="pn-f-cat" value={cat} onChange={e => { setCat(e.target.value); url(estado, e.target.value, marca); }}>
            <option value="">Todas</option>
            {CATS_PROD.map(g => <option key={g.id} value={g.id}>{g.t}</option>)}
          </select>
        </label>
        <label className="pn-sel"><span>Marca</span>
          <select className="pn-in" id="pn-f-marca" value={marca} onChange={e => { setMarca(e.target.value); url(estado, cat, e.target.value); }}>
            <option value="">Todas</option>
            {marcas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      <p className="pn-count" role="status">{n === 1 ? '1 producto' : `${n} productos`}{t ? ` para “${q.trim()}”` : ''}</p>
      {grupos.map(g => (
        <section key={g.id} className="pn-card pn-invg" data-cat={g.id} aria-labelledby={`pn-pg-${g.id}`}>
          <h2 className="pn-day" id={`pn-pg-${g.id}`}>{g.t}</h2>
          <ul className="pn-movs">
            {g.items.map(it => (
              <li key={it.id}>
                <Link className="pn-inv pn-prod" href={`/panel/productos/${it.id}`} prefetch={false} data-id={it.id} data-activo={it.activo}>
                  <ItemIc it={it} />
                  <span className="pn-rt">
                    <b>{it.name}</b>
                    <small>
                      {it.brand} · margen {margen(it)}
                      {!it.activo && <em className="pn-ns"> · Pausado</em>}
                      {it.nuevo && <em className="pn-ns"> · Sin guardar</em>}
                    </small>
                  </span>
                  <span className="pn-mamt"><b className="pn-num">{fmt(it.price ?? 0)}</b><small>{inv.stock(it.id)} u.</small></span>
                  <Icon n="chev-r" cls="i sm pn-chev" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!grupos.length && <p className="pn-empty">{t ? 'No encontramos nada con esa búsqueda.' : 'No hay productos con esos filtros.'}</p>}
    </div>
    </>
  );
}
