'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './app-shell';
import { clockLabel, openStatus } from '@/lib/hours';
import { vars } from '@/lib/format';
import type { Encuadre, Teardown3D } from '@/lib/teardown3d';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Inicio (fondo negro, como la banda de Servicio técnico): título grande y la notebook 3D cerrada. Al bajar, la notebook
 * se abre y gira hasta quedar de frente; ahí se funde con la compu HTML (el seguimiento de verdad) y aparece su texto.
 * Tramos de p: .06–.26 se va el título · .08–.5 se abre y gira (lib/teardown3d.ts) · .6–.68 fundido 3D → HTML ·
 * .68–.82 la compu se corre y entra el texto. Sin bucles: se dibuja solo cuando cambia el scroll.
 * Sin WebGL (o con poca memoria / ahorro de datos) recorre lo mismo la compu HTML, que se endereza. Con "reducir
 * movimiento" no hay escena: título, compu y texto quietos, uno debajo del otro, y no se descarga three.js.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const sec = useRef<HTMLElement>(null);
  const st = openStatus();

  useEffect(() => {
    const el = sec.current; if (!el) return;
    const stage = el.querySelector<HTMLElement>('.stage')!;
    // Sin escena (reducir movimiento o CSS sin la escena): la barra de pasos se completa una vez al verse
    if (reduce || getComputedStyle(el).getPropertyValue('--scene').trim() !== '1') {
      if (reduce) { stage.classList.add('lit'); return; }
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); stage.classList.add('lit'); } }, { threshold: .3 });
      io.observe(stage);
      return () => io.disconnect();
    }

    const pin = el.querySelector<HTMLElement>('.hero-pin')!;
    const canvas = el.querySelector<HTMLCanvasElement>('.hero-canvas')!;
    const lid = stage.querySelector<HTMLElement>('.lid')!;
    const copy = el.querySelector<HTMLElement>('.hero-copy')!, end = el.querySelector<HTMLElement>('.hero-end')!;
    let t3d: Teardown3D | null = null, alive = true, flat = false;
    let target = 0, p = 0, raf = 0, last = 0;
    // Encuadres (en fracciones del escenario): al empezar, la notebook cerrada al costado del título (compu) o debajo
    // (celular); al terminar de abrirse, exactamente donde está la tapa de la compu HTML (para el fundido)
    let ini: Encuadre = { cx: .72, cy: .52, fr: .34 }, fin: Encuadre = { cx: .5, cy: .5, fr: .6 }, wide = true;
    // Al final: cuánto se corre y se achica la compu para dejarle lugar al texto (al costado en compu, debajo en el celular)
    let finTx = 0, finTy = 0, finS = .84;
    const medir = () => {
      const W = pin.clientWidth, H = pin.clientHeight;
      wide = !matchMedia('(max-aspect-ratio: 11/10)').matches; // el mismo corte que el CSS
      let x = 0, y = 0;
      for (let n: HTMLElement | null = lid; n && n !== pin; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; }
      fin = { cx: (x + lid.offsetWidth / 2) / W, cy: (y + lid.offsetHeight / 2) / H, fr: lid.offsetWidth / W };
      // Dónde termina el texto (los botones): la capa del texto ocupa todo el escenario, por eso se mide lo último
      const cb = copy.querySelector('.ctas')!.getBoundingClientRect(), pb = pin.getBoundingClientRect();
      ini = wide ? { cx: .73, cy: .5, fr: Math.min(.34, .52 * H / W) } : { cx: .5, cy: Math.max(.6, (cb.bottom - pb.top) / H + .14), fr: .66 };
      const sh = stage.offsetHeight, sTop = stage.offsetTop;
      if (wide) { finS = .84; finTx = -.15 * W; finTy = 0; } else {
        // La compu sube hasta arriba y se achica lo necesario para que el texto entre debajo sin pisarla
        finS = Math.min(.92, Math.max(.5, (H - end.offsetHeight - 56) / sh));
        finTx = 0; finTy = 16 + sh * finS / 2 - (sTop + sh / 2);
      }
      t3d?.encuadre(ini, fin);
    };

    const apply = () => {
      const o = smooth(clamp((p - .08) / .42));
      const show = 1 - clamp((p - .06) / .2);
      const swap = clamp((p - .6) / .08);
      const mv = smooth(clamp((p - .68) / .14));
      const W = pin.clientWidth, H = pin.clientHeight;
      // La compu HTML: sin 3D recorre el mismo camino que haría el modelo (más chica al costado, inclinada → de frente);
      // con 3D aparece en el fundido ya en su lugar. Al final se corre (al costado en compu, arriba en el celular).
      const e = flat ? { cx: lerp(ini.cx, fin.cx, o), cy: lerp(ini.cy, fin.cy, o), s: lerp(ini.fr / fin.fr, 1, o) } : { cx: fin.cx, cy: fin.cy, s: .98 + .02 * swap };
      const tx = (e.cx - fin.cx) * W + mv * finTx;
      const ty = (e.cy - fin.cy) * H + mv * finTy;
      const ts = e.s * lerp(1, finS, mv);
      el.style.setProperty('--tx', `${tx.toFixed(1)}px`); el.style.setProperty('--ty', `${ty.toFixed(1)}px`);
      el.style.setProperty('--ts', ts.toFixed(4)); el.style.setProperty('--tr', `${(flat ? 26 * (1 - o) : 0).toFixed(2)}deg`);
      el.style.setProperty('--copy', show.toFixed(3)); el.style.setProperty('--swap', swap.toFixed(3)); el.style.setProperty('--end', mv.toFixed(3));
      el.dataset.p = p.toFixed(3);
      el.dataset.fase = p < .06 ? 'ini' : p < .68 ? 'abre' : 'fin';
      copy.inert = show < .5; end.inert = mv < .5;
      if (swap > .5 || (flat && o > .9)) stage.classList.add('lit');
      t3d?.set(p);
    };

    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(1000, now - last) : 16; last = now;
      const d = target - p;
      p = Math.abs(d) < .0005 ? target : p + d * (1 - Math.exp(-dt / 120));
      apply();
      if (p !== target) raf = requestAnimationFrame(step); else last = 0;
      el.dataset.raf = raf ? '1' : '0';
    };
    let ticking = false;
    const frame = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      // Mientras corre la escena, el saludo de WhatsApp se esconde para no tapar la notebook ni el texto
      document.documentElement.classList.toggle('hero-on', r.top < 0 && r.bottom > innerHeight * .5);
      if (r.bottom < -100) { target = 1; } else {
        const top = parseFloat(getComputedStyle(pin).top) || 0;
        target = clamp((top - r.top) / Math.max(1, r.height - pin.offsetHeight));
      }
      if (!raf && target !== p) { el.dataset.raf = '1'; raf = requestAnimationFrame(step); }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    const usarPlano = () => { if (!alive || t3d) return; flat = true; el.classList.add('hflat'); apply(); };

    medir(); apply(); frame();
    addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => { medir(); t3d?.resize(); apply(); });
    ro.observe(pin);

    // El 3D se descarga cuando el navegador está libre (el título ya se ve); sin WebGL, con poca memoria o con
    // "ahorro de datos" queda la compu HTML. Si en 3 s no está, también.
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const espera = setTimeout(usarPlano, 3000);
    // ¿Hay WebGL? Se prueba antes de descargar three.js (sin WebGL no se baja nada ni quedan errores en la consola)
    const hayWebGL = () => {
      try {
        const g = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
        g?.getExtension('WEBGL_lose_context')?.loseContext();
        return !!g;
      } catch { return false; }
    };
    const cargar = async () => {
      if (nav.connection?.saveData || (nav.deviceMemory ?? 8) < 4 || !hayWebGL()) { usarPlano(); return; }
      try {
        const m = await import('@/lib/teardown3d');
        if (!alive || flat) return;
        t3d = m.mount(canvas, { modo: 'inicio' });
        clearTimeout(espera);
        medir(); t3d.resize(); el.classList.add('h3d'); apply();
      } catch { usarPlano(); }
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => { cargar(); }, { timeout: 800 }); else setTimeout(cargar, 200);

    return () => {
      alive = false; clearTimeout(espera); cancelAnimationFrame(raf); ro.disconnect();
      document.documentElement.classList.remove('hero-on');
      removeEventListener('scroll', onScroll);
      t3d?.dispose(); t3d = null;
    };
  }, [reduce]);

  return (
    <section className="hero" id="inicio" ref={sec}>
      <div className="hero-pin">
        <div className="wrap hero-copy">
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
        {/* El modelo 3D es decorativo: lo que muestra está dicho en el texto */}
        <div className="hero-obj" aria-hidden="true"><canvas className="hero-canvas" /></div>
        <div className="stage" id="stage" aria-hidden="true">
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
                  <div className="prog">{['Ingreso', 'Diagnóstico', 'Presupuesto', 'Reparación', 'Listo'].map((t, i) => <span key={t} style={vars({ '--d': `${(.1 + i * .12).toFixed(2)}s` })}>{t}</span>)}</div>
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
        <div className="hero-end">
          <h2 className="hero-end-t">Seguí tu reparación desde acá.</h2>
          <p>Cuando dejás tu equipo te damos un código. Con ese código y los últimos 3 dígitos de tu teléfono ves en qué etapa está, el presupuesto y el mensaje del técnico.</p>
          <a className="lnk" href="#seguimiento">Seguir mi reparación</a>
        </div>
      </div>
    </section>
  );
}
