'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useBag, useReducedMotion, useUI } from './app-shell';
import { Icon, Render, Wa } from './ui';
import { CATS, PRODUCTS, stockInfo, type Product } from '@/lib/data/catalog';
import { fmt } from '@/lib/format';

function Card({ p }: { p: Product }) {
  const { openQV } = useUI();
  const { add } = useBag();
  const st = stockInfo(p.stock);
  return (
    <article className="pcard" data-id={p.id}>
      <button className="p-hit" data-open={p.id} aria-label={`Ver detalles de ${p.brand} ${p.name}`} onClick={() => openQV(p.id)}></button>
      <span className="p-tag">{p.tag ?? ''}</span>
      <div className="p-img"><Render r={p.r} wall={p.wall} /></div>
      <span className="p-brand">{p.brand}</span>
      <h3 className="p-name">{p.name}</h3>
      <p className="p-spec">{p.short}</p>
      <div className="p-foot">
        <div><span className="p-price">{fmt(p.price)}</span><span className={`stock ${st.c}`}>{st.t}</span></div>
        {p.stock > 0
          ? <button className="btn btn-sm" data-add={p.id} onClick={() => add(p.id, 1)}>Comprar</button>
          : <Wa className="btn btn-sm btn-gray" text={`¡Hola! Quería saber cuándo vuelve a ingresar ${p.brand} ${p.name}.`}>Avisarme</Wa>}
      </div>
    </article>
  );
}

export function Shop() {
  const { cat, setCat, brand, setBrand, openSpot } = useUI();
  const reduce = useReducedMotion();
  const shelf = useRef<HTMLDivElement>(null);
  const prev = useRef<HTMLButtonElement>(null), next = useRef<HTMLButtonElement>(null), navEl = useRef<HTMLDivElement>(null);
  // Categoría y marca se combinan (la marca llega desde el carrusel de logos).
  const list = PRODUCTS.filter(p => (cat === 'todo' || p.cat === cat) && (!brand || p.brand === brand));

  const arrows = useCallback(() => {
    const s = shelf.current; if (!s || !prev.current || !next.current || !navEl.current) return;
    prev.current.disabled = s.scrollLeft < 8;
    next.current.disabled = s.scrollLeft + s.clientWidth >= s.scrollWidth - 8;
    navEl.current.classList.toggle('off', s.scrollWidth <= s.clientWidth + 8);
  }, []);
  useEffect(() => { shelf.current?.scrollTo({ left: 0 }); arrows(); }, [cat, brand, arrows]);
  useEffect(() => { addEventListener('resize', arrows); return () => removeEventListener('resize', arrows); }, [arrows]);
  const step = () => ((shelf.current?.querySelector<HTMLElement>('.pcard')?.offsetWidth) || 300) + 20;
  const scroll = (dir: number) => shelf.current?.scrollBy({ left: dir * step() * 2, behavior: reduce ? 'auto' : 'smooth' });

  return (
    <section className="sec alt" id="tienda" style={{ paddingBottom: 'clamp(60px,8vw,96px)' }}>
      <div className="wrap">
        <div className="head center rv">
          <span className="kicker">Tienda</span>
          <h2 className="h2">La forma más simple de comprar tu tecnología.</h2>
          <p className="lede">Stock real, precios claros y el asesoramiento de quien después le hace el service a tu equipo.</p>
          <div className="shop-links">
            <Wa className="lnk" text="¡Hola! Necesito ayuda para elegir un producto.">Te ayudamos a elegir</Wa>
            <a className="lnk" href="#notebooks">Comparar notebooks</a>
            <button className="lnk" type="button" id="shopSearch" onClick={openSpot}>Buscar un producto</button>
          </div>
        </div>
        <div className="cats rv" id="cats" role="group" aria-label="Categorías">
          {CATS.map(c => <button key={c.id} className="cat" data-cat={c.id} aria-pressed={c.id === cat} onClick={() => setCat(c.id)}><Render r={c.r} /><span>{c.t}</span></button>)}
        </div>
        {brand && (
          <div className="brand-f">
            <span className="brand-pill">Marca: <b>{brand}</b>
              <button type="button" className="brand-x" aria-label={`Quitar el filtro de ${brand}`} onClick={() => setBrand(null)}><Icon n="x" cls="i xs" /></button>
            </span>
          </div>
        )}
        <p className="sr" role="status">{brand ? `${list.length === 1 ? '1 producto' : `${list.length} productos`} de ${brand}` : ''}</p>
      </div>
      <div className="shelf" id="shelf" aria-label="Productos" ref={shelf} onScroll={arrows}>
        {list.length ? list.map(p => <Card key={p.id} p={p} />) : brand ? (
          <div className="p-empty"><b>Por ahora no hay productos {brand} en la tienda online.</b><p className="muted">Consultanos y te decimos qué hay en el local.</p>
            <Wa className="btn btn-wa btn-sm" text={`¡Hola! Busco productos ${brand}: `}><Icon n="wa" cls="i sm" />Consultar</Wa></div>
        ) : (
          <div className="p-empty"><b>Tenemos más productos en el local.</b><p className="muted">Consultanos por lo que buscás y te respondemos con stock y precio.</p>
            <Wa className="btn btn-wa btn-sm" text="¡Hola! Estoy buscando: "><Icon n="wa" cls="i sm" />Consultar</Wa></div>
        )}
      </div>
      <div className="wrap shelf-nav" ref={navEl}>
        <button className="round" id="prev" aria-label="Anteriores" ref={prev} onClick={() => scroll(-1)}><Icon n="chev-l" /></button>
        <button className="round" id="next" aria-label="Siguientes" ref={next} onClick={() => scroll(1)}><Icon n="chev-r" /></button>
      </div>
    </section>
  );
}
