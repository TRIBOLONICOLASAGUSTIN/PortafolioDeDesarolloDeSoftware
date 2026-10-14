'use client';

import { useEffect, useRef, useState } from 'react';
import { useBag, useUI } from './app-shell';
import { ThemeButton } from './theme-button';
import { Icon, Wa } from './ui';
import { vars } from '@/lib/format';

const LINKS: [string, string][] = [['#tienda', 'Tienda'], ['#notebooks', 'Notebooks'], ['#servicio', 'Servicio técnico'], ['#seguimiento', 'Seguimiento'], ['#presupuesto', 'Presupuesto'], ['#contacto', 'Contacto']];

export function Nav() {
  const { menuOpen, setMenu, openSpot, openBag } = useUI();
  const { count, bump } = useBag();
  const navRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  // Desplazamiento acumulado en la misma dirección (lo comparte el aviso de la bolsa, que lo reinicia).
  const acc = useRef(0);

  // Borde al hacer scroll, barra oscura sobre el inicio y sobre Servicio técnico, y barra que se esconde: al bajar se
  // va (translateY, sin mover nada de la página) y al subir un poco vuelve. Arriba del todo, con algo abierto
  // (html.lock: menú, bolsa, ficha o buscador), con el foco del teclado adentro (CSS :has(:focus-visible)) o con
  // "reducir movimiento" (la regla de .hide solo existe sin esa preferencia) se ve siempre.
  useEffect(() => {
    let ticking = false;
    const root = document.documentElement, main = document.querySelector('main');
    const bandas = [...document.querySelectorAll<HTMLElement>('#servicio')];
    let lastY = scrollY;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const nav = navRef.current; if (!nav) return;
        // El rebote de iOS (arriba y abajo) no cuenta como subir o bajar
        const y = Math.min(Math.max(scrollY, 0), Math.max(0, root.scrollHeight - innerHeight));
        const dy = y - lastY; lastY = y;
        nav.classList.toggle('scrolled', y > 8);
        // Oscura sobre las bandas negras (Servicio técnico); el inicio sigue el tema
        nav.classList.toggle('on-dark', bandas.some(b => { const r = b.getBoundingClientRect(); return r.top <= 52 && r.bottom > 52; }));
        if (root.classList.contains('lock')) return;
        if (y <= (main?.offsetTop ?? 120)) { acc.current = 0; nav.classList.remove('hide'); return; }
        // Margen de 24 px: un temblor del dedo o de la rueda no la hace aparecer y desaparecer
        acc.current = Math.sign(dy) === Math.sign(acc.current) ? acc.current + dy : dy;
        if (acc.current > 24) nav.classList.add('hide'); else if (acc.current < -24) nav.classList.remove('hide');
      });
    };
    // El foco entra a la barra escondida (Tab o Shift+Tab): se destapa antes de que el navegador calcule si tiene que
    // correr la página para mostrar el botón enfocado, así la página no se mueve (WCAG 2.4.11).
    const onFocus = () => { const nav = navRef.current; if (!nav?.classList.contains('hide')) return; acc.current = 0; nav.classList.remove('hide'); void nav.offsetHeight; };
    const nav0 = navRef.current;
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    nav0?.addEventListener('focusin', onFocus);
    return () => { removeEventListener('scroll', onScroll); nav0?.removeEventListener('focusin', onFocus); };
  }, []);

  // Si los links no entran en la barra (texto agrandado), se muestran en el menú del celular.
  useEffect(() => {
    const nav = navRef.current, inner = nav?.firstElementChild as HTMLElement | null;
    const links = nav?.querySelector<HTMLElement>('.links'), brand = nav?.querySelector<HTMLElement>('.brand');
    const actions = nav?.querySelector<HTMLElement>('.actions'), btn = nav?.querySelector<HTMLElement>('.menu-btn');
    if (!nav || !inner || !links || !brand || !actions || !btn) return;
    const fit = () => {
      const tight = nav.classList.contains('tight');
      const gap = parseFloat(getComputedStyle(inner).columnGap) || 0;
      const act = actions.offsetWidth - (tight ? btn.offsetWidth + (parseFloat(getComputedStyle(actions).columnGap) || 0) : 0);
      nav.classList.toggle('tight', links.scrollWidth > inner.clientWidth - brand.offsetWidth - act - 2 * gap);
    };
    const ro = new ResizeObserver(fit); ro.observe(inner); ro.observe(links);
    return () => ro.disconnect();
  }, []);

  // El número de la bolsa "salta" una vez al agregar (confirma la acción).
  useEffect(() => {
    const b = badgeRef.current; if (!b || !bump) return;
    // Que se vea el número: la barra vuelve si estaba escondida
    navRef.current?.classList.remove('hide'); acc.current = 0;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }, [bump]);

  return (
    <>
      <header className="nav" id="nav" ref={navRef}>
        <div className="wrap nav-in">
          <a className="brand" href="#inicio" aria-label="AT Computación, inicio"><span className="mark">AT</span><span className="brand-t">AT Computación</span></a>
          <nav className="links" aria-label="Principal">{LINKS.map(([h, t]) => <a key={h} href={h}>{t}</a>)}</nav>
          <div className="actions">
            <button className="ib" id="searchBtn" aria-label="Buscar (Ctrl+K)" onClick={openSpot}><Icon n="search" /></button>
            <div className="duo">
              <ThemeButton />
              <button className="ib" id="bagBtn" aria-label={count ? `Abrir tu bolsa, ${count} producto${count > 1 ? 's' : ''}` : 'Abrir tu bolsa'} onClick={openBag}>
                <Icon n="bag" /><span ref={badgeRef} className={`badge${count > 0 ? ' show' : ''}`} id="badge">{count}</span>
              </button>
            </div>
            <button className="ib menu-btn" id="menuBtn" aria-label="Menú" aria-expanded={menuOpen} aria-controls="mmenu" onClick={() => setMenu(!menuOpen)}>
              <Icon n="menu" cls="i bars" /><Icon n="x" cls="i x" />
            </button>
          </div>
        </div>
      </header>
      <nav className="mmenu" id="mmenu" aria-label="Menú" inert={!menuOpen}>
        {LINKS.map(([h, t], i) => <a key={h} className="m" href={h} style={vars({ '--d': `${(.02 + i * .03).toFixed(2)}s` })} onClick={() => setMenu(false)}>{t}</a>)}
        <Wa className="btn btn-wa" text="¡Hola AT Computación! Tengo una consulta."><Icon n="wa" />Escribinos por WhatsApp</Wa>
      </nav>
    </>
  );
}
