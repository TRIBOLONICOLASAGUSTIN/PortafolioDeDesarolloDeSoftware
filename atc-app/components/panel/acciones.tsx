'use client';

import { Icon } from '../ui';
import { usePanel, type Sheet } from './panel-shell';

export const ACCIONES: [Exclude<Sheet, null>['t'], string, string, string][] = [
  ['venta', 'bag', 'Registrar venta', 'Un producto del catálogo, con su costo y cómo te pagaron'],
  ['cobro', 'wrench', 'Cobrar reparación', 'De una orden lista para retirar'],
  ['gasto', 'receipt', 'Registrar gasto', 'Alquiler, servicios, impuestos o envíos'],
  ['exportar', 'download', 'Exportar', 'Planilla con los movimientos del período'],
];

// Las cuatro acciones (equivale a Buy · Send · Receive · Trade de la referencia).
export function Acciones() {
  const { openSheet } = usePanel();
  return (
    <section className="pn-card pn-acc" aria-labelledby="pn-acc-h">
      <h2 className="sr" id="pn-acc-h">Acciones</h2>
      <div className="pn-acts">
        {ACCIONES.map(([t, ic, label]) => (
          <button key={t} type="button" className="pn-act" data-act={t} onClick={() => openSheet({ t } as Exclude<Sheet, null>)}>
            <span className="pn-act-i"><Icon n={ic} /></span>{label}
          </button>
        ))}
      </div>
    </section>
  );
}

// Hoja "¿Qué querés registrar?" (equivale a la lista de opciones de la referencia).
export function AccionesSheet() {
  const { openSheet } = usePanel();
  return (
    <>
      <h2 className="pn-sh-t" id="pn-sh-h">¿Qué querés registrar?</h2>
      <ul className="pn-opts">
        {ACCIONES.map(([t, ic, label, d], i) => (
          <li key={t}>
            <button type="button" className="pn-opt" data-act={t} onClick={() => openSheet({ t } as Exclude<Sheet, null>)} data-autofocus={i === 0 || undefined}>
              <span className="pn-act-i"><Icon n={ic} /></span>
              <span className="pn-rt"><b>{label}</b><small>{d}</small></span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
