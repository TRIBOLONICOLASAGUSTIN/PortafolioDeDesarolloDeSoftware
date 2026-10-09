'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './app-shell';
import { TEARDOWN } from '@/lib/data/service';

// Despiece de la notebook (al estilo de las páginas de producto de Apple): con el scroll, las piezas se separan en capas
// y aparece qué repara el técnico en cada una. Cada capa es un dibujo propio visto de arriba; el navegador las apila
// en 3D (solo transform y opacity). Con "reducir movimiento" o sin JS se muestra ya desarmada y quieta.

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const VB = '0 0 290 200';

// Teclas del teclado: 6 filas × 14
const KEYS = Array.from({ length: 84 }, (_, i) => ({ x: 32 + (i % 14) * 16.4, y: 28 + Math.floor(i / 14) * 14.8 }));
// Aspas del ventilador
const BLADES = Array.from({ length: 9 }, (_, i) => i * 40);
// Tornillos de la base
const SCREWS: [number, number][] = [[24, 22], [266, 22], [24, 178], [266, 178], [145, 22], [145, 178], [84, 100], [206, 100]];

function Base() {
  return (
    <svg viewBox={VB} aria-hidden="true">
      <defs>
        <linearGradient id="td-alu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef0f3" /><stop offset=".55" stopColor="#cfd2d8" /><stop offset="1" stopColor="#a9adb5" /></linearGradient>
        <linearGradient id="td-wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3d8bff" /><stop offset=".55" stopColor="#5e5ce6" /><stop offset="1" stopColor="#c06bf5" /></linearGradient>
        <linearGradient id="td-cell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a4d55" /><stop offset="1" stopColor="#2c2e34" /></linearGradient>
        <linearGradient id="td-pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1f4a3e" /><stop offset="1" stopColor="#163a30" /></linearGradient>
        <linearGradient id="td-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".32" /><stop offset=".62" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect className="alu" width="290" height="200" rx="16" />
      <rect className="tray" x="9" y="9" width="272" height="182" rx="10" />
      <path className="rib" d="M30 100H260M145 32V168" />
      {Array.from({ length: 16 }, (_, i) => <rect key={i} className="vent" x={66 + i * 10} y="14" width="5" height="3.2" rx="1.6" />)}
      {SCREWS.map(([x, y]) => <g key={`${x}-${y}`}><circle className="screw" cx={x} cy={y} r="3.4" /><circle className="screw-i" cx={x} cy={y} r="1.3" /></g>)}
    </svg>
  );
}

function Battery() {
  return (
    <svg viewBox={VB} aria-hidden="true">
      {[30, 128].map(x => <g key={x}><rect className="cell" x={x} y="112" width="92" height="70" rx="6" /><rect className="cell-hi" x={x + 4} y="115" width="84" height="3" rx="1.5" /></g>)}
      <rect className="cell-lb" x="62" y="138" width="40" height="16" rx="2" />
      <rect className="conn" x="118" y="102" width="12" height="9" rx="1.5" />
      <rect className="ssd" x="236" y="112" width="26" height="70" rx="2.5" /><rect className="ssd-l" x="241" y="124" width="16" height="30" rx="1" /><rect className="chip" x="241" y="160" width="16" height="12" rx="1" />
      <circle className="anc" data-a="ssd" cx="249" cy="140" r="1" />
    </svg>
  );
}

function Board() {
  return (
    <svg viewBox={VB} aria-hidden="true">
      <path className="pcb" d="M28 18H262a6 6 0 0 1 6 6V92a6 6 0 0 1-6 6H170V108H120V98H28a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z" />
      <path className="trace" d="M100 30H118M98 86H112M160 88H246M232 30V56M250 30V58" />
      <rect className="cpu" x="122" y="40" width="34" height="34" rx="3" /><rect className="die" x="131" y="49" width="16" height="16" rx="1.5" />
      {[30, 46].map(y => <g key={y}><rect className="ram" x="176" y={y} width="54" height="11" rx="1.5" />{[0, 1, 2, 3].map(c => <rect key={c} className="chip" x={180 + c * 12.5} y={y + 2.5} width="9" height="6" rx="1" />)}</g>)}
      <rect className="chip" x="186" y="70" width="20" height="14" rx="1.5" /><rect className="chip" x="212" y="72" width="12" height="10" rx="1" />
      <rect className="port" x="264" y="54" width="16" height="16" rx="2.5" />
      <rect className="fins" x="36" y="12" width="60" height="11" rx="2" />
      {Array.from({ length: 10 }, (_, i) => <path key={i} className="fin" d={`M${40 + i * 5.6} 13.5v8`} />)}
      <path className="pipe" d="M88 46C108 40 118 54 139 57" /><rect className="plate" x="125" y="43" width="28" height="28" rx="3" /><rect className="die" x="133" y="51" width="12" height="12" rx="1.5" />
      <circle className="fan-ring" cx="64" cy="56" r="27" /><circle className="fan" cx="64" cy="56" r="24" />
      {BLADES.map(r => <path key={r} className="blade" d="M64 56c2-9 9-16 18-18-4 7-9 13-18 18z" transform={`rotate(${r} 64 56)`} />)}
      <circle className="hub" cx="64" cy="56" r="7" />
      <circle className="anc" data-a="fan" cx="50" cy="58" r="1" /><circle className="anc" data-a="port" cx="276" cy="62" r="1" />
    </svg>
  );
}

function Deck() {
  return (
    <svg viewBox={VB} aria-hidden="true">
      <rect className="alu" width="290" height="200" rx="16" />
      <rect className="kbd" x="26" y="22" width="238" height="96" rx="7" />
      {KEYS.map(k => <rect key={`${k.x}-${k.y}`} className="key" x={k.x} y={k.y} width="13.4" height="11.6" rx="2" />)}
      <rect className="tp" x="100" y="130" width="90" height="56" rx="7" />
      <circle className="anc" data-a="keys" cx="214" cy="60" r="1" />
    </svg>
  );
}

function Display() {
  return (
    <svg viewBox={VB} aria-hidden="true">
      <rect className="bezel" width="290" height="200" rx="14" />
      <rect className="screen" x="10" y="10" width="270" height="168" rx="4" />
      <rect className="win" x="78" y="46" width="134" height="88" rx="6" /><rect className="win-b" x="78" y="46" width="134" height="12" rx="6" />
      <path className="win-l" d="M92 76H160M92 88H190M92 100H172" /><rect className="win-btn" x="92" y="112" width="40" height="10" rx="5" />
      <rect className="hinge" x="40" y="186" width="46" height="9" rx="3" /><rect className="hinge" x="204" y="186" width="46" height="9" rx="3" />
      <circle className="anc" data-a="screen" cx="44" cy="96" r="1" />
    </svg>
  );
}

function Lid() {
  return (
    <svg viewBox={VB} aria-hidden="true">
      <rect className="alu" width="290" height="200" rx="16" />
      <rect className="sheen" width="290" height="200" rx="16" />
    </svg>
  );
}

// Capas de abajo hacia arriba: z = altura cerrada, dz = cuánto sube al desarmarse (en unidades del ancho), t = espesor del canto
const LAYERS: { c: string; Art: () => React.JSX.Element; edge?: 'up' | 'down' }[] = [
  { c: 'l0', Art: Base, edge: 'up' },
  { c: 'l1', Art: Battery },
  { c: 'l2', Art: Board },
  { c: 'l4', Art: Deck, edge: 'down' },
  { c: 'l5', Art: Display, edge: 'down' },
  { c: 'l6', Art: Lid, edge: 'down' },
];

export function Teardown() {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current; if (!el) return;
    const scene = el.querySelector<HTMLElement>('.td-scene')!;
    const stage = el.querySelector<HTMLElement>('.td-stage')!;
    const tags = [...el.querySelectorAll<HTMLElement>('.td-tags li')];
    const anchors = tags.map(t => el.querySelector<SVGElement>(`[data-a="${t.dataset.a}"]`)!);
    const rig = el.querySelector<HTMLElement>('.td-rig')!;
    const wide = matchMedia('(min-width:1069px)');
    el.classList.add('td-live');

    // Etiquetas pegadas a su pieza (solo en pantallas anchas): se mueven con transform, nunca con top/left
    const place = () => {
      if (!wide.matches) { tags.forEach(t => [...t.children].forEach(c => { (c as HTMLElement).style.transform = ''; })); return; }
      const s = scene.getBoundingClientRect(), cx = s.width / 2, col = rig.offsetWidth * .66 + 24;
      tags.forEach((t, i) => {
        const a = anchors[i].getBoundingClientRect();
        const ax = a.left + a.width / 2 - s.left, ay = a.top + a.height / 2 - s.top;
        const left = t.classList.contains('l'), edge = left ? cx - col : cx + col;
        const [dot, ln, tx] = t.children as unknown as HTMLElement[];
        const x0 = left ? edge + 6 : ax + 9, len = Math.max(0, left ? ax - 9 - x0 : edge - 6 - x0);
        dot.style.transform = `translate(${(ax - 5).toFixed(1)}px,${(ay - 5).toFixed(1)}px)`;
        ln.style.transform = `translate(${x0.toFixed(1)}px,${ay.toFixed(1)}px) scaleX(${(len / 100).toFixed(3)})`;
        tx.style.transform = `translate(${(left ? edge - 10 - tx.offsetWidth : edge + 10).toFixed(1)}px,${(ay - 11).toFixed(1)}px)`;
      });
    };

    if (reduce) {
      el.classList.remove('td-scroll');
      el.style.setProperty('--e', '1'); tags.forEach(t => t.style.setProperty('--o', '1'));
      place(); addEventListener('resize', place);
      return () => removeEventListener('resize', place);
    }

    el.classList.add('td-scroll');
    let ticking = false;
    const frame = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const p = clamp(-r.top / Math.max(1, r.height - stage.offsetHeight));
      const e = smooth(clamp((p - .08) / .62));
      el.style.setProperty('--e', e.toFixed(4));
      // Etiquetas: en pantallas anchas aparecen todas a medida que su capa se separa; en angostas, solo la pieza actual
      const shown = tags.map(t => clamp((e - (.45 + .1 * +t.dataset.k!)) / .12));
      const cur = shown.reduce((c, o, i) => (o > .5 ? i : c), -1);
      tags.forEach((t, i) => t.style.setProperty('--o', (wide.matches ? shown[i] : i === cur ? 1 : 0).toFixed(3)));
      place();
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); frame();
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); };
  }, [reduce]);

  return (
    <div className="td" id="despiece" ref={root}>
      <div className="td-stage">
        <div className="td-copy">
          <h3>Conocemos cada pieza.</h3>
          <p>Abrimos tu equipo, encontramos la falla y te pasamos el presupuesto antes de reparar.</p>
        </div>
        <div className="td-scene">
          <div className="td-rig" aria-hidden="true">
            {LAYERS.map(({ c, Art, edge }) => (
              <div key={c} className={`td-l ${c}${edge ? ` ${edge}` : ''}`}>
                {edge && <><i className="td-ef"></i><i className="td-el"></i></>}
                <Art />
              </div>
            ))}
          </div>
          <ol className="td-tags">
            {TEARDOWN.map(t => (
              <li key={t.a} className={t.side} data-a={t.a} data-k={t.k}>
                <i className="dot"></i><i className="ln"></i>
                <span className="tx"><b>{t.t}</b><small>{t.d}</small></span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
