'use client';

import { useEffect, useRef } from 'react';

// Único bucle aprobado (CLAUDE.md): lento, se pausa con el mouse y fuera de pantalla, quieto con "reducir movimiento".
// La segunda copia de las marcas existe solo para que el bucle no tenga corte: los lectores de pantalla no la leen.
export function Marquee({ brands }: { brands: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
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
        {brands.map(b => <span key={b}>{b}</span>)}
        {brands.map(b => <span key={`${b}-2`} aria-hidden="true">{b}</span>)}
      </div>
    </div>
  );
}
