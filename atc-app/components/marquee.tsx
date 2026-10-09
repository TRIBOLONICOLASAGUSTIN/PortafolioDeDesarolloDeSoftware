'use client';

import { useEffect, useRef } from 'react';
import { BrandLogo, LOGOS } from './brand-logos';

// Único bucle aprobado (CLAUDE.md): lento, se pausa con el mouse y fuera de pantalla, quieto con "reducir movimiento".
// La segunda copia de las marcas existe solo para que el bucle no tenga corte: los lectores de pantalla no la leen.
// Se muestran las marcas que tienen logo (las demás esperan el SVG oficial de la marca).
export function Marquee({ brands }: { brands: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = brands.filter(b => LOGOS[b]);
  useEffect(() => {
    const mq = ref.current; if (!mq) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => mq.classList.toggle('on', e.isIntersecting && !reduce));
    io.observe(mq);
    return () => io.disconnect();
  }, []);
  return (
    <div className="mq" id="mq" ref={ref}>
      <div className="mq-track">
        {shown.map(b => <BrandLogo key={b} name={b} />)}
        {shown.map(b => <BrandLogo key={`${b}-2`} name={b} copy />)}
      </div>
    </div>
  );
}
