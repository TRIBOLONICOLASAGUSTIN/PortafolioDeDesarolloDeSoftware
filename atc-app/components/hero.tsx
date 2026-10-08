'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './app-shell';
import { clockLabel, openStatus } from '@/lib/hours';
import { vars } from '@/lib/format';

export function Hero() {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const st = openStatus();

  // La notebook se endereza con el scroll (orienta: "esto es lo que hacemos").
  useEffect(() => {
    const el = stage.current; if (!el) return;
    if (reduce) { el.style.setProperty('--p', '1'); el.classList.add('lit'); return; }
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const r = el.getBoundingClientRect(), vh = innerHeight;
        const p = Math.min(1, Math.max(0, (vh * .98 - r.top) / (vh * .62)));
        el.style.setProperty('--p', p.toFixed(3));
        if (p > .92) el.classList.add('lit');
      });
    };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); };
  }, [reduce]);

  return (
    <section className="hero" id="inicio">
      <div className="wrap">
        <p className="status" id="status" data-in="" style={vars({ '--d': '.05s' })}>
          <span className={`dot${st.open ? '' : ' off'}`} suppressHydrationWarning></span><span className="txt" suppressHydrationWarning>{st.txt}</span>
        </p>
        <h1 data-in="" style={vars({ '--d': '.12s' })}>Tu tecnología.<br /><span className="hl">En las mejores manos.</span></h1>
        <p className="hero-sub" data-in="" style={vars({ '--d': '.22s' })}>Notebooks, impresoras, insumos y accesorios. Reparación con trato directo y seguimiento online de tu equipo.</p>
        <div className="ctas" data-in="" style={vars({ '--d': '.32s' })}>
          <a className="btn" href="#tienda">Ver la tienda</a>
          <a className="lnk" href="#servicio">Reparar mi equipo</a>
        </div>
      </div>
      <div className="stage" id="stage" aria-hidden="true" ref={stage}>
        <div className="laptop">
          <div className="lid"><div className="bezel"><div className="screen">
            <div className="menubar"><span>Seguimiento</span><span>Archivo</span><span>Editar</span><span>Ver</span><span className="r" id="clock" suppressHydrationWarning>{clockLabel()}</span></div>
            <div className="win">
              <div className="side">
                <div className="lights"><i></i><i></i><i></i></div>
                <small>Órdenes</small>
                <span className="o sel"><i></i>AT-7KQ2-9M</span>
                <span className="o"><i></i>AT-3FJ8-WX</span>
                <span className="o"><i></i>AT-9TR4-6P</span>
              </div>
              <div className="mainw">
                <div className="mh"><div><b>AT-7KQ2-9M</b><span>Lenovo IdeaPad 3 · Conector de carga</span></div><span className="pill">● Listo para retirar</span></div>
                <div className="prog">{['Ingreso', 'Diagnóstico', 'Presupuesto', 'Reparación', 'Listo'].map((t, i) => <span key={t} style={vars({ '--d': `${(.2 + i * .4).toFixed(1)}s` })}>{t}</span>)}</div>
                <div className="msg"><span className="av">AT</span><div><b>Mensaje del técnico</b><p>¡Listo! Cambiamos el conector y lo probamos 24 h con carga. Ya podés retirarlo.</p></div></div>
                <ul className="hist"><li><i></i><b>Listo para retirar</b><span>06/10 · 18:10</span></li><li><i></i><b>En reparación</b><span>03/10 · 11:30</span></li><li><i></i><b>Presupuesto aprobado</b><span>03/10 · 09:05</span></li></ul>
                <div className="kv"><div><small>Presupuesto aprobado</small><b>$ 45.000</b></div><div><small>Garantía escrita</small><b>90 días</b></div></div>
              </div>
            </div>
          </div></div></div>
          <div className="base"></div>
        </div>
        <div className="floor"></div>
      </div>
    </section>
  );
}
