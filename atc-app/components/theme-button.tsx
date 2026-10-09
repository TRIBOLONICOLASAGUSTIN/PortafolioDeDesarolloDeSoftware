'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './hooks';
import { Icon } from './ui';

// La barra de Safari (theme-color) sigue al tema elegido, no solo al del sistema.
function syncThemeColor(t: string) {
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', t === 'dark' ? '#000000' : '#ffffff'));
}

export function ThemeButton() {
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
