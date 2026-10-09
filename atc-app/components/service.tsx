'use client';

import { useEffect, useState } from 'react';
import { Icon } from './ui';
import { Teardown } from './teardown';
import { HIST, SERVICES, STORY } from '@/lib/data/service';
import { vars } from '@/lib/format';

// Pantalla del celular para cada paso (maqueta decorativa: aria-hidden en el contenedor).
function Screen({ i }: { i: number }) {
  const c = STORY[i].scr;
  const pill = <span className="st-pill" style={vars({ '--c': c.pill[1] })}>{c.pill[0]}</span>;
  return (
    <>
      <span className="app">Seguimiento</span>
      {c.done ? (
        <>
          <div className="done-ic"><Icon n="check" /></div><h4>¡Listo para retirar!</h4>
          <div className="pc" style={{ textAlign: 'left' }}><div className="pc-row"><b>AT-7KQ2-9M</b>{pill}</div><small>Garantía escrita hasta el 04/01/2027</small></div>
        </>
      ) : (
        <>
          <h4>{c.t}</h4>
          <div className="pc">
            <div className="pc-row"><b>AT-7KQ2-9M</b>{pill}</div><small>Lenovo IdeaPad 3 · Conector de carga</small>
            <div className="pbar"><span style={{ width: `${c.pg}%` }}></span></div>
            {c.budget && <><div className="pc-row" style={{ marginTop: 'var(--u)' }}><small>Presupuesto</small><b>$ 45.000</b></div><div className="pbtns"><span>Aprobar</span><span>Consultar</span></div></>}
          </div>
          {c.bub && <div className="bub"><small>AT Computación</small>{c.bub}</div>}
        </>
      )}
      <div className="ph-hist"><b>Historial</b>
        {HIST.slice(0, i + 1).reverse().map(([t, d], k) => <div key={t}><span><i className={k ? 'old' : undefined}></i>{t}</span><small>{d}</small></div>)}
      </div>
    </>
  );
}

export function Service() {
  const [cur, setCur] = useState(0);

  // El paso que está en el centro de la pantalla manda qué muestra el celular.
  useEffect(() => {
    let io: IntersectionObserver | undefined;
    const mq = matchMedia('(max-width:734px)');
    const bind = () => {
      io?.disconnect();
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setCur(+(e.target as HTMLElement).dataset.st!); }),
        { rootMargin: mq.matches ? '-62% 0px -18% 0px' : '-45% 0px -45% 0px' });
      document.querySelectorAll('.stx').forEach(el => io!.observe(el));
    };
    bind(); mq.addEventListener('change', bind);
    return () => { io?.disconnect(); mq.removeEventListener('change', bind); };
  }, []);

  return (
    <section className="sec story" id="servicio">
      <div className="wrap">
        <div className="head center rv">
          <span className="kicker">Servicio técnico</span>
          <h2 className="h2">Así cuidamos tu equipo. <span className="muted"><br />Sin sorpresas, de principio a fin.</span></h2>
        </div>
        <Teardown />
        <div className="story-grid">
          <div className="story-media" aria-hidden="true">
            <div className="phone"><div className="phone-scr" id="phoneScr">
              <span className="island"></span>
              <div className="tabbar"><span className="url"><Icon n="lock" />atcomputacion.com.ar</span></div>
              <div className="sbar"><span>9:41</span><i>{[1.6, 2.4, 3.2, 4].map(h => <b key={h} style={{ height: `calc(${h} * var(--u))` }}></b>)}</i></div>
              {STORY.map((s, i) => <div key={s.n} className={`ps${s.scr.done ? ' center' : ''}${i === cur ? ' on' : ''}`} data-ps={i}><Screen i={i} /></div>)}
            </div></div>
          </div>
          <div className="steps-txt" id="stepsTxt">
            {STORY.map((s, i) => <div key={s.n} className={`stx${i === cur ? ' on' : ''}`} data-st={i}><span className="n">{s.n}</span><h3>{s.h}</h3><p>{s.p}</p></div>)}
          </div>
        </div>
        <div className="head svc-head rv">
          <h2 className="h2" style={{ fontSize: 'clamp(30px,4vw,44px)' }}>Todo lo que reparamos.</h2>
          <a className="lnk" href="#presupuesto">Calculá tu presupuesto</a>
        </div>
        <div className="svcs" id="svcs">
          {SERVICES.map(([ic, t, d], i) => <div key={t} className="svc rv" style={vars({ '--d': `${((i % 4) * .06).toFixed(2)}s` })}><Icon n={ic} /><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </div>
    </section>
  );
}
