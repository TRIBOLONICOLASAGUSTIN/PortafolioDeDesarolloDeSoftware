import Link from 'next/link';
import { ThemeButton } from '../theme-button';
import { Icon } from '../ui';
import { Salir } from './salir';
import { PanelTabs } from './panel-tabs';

// Barra fija del panel: marca, secciones, aviso permanente de datos de ejemplo, tienda, tema y salir.
export function PanelHeader() {
  return (
    <header className="pn-h">
      <div className="wrap pn-h-in">
        <Link className="pn-brand" href="/panel" prefetch={false} aria-label="Panel de AT Computación, resumen">
          <span className="mark" aria-hidden="true">AT</span><span>Panel</span>
        </Link>
        <PanelTabs />
        <div className="pn-h-r">
          <span className="pn-ej" title="Maqueta con datos de ejemplo">Ejemplo</span>
          <Link className="ib" href="/" prefetch={false} aria-label="Ver la tienda"><Icon n="store" /></Link>
          <ThemeButton />
          <Salir />
        </div>
      </div>
    </header>
  );
}
