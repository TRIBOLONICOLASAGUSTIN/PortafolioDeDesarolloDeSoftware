import { Render } from './ui';
import { openStatus } from '@/lib/hours';
import { vars } from '@/lib/format';

// Productos de la vidriera: [ilustración r-*, clase de posición]. Son los dibujos propios de la tienda (sprites.tsx).
const VIDRIERA: [string, string][] = [['printer', 'imp'], ['tower', 'pc'], ['laptop', 'nb'], ['ink', 'ink'], ['mouse', 'mouse']];

/**
 * Inicio: claro en modo claro y negro en modo oscuro (sigue el tema), con el título, la bajada, los dos caminos (tienda y
 * servicio técnico) y una vidriera quieta con los productos del local. Sin 3D ni scroll fijado: la notebook 3D vive en
 * Servicio técnico (el despiece) y se descarga recién al acercarse. Componente de servidor: no manda JavaScript.
 * Todo aparece una sola vez al cargar (keyframes "in", 600 ms); con "reducir movimiento", quieto desde el principio.
 */
export function Hero() {
  const st = openStatus();
  return (
    <section className="hero" id="inicio">
      <div className="wrap hero-copy">
        <p className="status" id="status" data-in="" style={vars({ '--d': '.05s' })}>
          <span className={`dot${st.open ? '' : ' off'}`}></span><span className="txt">{st.txt}</span>
        </p>
        <h1 data-in="" style={vars({ '--d': '.1s' })}>Tu <span className="grad">tecnología</span>.<br /><span className="hl">En las mejores manos.</span></h1>
        <p className="hero-sub" data-in="" style={vars({ '--d': '.18s' })}>Notebooks, impresoras, insumos y accesorios. Y servicio técnico con trato directo y seguimiento online de tu equipo.</p>
        <div className="ctas" data-in="" style={vars({ '--d': '.26s' })}>
          <a className="btn" href="#tienda">Ver la tienda</a>
          <a className="lnk" href="#servicio">Reparar mi equipo</a>
        </div>
      </div>
      {/* Decorativa: lo que muestra está dicho en el texto */}
      <div className="vit" aria-hidden="true">
        {VIDRIERA.map(([r, k], i) => (
          <span key={k} className={`vit-i vit-${k}`} data-in="" style={vars({ '--d': `${(.32 + (k === 'nb' ? 0 : .08 + (i % 2) * .06)).toFixed(2)}s` })}><Render r={r} /></span>
        ))}
      </div>
    </section>
  );
}
