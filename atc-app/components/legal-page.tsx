import Link from 'next/link';
import type { ReactNode } from 'react';
import '../app/styles/16-legal.css';

/** Páginas legales (privacidad, cookies, términos, arrepentimiento): una columna de lectura, con la misma cabecera. */
export function LegalPage({ title, updated, lede, children }: { title: string; updated: string; lede: ReactNode; children: ReactNode }) {
  return (
    <div className="lg">
      <header className="lg-h">
        <div className="lg-wrap lg-h-in">
          <Link className="brand" href="/"><span className="mark" aria-hidden="true">AT</span>AT Computación</Link>
          <Link className="lg-back" href="/">Volver a la tienda</Link>
        </div>
      </header>
      <main className="lg-wrap lg-main">
        <p className="lg-eyebrow">Última actualización: {updated}</p>
        <h1>{title}</h1>
        <p className="lg-lede">{lede}</p>
        {children}
        <nav className="lg-otras" aria-label="Otras políticas">
          <Link href="/privacidad">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/terminos">Términos y condiciones</Link><Link href="/arrepentimiento">Botón de arrepentimiento</Link>
        </nav>
      </main>
    </div>
  );
}

/** Dato de ejemplo hasta que el dueño pase el real (CLAUDE.md): se ve y se marca. */
export const Ejemplo = ({ children }: { children: ReactNode }) => <><span className="lg-dato">{children}</span> <small>(dato de ejemplo)</small></>;
