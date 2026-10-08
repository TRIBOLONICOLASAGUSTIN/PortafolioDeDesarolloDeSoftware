'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion, useUI } from './app-shell';
import { Icon } from './ui';
import { EXTRAS, SVCS, r500 } from '@/lib/data/estimator';
import { fmt, vars } from '@/lib/format';
import { waLink } from '@/lib/whatsapp';

export function Estimator() {
  const { layer } = useUI();
  const reduce = useReducedMotion();
  const [svc, setSvc] = useState('nb');
  const [ex, setEx] = useState<string[]>([]);
  const [seen, setSeen] = useState(false);
  const [shown, setShown] = useState({ min: 0, max: 0 });
  const [cfgIn, setCfgIn] = useState(false), [sumIn, setSumIn] = useState(false), [narrow, setNarrow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cfg = useRef<HTMLDivElement>(null), sum = useRef<HTMLElement>(null), shownRef = useRef(shown);
  shownRef.current = shown;

  const s = SVCS.find(x => x.id === svc)!;
  const add = ex.reduce((a, id) => a + EXTRAS.find(e => e.id === id)!.v, 0);
  const to = { min: r500(s.min + add), max: r500(s.max + add) };
  const exT = ex.map(id => EXTRAS.find(e => e.id === id)!.t).join(', ');
  const link = waLink(`¡Hola! Quiero pedir un turno para diagnóstico. Servicio: ${s.d} — ${s.t}.${exT ? `\nExtras: ${exT}.` : ''}\nEstimado en la web: ${fmt(to.min)} a ${fmt(to.max)}.`);

  // El rango cuenta hasta el valor nuevo (600 ms): suaviza el cambio. Empieza cuando la sección se ve.
  useEffect(() => {
    if (!seen) return;
    const from = { ...shownRef.current }, t0 = performance.now(), dur = reduce ? 0 : 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - p, 3);
      setShown({ min: from.min + (to.min - from.min) * e, max: from.max + (to.max - from.max) * e });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to.min, to.max, reduce]);

  useEffect(() => {
    setMounted(true);
    const mq = matchMedia('(max-width:900px)'); setNarrow(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setNarrow(e.matches); mq.addEventListener('change', onMq);
    const a = new IntersectionObserver(([e]) => { setCfgIn(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { rootMargin: '0px 0px -30% 0px' });
    const b = new IntersectionObserver(([e]) => setSumIn(e.isIntersecting), { threshold: .25 });
    const c = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { threshold: .2 });
    if (cfg.current) { a.observe(cfg.current); c.observe(cfg.current); }
    if (sum.current) b.observe(sum.current);
    return () => { a.disconnect(); b.disconnect(); c.disconnect(); mq.removeEventListener('change', onMq); };
  }, []);

  // Celular: barra flotante con el precio mientras se configura y el resumen no se ve.
  const showBar = cfgIn && !sumIn && !layer && narrow;
  useEffect(() => { document.body.classList.toggle('has-bar', showBar); }, [showBar]);

  return (
    <section className="sec alt" id="presupuesto">
      <div className="wrap">
        <div className="head center rv">
          <span className="kicker">Presupuesto</span>
          <h2 className="h2">Calculá tu presupuesto. <span className="muted">En 30 segundos.</span></h2>
          <p className="lede">Elegí qué necesitás y te mostramos un rango estimado. El precio final lo confirmamos con el diagnóstico.</p>
        </div>
        <div className="config" id="config" ref={cfg}>
          <div className="rv">
            <h3 className="cstep">¿Qué necesitás?<small>Elegí el tipo de servicio.</small></h3>
            <div className="opts" id="opts" role="group" aria-label="Tipo de servicio">
              {SVCS.map(o => <button key={o.id} className="opt" data-svc={o.id} aria-pressed={o.id === svc} onClick={() => setSvc(o.id)}><Icon n={o.ic} /><b>{o.t}</b><small>Desde {fmt(o.min)}</small></button>)}
            </div>
            <h3 className="cstep">Extras<small>Opcionales, sumalos si los necesitás.</small></h3>
            <div className="extras" id="extras" role="group" aria-label="Extras">
              {EXTRAS.map(x => {
                const on = ex.includes(x.id);
                return <button key={x.id} className="ex" data-ex={x.id} aria-pressed={on} onClick={() => setEx(on ? ex.filter(i => i !== x.id) : [...ex, x.id])}><span className="ck"><Icon n="check" /></span><b>{x.t}</b><small>+ {fmt(x.v)}</small></button>;
              })}
            </div>
          </div>
          <aside className="summary rv" id="summary" style={vars({ '--d': '.1s' })} ref={sum}>
            <span className="for" id="eFor">{s.d} · {s.t}</span>
            <div className="range"><span id="eMin">{fmt(shown.min)}</span><span className="a">–</span><span id="eMax">{fmt(shown.max)}</span></div>
            <div className="time"><Icon n="clock" cls="i sm" /><span id="eTime">{s.time}</span></div>
            <hr />
            <a className="btn btn-wa btn-full" id="eWa" href={link} target="_blank" rel="noopener"><Icon n="wa" />Pedir turno para diagnóstico</a>
            <p className="note">Rango y plazo orientativos, en pesos argentinos. El precio y el plazo finales te los confirma el técnico después del diagnóstico, que se bonifica si reparás.</p>
          </aside>
        </div>
      </div>
      {mounted && createPortal(
        <div className={`est-bar${showBar ? ' show' : ''}`} id="estBar" aria-hidden={!showBar}>
          <div><small>Estimado</small><b id="eBar">{fmt(to.min)} – {fmt(to.max)}</b></div>
          <a className="btn btn-wa btn-sm" id="eBarWa" href={link} target="_blank" rel="noopener" tabIndex={showBar ? 0 : -1}>Pedir turno</a>
        </div>, document.body)}
    </section>
  );
}
