'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from '../ui';
import { Chips } from './chips';
import { CardHead } from './card-head';
import { DemoBanner } from './demo-banner';
import { usePanel } from './panel-shell';
import { ItemIc, Lvl, grupo, margen, unidades } from './inventario';
import { stockInfo } from '@/lib/data/catalog';
import { porTramo, type Item, type StockMov, type StockTipo } from '@/lib/panel/inventario';
import { periodo, RANGES, type RangeId } from '@/lib/panel/stats';
import { productName } from '@/lib/panel/labels';
import { addDays, short } from '@/lib/panel/dates';
import { fmt, fmtMonto, fmtPct, vars } from '@/lib/format';

const pct = (p: number) => fmtPct(p).replace('+', '');
/** Fecha corta para las filas: "Hoy", "Ayer", "7 oct" o "19 dic 2025" */
const fecha = (ymd: string, hoy: string) => (ymd === hoy ? 'Hoy' : ymd === addDays(hoy, -1) ? 'Ayer' : `${short(ymd)}${ymd.slice(0, 4) === hoy.slice(0, 4) ? '' : ` ${ymd.slice(0, 4)}`}`);
const Volver = () => <Link className="pn-back" href="/panel/inventario" prefetch={false}><Icon n="chev-l" cls="i sm" />Inventario</Link>;

// Ficha de un producto o una pieza: cuánto hay, cómo se compone el precio, cuánto se vendió y cada entrada y salida.
export function Ficha({ id }: { id: string }) {
  const { inv, openSheet, ajustar, toast } = usePanel();
  const it = inv.byId.get(id);
  if (!it) return (
    <>
      <Volver />
      <h1 className="pn-t" tabIndex={-1}>No encontramos este producto</h1>
      <p className="pn-empty">En la maqueta lo cargado no se guarda: al recargar la página, los productos nuevos se pierden.</p>
    </>
  );
  const s = inv.stock(id), nv = inv.nivel(id), movs = inv.movs(id);
  const pausar = () => {
    ajustar(id, { activo: !it.activo });
    toast(it.activo ? 'Pausado: no se muestra en la tienda. Maqueta: no se guardó.' : 'Se muestra en la tienda otra vez. Maqueta: no se guardó.');
  };
  return (
    <div className="pn-ficha" data-id={id} data-stock={s} data-nivel={nv}>
      <Volver />
      <header className="pn-fhead">
        <ItemIc it={it} cls=" pn-fic" />
        <div className="pn-fhead-t">
          <p className="pn-eyebrow">{grupo(it.cat)}</p>
          <h1 className="pn-t" tabIndex={-1}>{it.name}</h1>
          <p className="pn-fsub">{it.brand}{it.short ? ` · ${it.short}` : ''}</p>
          <p className="pn-ftags">
            <Lvl n={nv} className=" pn-tag" />
            {!it.activo && <span className="pn-tag" id="pn-f-pausa">Pausado en la tienda</span>}
            {it.nuevo && <span className="pn-tag">Sin guardar</span>}
          </p>
        </div>
      </header>
      <div className="pn-facts">
        {it.price !== null && s > 0 && <button type="button" className="btn" data-act="venta" onClick={() => openSheet({ t: 'venta', productId: id })}><Icon n="bag" />Registrar venta</button>}
        {!it.kit && <button type="button" className="btn btn-gray" data-act="reponer" onClick={() => openSheet({ t: 'reponer', itemId: id })}><Icon n="truck" />Reponer</button>}
        <button type="button" className="btn btn-gray" data-act="editar" onClick={() => openSheet({ t: 'editar', itemId: id })}><Icon n="pencil" />Editar</button>
        {it.tipo === 'producto' && <button type="button" className="btn btn-gray" data-act="pausar" onClick={pausar}><Icon n={it.activo ? 'pause' : 'play'} />{it.activo ? 'Pausar en la tienda' : 'Mostrar en la tienda'}</button>}
      </div>
      <DemoBanner />
      {nv !== 'ok' && <AvisoStock it={it} s={s} />}
      <Numeros it={it} s={s} />
      <div className="pn-fgrid">
        <div className="pn-fcol">
          {it.price !== null && <Composicion it={it} />}
          {it.kit && <Piezas it={it} />}
          {it.tipo === 'pieza' && <SeUsa it={it} s={s} />}
          <Ventas it={it} movs={movs} />
        </div>
        <div className="pn-fcol"><MovStock it={it} movs={movs} s={s} /></div>
      </div>
    </div>
  );
}

function AvisoStock({ it, s }: { it: Item; s: number }) {
  const { inv, openSheet } = usePanel();
  // En una PC, lo que hay que reponer es la pieza que limita
  const lim = it.kit ? inv.alcanza(it.id).reduce((a, b) => (b.n < a.n ? b : a)) : null;
  const repo = lim ? lim.id : it.id;
  const txt = lim ? `La pieza que limita es ${inv.byId.get(lim.id)?.name ?? lim.id}: hay ${inv.stock(lim.id)}.`
    : it.price !== null ? `En la tienda se ve “${stockInfo(s).t}”.` : `Avisa desde ${unidades(it.umbral)}.`;
  return (
    <section className="pn-aviso pn-fav" aria-labelledby="pn-fav-h">
      <span className="pn-ic"><Icon n="info" /></span>
      <div className="pn-aviso-tx">
        <h2 className="pn-aviso-t" id="pn-fav-h">{s <= 0 ? 'Sin stock' : `Quedan ${unidades(s)}`}</h2>
        <p>{txt}</p>
      </div>
      <button type="button" className="pn-aviso-btn" data-act="reponer-aviso" onClick={() => openSheet({ t: 'reponer', itemId: repo })}>{lim ? 'Reponer pieza' : 'Reponer'}</button>
    </section>
  );
}

function Numeros({ it, s }: { it: Item; s: number }) {
  const { inv } = usePanel();
  if (it.price === null) {
    const usos = inv.items.flatMap(k => k.kit?.filter(([p]) => p === it.id).map(([, q]) => Math.floor(s / q)) ?? []);
    return (
      <dl className="pn-kpis pn-k4">
        <div><dt>Stock</dt><dd><b className="pn-num" id="pn-f-stock">{s} u.</b><small>hay hoy</small></dd></div>
        <div><dt>Costo</dt><dd><b className="pn-num">{fmt(it.cost)}</b><small>por unidad</small></dd></div>
        <div><dt>Valor en stock</dt><dd><b className="pn-num">{fmt(Math.max(0, s) * it.cost)}</b><small>al costo</small></dd></div>
        <div><dt>Alcanza para</dt><dd><b className="pn-num">{usos.length ? Math.min(...usos) : 0} PC</b><small>con esta pieza</small></dd></div>
      </dl>
    );
  }
  return (
    <dl className="pn-kpis pn-k4">
      <div><dt>Stock</dt><dd><b className="pn-num" id="pn-f-stock">{s} u.</b><small>{it.kit ? 'según sus piezas' : 'hay hoy'}</small></dd></div>
      <div><dt>Precio</dt><dd><b className="pn-num" id="pn-f-precio">{fmt(it.price)}</b><small>por unidad</small></dd></div>
      <div><dt>Costo</dt><dd><b className="pn-num" id="pn-f-costo">{fmt(it.cost)}</b><small>{it.kit ? 'suma de sus piezas' : 'por unidad'}</small></dd></div>
      <div><dt>Ganancia</dt><dd><b className="pn-num" id="pn-f-gan">{fmtMonto(it.price - it.cost)}</b><small id="pn-f-margen">margen {margen(it)}</small></dd></div>
    </dl>
  );
}

// Cómo se reparte el precio: el costo (en una PC, cada pieza) y la ganancia. Como la barra de almacenamiento del iPhone.
function Composicion({ it }: { it: Item }) {
  const { inv } = usePanel();
  const price = it.price ?? 0, gan = price - it.cost;
  const partes = it.kit
    ? it.kit.map(([pid, q], i) => ({ id: pid, t: `${inv.byId.get(pid)?.name ?? pid}${q > 1 ? ` × ${q}` : ''}`, v: q * (inv.byId.get(pid)?.cost ?? 0), c: `var(--pn-r${(i % 8) + 1})` }))
    : [{ id: 'costo', t: 'Costo', v: it.cost, c: 'var(--pn-r3)' }];
  const seg = gan > 0 ? [...partes, { id: 'ganancia', t: 'Ganancia', v: gan, c: 'var(--pn-up)' }] : partes;
  return (
    <section className="pn-card pn-comp" aria-labelledby="pn-comp-h">
      <CardHead id="pn-comp-h" title="Cómo se compone el precio" value={fmt(price)} sub="precio por unidad" />
      <div className="pn-share" aria-hidden="true">{seg.map(x => <i key={x.id} data-k={x.id} style={vars({ flexGrow: x.v, background: x.c })} />)}</div>
      <ul className="pn-crows">
        {seg.map(x => (
          <li key={x.id} data-k={x.id}>
            <i style={vars({ background: x.c })} aria-hidden="true" />
            <span>{x.t}</span>
            <b className="pn-num">{fmt(x.v)}</b>
            <small className="pn-num">{price > 0 ? pct(x.v / price) : '—'}</small>
          </li>
        ))}
      </ul>
      {gan <= 0 && <p className="pn-warn"><Icon n="info" cls="i xs" /> El costo es igual o mayor que el precio: con cada venta perdés {fmt(-gan)}.</p>}
    </section>
  );
}

function Piezas({ it }: { it: Item }) {
  const { inv } = usePanel();
  const al = inv.alcanza(it.id), min = Math.min(...al.map(a => a.n));
  return (
    <section className="pn-card pn-pz" aria-labelledby="pn-pz-h">
      <CardHead id="pn-pz-h" title="Piezas" value={`${min} PC`} sub="se pueden armar" />
      <ul className="pn-movs">
        {al.map(a => {
          const p = inv.byId.get(a.id);
          if (!p) return null;
          const s = inv.stock(a.id);
          return (
            <li key={a.id}>
              <Link className="pn-inv" href={`/panel/inventario/${a.id}`} prefetch={false} data-id={a.id} data-stock={s}>
                <ItemIc it={p} />
                <span className="pn-rt"><b>{p.name}</b><small>{p.brand} · {a.q} por PC</small></span>
                <span className="pn-mamt"><b className="pn-num">{s} u.</b><small className={a.n === min ? 'pn-lim' : undefined}>{a.n === min ? 'limita el stock' : `alcanza para ${a.n}`}</small></span>
                <Icon n="chev-r" cls="i sm pn-chev" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SeUsa({ it, s }: { it: Item; s: number }) {
  const { inv } = usePanel();
  const kits = inv.items.filter(k => k.kit?.some(([p]) => p === it.id));
  return (
    <section className="pn-card" aria-labelledby="pn-uso-h">
      <h2 className="pn-h2" id="pn-uso-h">Se usa en</h2>
      <ul className="pn-movs">
        {kits.map(k => {
          const q = k.kit?.find(([p]) => p === it.id)?.[1] ?? 1;
          return (
            <li key={k.id}>
              <Link className="pn-inv" href={`/panel/inventario/${k.id}`} prefetch={false} data-id={k.id}>
                <ItemIc it={k} />
                <span className="pn-rt"><b>{k.name}</b><small>{q} por PC · esta pieza alcanza para {Math.floor(Math.max(0, s) / q)}</small></span>
                <span className="pn-mamt"><b className="pn-num">{inv.stock(k.id)} PC</b><small>se pueden armar</small></span>
                <Icon n="chev-r" cls="i sm pn-chev" />
              </Link>
            </li>
          );
        })}
      </ul>
      {!kits.length && <p className="pn-empty">Ninguna PC armada la usa.</p>}
    </section>
  );
}

const RANGOS: RangeId[] = ['30d', '3m', '12m'];
// Ventas del producto (o uso de la pieza) en el período, con una barra por tramo.
function Ventas({ it, movs }: { it: Item; movs: StockMov[] }) {
  const { hoy } = usePanel();
  const [r, setR] = useState<RangeId>('3m');
  const per = useMemo(() => periodo(r, hoy), [r, hoy]);
  const tr = useMemo(() => porTramo(movs, per), [movs, per]);
  const u = tr.reduce((a, t) => a + t.unidades, 0), v = tr.reduce((a, t) => a + t.ventas, 0), g = tr.reduce((a, t) => a + t.ganancia, 0);
  const max = Math.max(1, ...tr.map(t => t.unidades));
  const pieza = it.price === null;
  return (
    <section className="pn-card pn-fv" aria-labelledby="pn-fv-h">
      <CardHead id="pn-fv-h" title={pieza ? 'Uso en PC armadas' : 'Ventas'} value={`${u} u.`} valueId="pn-fv-u" sub={pieza ? 'usadas' : 'vendidas'} />
      <Chips variant="seg" name="pn-fv-r" legend="Período" value={r} onChange={setR} options={RANGOS.map(x => [x, RANGES[x].chip])} />
      {!pieza && (
        <dl className="pn-ext">
          <div><dt>Vendido</dt><dd><b className="pn-num" id="pn-fv-v">{fmt(v)}</b></dd></div>
          <div><dt>Ganancia</dt><dd><b className="pn-num">{fmtMonto(g)}</b></dd></div>
        </dl>
      )}
      <div className="pn-vb" aria-hidden="true">{tr.map((t, i) => <i key={t.from} data-u={t.unidades} style={vars({ '--s': (t.unidades / max).toFixed(4), '--i': i })} />)}</div>
      <p className="pn-vbx" aria-hidden="true"><span>{tr[0]?.label}</span><span>{tr[tr.length - 1]?.label}</span></p>
      <div className="sr"><table>
        <caption>{pieza ? 'Unidades usadas' : 'Unidades vendidas'}, {RANGES[r].label.toLowerCase()}</caption>
        <thead><tr><th scope="col">Período</th><th scope="col">Unidades</th></tr></thead>
        <tbody>{tr.map(t => <tr key={t.from}><th scope="row">{t.label}</th><td>{t.unidades}</td></tr>)}</tbody>
      </table></div>
    </section>
  );
}

const TIPO: Record<StockTipo, [string, string]> = { venta: ['Venta', 'bag'], repo: ['Reposición', 'truck'], ajuste: ['Ajuste por conteo', 'refresh'], alta: ['Alta del producto', 'plus'] };
const PASO = 8;
// Cada entrada y salida, del más nuevo al más viejo, con el stock que quedó.
function MovStock({ it, movs, s }: { it: Item; movs: StockMov[]; s: number }) {
  const { hoy } = usePanel();
  const [n, setN] = useState(PASO);
  return (
    <section className="pn-card pn-fm" aria-labelledby="pn-fm-h">
      <CardHead id="pn-fm-h" title="Movimientos de stock" value={`${s} u.`} sub="hay hoy" />
      {it.kit && <p className="pn-fnote">El stock de la PC sale de sus piezas: baja con cada venta y sube cuando reponés la pieza que limita.</p>}
      <ul className="pn-movs">
        {movs.slice(0, n).map(m => {
          const [t, ic] = m.para ? [`Armado de ${productName(m.para)}`, 'wrench'] : TIPO[m.tipo];
          return (
            <li key={m.id} className="pn-sm" data-tipo={m.tipo} data-qty={m.qty} data-despues={m.despues}>
              <span className={`pn-mic ${m.tipo}`}><Icon n={ic} /></span>
              <span className="pn-rt">
                <b>{t}</b>
                <small>{fecha(m.ymd, hoy)}, {m.hm}{m.ref ? ` · ${m.ref}` : ''}{m.note ? ` · ${m.note}` : ''}{m.status === 'sin-guardar' && <em className="pn-ns"> · Sin guardar</em>}</small>
              </span>
              <span className="pn-mamt"><b className="pn-num">{m.qty > 0 ? '+' : '−'}{Math.abs(m.qty)}</b><small className="pn-num">{m.qty < 0 ? 'quedan' : 'hay'} {m.despues}</small></span>
            </li>
          );
        })}
      </ul>
      {!movs.length && <p className="pn-empty">Todavía no hay movimientos.</p>}
      {movs.length > PASO && (
        <button type="button" className="btn btn-gray pn-more" aria-disabled={n >= movs.length || undefined} onClick={() => { if (n < movs.length) setN(x => x + PASO); }}>
          {n < movs.length ? 'Mostrar más' : 'No hay movimientos más viejos'}
        </button>
      )}
    </section>
  );
}
