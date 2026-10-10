'use client';

import { useEffect, useRef } from 'react';
import { useUI } from './app-shell';
import { BrandLogo, LOGOS } from './brand-logos';

// Único bucle aprobado (CLAUDE.md): lento, se pausa con el mouse, con el foco y fuera de pantalla, quieto con
// "reducir movimiento". Cada logo lleva a la tienda filtrada por esa marca.
// La segunda copia de las marcas existe solo para que el bucle no tenga corte: se puede tocar con el mouse o el dedo,
// pero los lectores de pantalla no la leen y el teclado no pasa por ella (tabIndex -1).
// Se muestran las marcas que tienen logo (las demás esperan el SVG oficial de la marca).
export function Marquee({ brands }: { brands: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { setCat, setBrand } = useUI();
  const shown = brands.filter(b => LOGOS[b]);
  useEffect(() => {
    const mq = ref.current; if (!mq) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => mq.classList.toggle('on', e.isIntersecting && !reduce));
    io.observe(mq);
    return () => io.disconnect();
  }, []);
  // El salto a #tienda lo hace el navegador (como GoCat); acá solo se fija el filtro.
  const elegir = (b: string) => { setCat('todo'); setBrand(b); };
  const logo = (b: string, copy?: boolean) => (
    <a key={copy ? `${b}-2` : b} className="bl-a" href="#tienda" data-brand={b} onClick={() => elegir(b)}
      aria-label={copy ? undefined : `Ver productos ${b}`} aria-hidden={copy || undefined} tabIndex={copy ? -1 : undefined}>
      <BrandLogo name={b} deco />
    </a>
  );
  return (
    <div className="mq" id="mq" ref={ref}>
      <div className="mq-track">
        {shown.map(b => logo(b))}
        {shown.map(b => logo(b, true))}
      </div>
    </div>
  );
}
