import { Icon } from '../ui';

// Las cifras del panel son de ejemplo: nunca tienen que parecer reales (CLAUDE.md).
export function DemoBanner() {
  return (
    <p className="pn-demo" id="pn-demo">
      <Icon n="info" cls="i sm" />
      <span><b>Maqueta con datos de ejemplo.</b> Las cifras no son reales y nada de lo que cargues se guarda.</span>
    </p>
  );
}
