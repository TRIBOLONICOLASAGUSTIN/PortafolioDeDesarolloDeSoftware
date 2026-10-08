'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useBag, useReducedMotion, useUI } from './app-shell';
import { Icon, Render, Wa } from './ui';
import { byId, CATS, PAGES, PRODUCTS, stockInfo } from '@/lib/data/catalog';
import { fmt, norm } from '@/lib/format';
import { bagMessage, bagSubtotal, PAYS, waLink } from '@/lib/whatsapp';

/** Lleva el foco a un elemento de la ventana cuando se abre. */
function useFocusOnOpen(open: boolean, root: React.RefObject<HTMLElement | null>, sel: string) {
  useEffect(() => { if (open) root.current?.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true }); }, [open, root, sel]);
}

/* ---------------- Ficha de producto ---------------- */
function QuickView() {
  const { layer, qvId, closeLayer } = useUI();
  const { bag, add } = useBag();
  const open = layer === 'qv';
  const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(1);
  useEffect(() => { if (open) setQ(1); }, [open, qvId]);
  useFocusOnOpen(open, ref, '[data-close]');
  const p = qvId ? byId[qvId] : null;
  const max = p ? Math.max(0, p.stock - (bag.items[p.id] || 0)) : 0;
  const qq = Math.min(q, Math.max(1, max));
  const st = p ? stockInfo(p.stock) : null;
  return (
    <div className={`qv${open ? ' open' : ''}`} id="qv" role="dialog" aria-modal="true" aria-labelledby="qvName" inert={!open} ref={ref}>
      <button className="x-btn" data-close aria-label="Cerrar" onClick={closeLayer}><Icon n="x" /></button>
      <div className="qv-img" id="qvImg">{p && <Render r={p.r} wall={p.wall} />}</div>
      <div className="qv-info" id="qvInfo">
        {p && st && <>
          <span className="p-tag">{p.tag ?? ''}</span>
          <span className="p-brand" style={{ marginTop: 4 }}>{p.brand}</span>
          <h3 id="qvName">{p.name}</h3>
          <p className="qv-price">{fmt(p.price)} <span className={`stock ${st.c}`} style={{ display: 'inline', marginLeft: 8 }}>{st.t}</span></p>
          <ul className="qv-specs">{p.specs.map(s => <li key={s}><Icon n="check" />{s}</li>)}</ul>
          {p.stock > 0 && (
            <div className="qv-buy">
              <div className="qty" role="group" aria-label={`Cantidad: ${qq}`}>
                <button data-qq="-1" aria-label="Menos" disabled={qq <= 1} onClick={() => setQ(qq - 1)}><Icon n="minus" cls="i sm" /></button>
                <span>{qq}</span>
                <button data-qq="1" aria-label="Más" disabled={qq >= max} onClick={() => setQ(qq + 1)}><Icon n="plus" cls="i sm" /></button>
              </div>
              <button className="btn" data-qv-add disabled={max <= 0} onClick={() => { add(p.id, qq); closeLayer(); }}>{max <= 0 ? 'Ya está en tu bolsa' : 'Agregar a la bolsa'}</button>
            </div>
          )}
          <Wa className="lnk qv-alt" style={{ fontSize: 15 }} text={p.stock > 0 ? `¡Hola! Me interesa ${p.brand} ${p.name} (${fmt(p.price)}). ¿Está disponible?` : `¡Hola! Quería saber cuándo vuelve a ingresar ${p.brand} ${p.name}.`}>
            {p.stock > 0 ? 'Consultar por WhatsApp' : 'Avisarme cuando ingrese'}
          </Wa>
          <p className="qv-note"><Icon n="store" cls="i sm" />Retiralo en el local o coordinamos el envío por WhatsApp.</p>
        </>}
      </div>
    </div>
  );
}

/* ---------------- Bolsa ---------------- */
function Bag() {
  const { layer, closeLayer } = useUI();
  const { bag, count, setQty, remove, patch } = useBag();
  const open = layer === 'bag';
  const ref = useRef<HTMLElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  useFocusOnOpen(open, ref, '[data-close]');
  const ids = Object.keys(bag.items);
  const setEntrega = (e: 'retiro' | 'envio') => { patch({ entrega: e }); if (e === 'envio') requestAnimationFrame(() => dirRef.current?.focus()); };
  return (
    <aside className={`bag${open ? ' open' : ''}`} id="bag" role="dialog" aria-modal="true" aria-labelledby="bagTitle" inert={!open} ref={ref}>
      <button className="x-btn" data-close aria-label="Cerrar" onClick={closeLayer}><Icon n="x" /></button>
      <div className="bag-h"><h3 id="bagTitle">Tu bolsa</h3>
        <p id="bagSub">{count ? `${count} producto${count > 1 ? 's' : ''} · lo enviamos por WhatsApp, sin pagar online.` : 'Revisá tu pedido y lo enviamos por WhatsApp.'}</p></div>
      <div className="bag-b" id="bagBody">
        {!ids.length ? (
          <div className="empty"><Render r="all" /><b>Tu bolsa está vacía.</b><p>Agregá productos y te los reservamos por WhatsApp.</p><a className="btn" href="#tienda" onClick={closeLayer}>Ir a la tienda</a></div>
        ) : <>
          {ids.map(id => {
            const p = byId[id], q = bag.items[id];
            return (
              <div key={id} className="bi"><div className="bi-img"><Render r={p.r} wall={p.wall} /></div><div>
                <b>{p.brand} {p.name}</b><small>{p.short}</small>
                <div className="bi-row">
                  <div className="qty sm" role="group" aria-label={`Cantidad de ${p.name}: ${q}`}>
                    <button data-bq="-1" data-id={id} aria-label="Quitar uno" onClick={() => setQty(id, q - 1)}><Icon n="minus" /></button><span>{q}</span>
                    <button data-bq="1" data-id={id} aria-label="Agregar uno" disabled={q >= p.stock} onClick={() => setQty(id, q + 1)}><Icon n="plus" /></button>
                  </div>
                  <span className="pr">{fmt(p.price * q)}</span>
                </div>
                <button className="rm" data-rm={id} onClick={() => { remove(id); ref.current?.querySelector<HTMLElement>('[data-close]')?.focus(); }}>Eliminar</button>
              </div></div>
            );
          })}
          <p className="bl">¿Cómo lo recibís?</p>
          <div className="seg" role="group" aria-label="Entrega">
            <button data-ent="retiro" aria-pressed={bag.entrega === 'retiro'} onClick={() => setEntrega('retiro')}>Retiro en el local<small>Sin costo</small></button>
            <button data-ent="envio" aria-pressed={bag.entrega === 'envio'} onClick={() => setEntrega('envio')}>Envío a domicilio<small>A coordinar por WhatsApp</small></button>
          </div>
          {bag.entrega === 'envio' && <label className="inp"><Icon n="pin" cls="i sm" /><input id="bDir" ref={dirRef} aria-label="Dirección de entrega" placeholder="Dirección o barrio" value={bag.dir} autoComplete="street-address" maxLength={120} onChange={e => patch({ dir: e.target.value })} /></label>}
          <p className="bl">¿Cómo pagás?</p>
          <div className="pays" role="group" aria-label="Medio de pago">{PAYS.map(([k, t]) => <button key={k} data-pay={k} aria-pressed={bag.pago === k} onClick={() => patch({ pago: k })}>{t}</button>)}</div>
          <label className="bl" htmlFor="bName" style={{ display: 'block' }}>Tu nombre <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <label className="inp"><Icon n="user" cls="i sm" /><input id="bName" placeholder="Para identificar tu pedido" value={bag.nombre} autoComplete="given-name" maxLength={60} onChange={e => patch({ nombre: e.target.value })} /></label>
        </>}
      </div>
      <div className="bag-f" id="bagFoot">{ids.length > 0 && <>
        <div className="tot"><span>Subtotal</span><b>{fmt(bagSubtotal(bag))}</b></div>
        <a className="btn btn-wa btn-full" id="checkout" href={waLink(bagMessage(bag))} target="_blank" rel="noopener"><Icon n="wa" />Finalizar pedido por WhatsApp</a>
        <p className="bag-note">Te confirmamos stock, envío y total por chat. No se cobra nada online.</p>
      </>}</div>
    </aside>
  );
}

/* ---------------- Búsqueda (Ctrl+K) ---------------- */
type Item = { k: 'p'; p: (typeof PRODUCTS)[number] } | { k: 'g'; p: (typeof PAGES)[number] };

function Spotlight() {
  const { layer, closeLayer, openQV } = useUI();
  const reduce = useReducedMotion();
  const open = layer === 'spot';
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => { if (open) { setQ(''); setSel(0); input.current?.focus({ preventScroll: true }); } }, [open]);

  const { prods, pages, items } = useMemo(() => {
    const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
    const m = (s: string) => terms.every(t => norm(s).includes(t));
    const prods = PRODUCTS.filter(p => m(`${p.brand} ${p.name} ${p.short} ${CATS.find(c => c.id === p.cat)?.t}`));
    const pages = PAGES.filter(p => m(p.t));
    const items: Item[] = [...prods.map(p => ({ k: 'p' as const, p })), ...pages.map(p => ({ k: 'g' as const, p }))];
    return { prods, pages, items };
  }, [q]);
  const cur = Math.min(sel, Math.max(0, items.length - 1));
  useEffect(() => { list.current?.querySelector(`#si-${cur}`)?.scrollIntoView({ block: 'nearest' }); }, [cur]);

  const act = (it?: Item) => {
    if (!it) return;
    if (it.k === 'p') { openQV(it.p.id); return; }
    closeLayer();
    document.querySelector(it.p.h)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((cur + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((cur - 1 + items.length) % items.length); }
    else if (e.key === 'Enter') { e.preventDefault(); act(items[cur]); }
  };
  const row = (i: number, img: React.ReactNode, body: React.ReactNode) => (
    <li key={i} className="si" role="option" id={`si-${i}`} data-i={i} aria-selected={i === cur} onClick={() => act(items[i])} onMouseMove={() => i !== cur && setSel(i)}>
      <span className="si-img">{img}</span><div>{body}</div>
    </li>
  );
  return (
    <div className={`spot${open ? ' open' : ''}`} id="spot" role="dialog" aria-modal="true" aria-label="Buscar" inert={!open}>
      <div className="spot-in"><Icon n="search" />
        <input id="sIn" ref={input} role="combobox" aria-expanded="true" aria-autocomplete="list" aria-label="Buscar productos y secciones" aria-controls="sList"
          aria-activedescendant={items.length ? `si-${cur}` : ''} placeholder="Buscar productos, servicios o secciones" autoComplete="off" maxLength={80}
          value={q} onChange={e => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} />
        <kbd>Esc</kbd><button className="spot-x" type="button" data-close onClick={closeLayer}>Cancelar</button>
      </div>
      <ul className="spot-list" id="sList" role="listbox" aria-label="Resultados" ref={list}>
        {!items.length ? (
          <li className="s-empty">No encontramos “{q.trim()}” en la web.<br />Puede que lo tengamos en el local.<br />
            <Wa className="btn btn-wa btn-sm" text={`¡Hola! ¿Tienen ${q.trim()}?`}><Icon n="wa" cls="i sm" />Consultar por WhatsApp</Wa></li>
        ) : <>
          {prods.length > 0 && <li className="sg" role="presentation">Productos</li>}
          {prods.map((p, i) => row(i, <Render r={p.r} wall={p.wall} />, <><b>{p.brand} {p.name}</b><small>{fmt(p.price)} · {stockInfo(p.stock).t}</small></>))}
          {pages.length > 0 && <li className="sg" role="presentation">Secciones</li>}
          {pages.map((g, j) => row(prods.length + j, <Icon n={g.ic} />, <b>{g.t}</b>))}
        </>}
      </ul>
    </div>
  );
}

/* ---------------- Avisos ---------------- */
function Toasts() {
  const { toasts, endToast } = useUI();
  return (
    <div className="toasts" id="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast${t.action ? '' : ' no-act'}${t.out ? ' out' : ''}`} onAnimationEnd={() => t.out && endToast(t.id)}>
          <Icon n="check-c" /><span>{t.msg}</span>
          {t.action && <button type="button" onClick={() => { t.action!.run(); endToast(t.id); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

export function Layers() {
  const { layer, closeLayer } = useUI();
  return (
    <>
      <div className="layers">
        <div className={`scrim${layer ? ' open' : ''}`} id="scrim" onClick={closeLayer}></div>
        <QuickView />
        <Bag />
        <Spotlight />
      </div>
      <Toasts />
    </>
  );
}
