import Link from 'next/link';
import { ThemeButton } from '../theme-button';
import { Icon } from '../ui';

// Barra fija del panel: marca, aviso permanente de maqueta, tienda y tema. Sin botones que no hagan nada.
export function PanelHeader() {
  return (
    <header className="pn-h">
      <div className="wrap pn-h-in">
        <Link className="pn-brand" href="/panel" prefetch={false} aria-label="Panel de AT Computación, resumen">
          <span className="mark" aria-hidden="true">AT</span><span>Panel</span>
        </Link>
        <span className="pn-ej" title="Maqueta con datos de ejemplo">Ejemplo</span>
        <Link className="ib" href="/" prefetch={false} aria-label="Ver la tienda"><Icon n="store" /></Link>
        <ThemeButton />
      </div>
    </header>
  );
}
