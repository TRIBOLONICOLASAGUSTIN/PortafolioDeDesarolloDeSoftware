'use client';

import { useEffect, useRef, useState } from 'react';
import { useBag, useReducedMotion, useUI } from './app-shell';
import { Icon, Wa } from './ui';
import { vars } from '@/lib/format';

const LINKS: [string, string][] = [['#tienda', 'Tienda'], ['#notebooks', 'Notebooks'], ['#servicio', 'Servicio técnico'], ['#seguimiento', 'Seguimiento'], ['#presupuesto', 'Presupuesto'], ['#contacto', 'Contacto']];

// La barra de Safari (theme-color) sigue al tema elegido, no solo al del sistema.
function syncThemeColor(t: string) {
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', t === 'dark' ? '#000000' : '#ffffff'));
}

function ThemeButton() {
  const reduce = useReducedMotion();
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    setDark(root.dataset.theme === 'dark');
    syncThemeColor(root.dataset.theme ?? 'light');
    // Si el usuario no eligió un tema, se sigue el del sistema.
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      let saved = null; try { saved = localStorage.getItem('atc-theme'); } catch {}
      if (!saved) { root.dataset.theme = e.matches ? 'dark' : 'light'; setDark(e.matches); syncThemeColor(root.dataset.theme); }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    // Todo cambia junto: sin transiciones mientras se aplica el tema (si no, cada parte cambia a su ritmo).
    const apply = () => {
      root.classList.add('theme-sw');
      root.dataset.theme = next; try { localStorage.setItem('atc-theme', next); } catch {}
      void getComputedStyle(document.body).backgroundColor;
      setDark(next === 'dark'); syncThemeColor(next);
      requestAnimationFrame(() => root.classList.remove('theme-sw'));
    };
    // Con View Transitions, la página vieja se funde con la nueva (opacidad, 300 ms, easing único).
    const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (!d.startViewTransition || reduce) { apply(); return; }
    d.startViewTransition(apply);
  };
  return (
    <button ref={ref} className="ib theme-btn" id="themeBtn" aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} onClick={toggle}>
      <Icon n="moon" cls="i moon" /><Icon n="sun" cls="i sun" />
    </button>
  );
}

export function Nav() {
  const { menuOpen, setMenu, openSpot, openBag } = useUI();
  const { count, bump } = useBag();
  const navRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Borde al hacer scroll y barra oscura sobre la sección de Servicio técnico.
  useEffect(() => {
    let ticking = false;
    const story = document.getElementById('servicio');
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const nav = navRef.current; if (!nav) return;
        nav.classList.toggle('scrolled', scrollY > 8);
        const sr = story?.getBoundingClientRect();
        nav.classList.toggle('on-dark', !!sr && sr.top <= 52 && sr.bottom > 52);
      });
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => removeEventListener('scroll', onScroll);
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
