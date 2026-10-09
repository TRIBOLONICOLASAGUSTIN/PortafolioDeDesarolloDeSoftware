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

  // Borde al hacer scroll y barra oscura sobre el inicio y sobre la sección de Servicio técnico.
  useEffect(() => {
    let ticking = false;
    const story = document.getElementById('servicio'), hero = document.getElementById('inicio');
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const nav = navRef.current; if (!nav) return;
        nav.classList.toggle('scrolled', scrollY > 8);
        const sr = story?.getBoundingClientRect(), hr = hero?.getBoundingClientRect();
        // Oscura sobre el inicio (negro, también al cargar, con la cinta arriba) y sobre Servicio técnico
        nav.classList.toggle('on-dark', (!!hr && hr.top <= 140 && hr.bottom > 52) || (!!sr && sr.top <= 52 && sr.bottom > 52));
      });
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => removeEventListener('scroll', onScroll);
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
