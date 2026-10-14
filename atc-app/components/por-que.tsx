import { vars } from '@/lib/format';

// Ilustraciones propias, del mismo estilo que los productos (luz de arriba, degradés suaves y sombra de piso; usan los
// degradés de components/sprites.tsx). Decorativas: el título de cada tarjeta dice lo mismo.
const Ill = ({ children }: { children: React.ReactNode }) => (
  <svg className="val-ill" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="108" rx="52" ry="6" fill="url(#g-sh)" />
    {children}
  </svg>
);

/** Te atiende el técnico: la marca AT y un globo de chat */
const Tecnico = () => (
  <Ill>
    <rect x="20" y="34" width="60" height="60" rx="16" fill="url(#g-black)" />
    <rect x="21" y="35" width="58" height="29" rx="15" fill="#fff" opacity=".06" />
    <text x="50" y="72" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff" fontFamily="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" letterSpacing=".5">AT</text>
    <g transform="translate(12 -6)">
      <path d="M78 22h44a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14h-24l-12 10v-10h-8a14 14 0 0 1-14-14V36a14 14 0 0 1 14-14z" fill="url(#g-glow)" />
      <path d="M78 23h44a13 13 0 0 1 13 13v6H65v-6a13 13 0 0 1 13-13z" fill="#fff" opacity=".14" />
      <circle cx="88" cy="45" r="4" fill="#fff" /><circle cx="100" cy="45" r="4" fill="#fff" /><circle cx="112" cy="45" r="4" fill="#fff" />
    </g>
  </Ill>
);

/** Nada se toca sin tu OK: el presupuesto y un tilde */
const Ok = () => (
  <Ill>
    <g transform="rotate(-6 66 60)">
      <rect x="36" y="18" width="62" height="82" rx="8" fill="url(#g-paper)" stroke="#d2d2d7" strokeWidth="1" />
      <rect x="46" y="30" width="30" height="6" rx="3" fill="#1d1d1f" opacity=".85" />
      <rect x="46" y="44" width="42" height="4" rx="2" fill="#c7c7cc" />
      <rect x="46" y="54" width="36" height="4" rx="2" fill="#c7c7cc" />
      <rect x="46" y="64" width="40" height="4" rx="2" fill="#c7c7cc" />
      <rect x="46" y="80" width="24" height="6" rx="3" fill="#0071e3" />
    </g>
    <circle cx="106" cy="72" r="24" fill="url(#g-alu)" />
    <circle cx="106" cy="72" r="20" fill="url(#g-glow)" />
    <ellipse cx="99" cy="62" rx="10" ry="5" fill="#fff" opacity=".28" />
    <path d="M96 72.5l7 7 13-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </Ill>
);

/** Garantía escrita de 90 días: un escudo con tilde */
const Garantia = () => (
  <Ill>
    <path d="M80 14l36 13v27c0 25-15.5 41-36 48-20.5-7-36-23-36-48V27z" fill="url(#g-alu)" />
    <path d="M80 21l29 10.5v22.5c0 20.5-12.5 34-29 40-16.5-6-29-19.5-29-40V31.5z" fill="url(#g-glow)" />
    <path d="M80 22l28 10v8H52v-8z" fill="#fff" opacity=".16" />
    <path d="M67 57l9 9 18-19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </Ill>
);

// Tres cosas que este local cumple de verdad (CLAUDE.md: sin plazos, sin "especialistas", sin "oficial"; los dos sellos
// permitidos van tal cual). Fondo oscuro en los dos temas, como la referencia que eligió el dueño.
const TARJETAS: [() => React.JSX.Element, string, string][] = [
  [Tecnico, 'Te atiende el técnico, sin intermediarios.', 'Le contás qué le pasa a tu equipo a la misma persona que lo revisa. Sin call center.'],
  [Ok, 'Nada se toca sin tu OK.', 'Te explicamos qué tiene tu equipo en palabras simples y te pasamos el presupuesto por WhatsApp. Si aprobás la reparación, el diagnóstico no se cobra.'],
  [Garantia, 'Garantía escrita de 90 días.', 'Sobre el trabajo realizado y los repuestos colocados. La fecha de vencimiento la ves en el seguimiento online.'],
];

export function PorQue() {
  return (
    <section className="sec why" id="por-que" aria-labelledby="why-t">
      <div className="wrap">
        <div className="head center rv">
          <h2 className="h2" id="why-t">Por qué elegirnos. <span className="muted">Claro, directo y por escrito.</span></h2>
          <p className="lede">Un local de Santa Fe atendido por su dueño, que también es el técnico.</p>
        </div>
        <div className="values">
          {TARJETAS.map(([Dibujo, t, p], i) => (
            <article key={t} className="val rv" style={i ? vars({ '--d': `${(i * .08).toFixed(2)}s` }) : undefined}>
              <Dibujo />
              <div><h3>{t}</h3><p>{p}</p></div>
            </article>
          ))}
        </div>
        <p className="why-f rv">¿Ya dejaste tu equipo? <a className="lnk" href="#seguimiento">Seguí tu reparación</a></p>
      </div>
    </section>
  );
}
