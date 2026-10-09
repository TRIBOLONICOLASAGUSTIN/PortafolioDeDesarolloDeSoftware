'use client';

import { Icon } from '../ui';
import { usePanel } from './panel-shell';
import { ICON, KIND_LABEL, payLabel, titulo } from '@/lib/panel/labels';
import { labelDay } from '@/lib/panel/dates';
import { ingreso, resultado, type Movement } from '@/lib/panel/types';
import { fmt, fmtMonto } from '@/lib/format';

// Una fila de movimiento: abre su detalle. Los montos van en el color del texto (el signo dice si salió plata).
export function MovRow({ m, withDay }: { m: Movement; withDay?: boolean }) {
  const { openSheet, hoy } = usePanel();
  const res = resultado(m);
  return (
    <li>
      <button type="button" className="pn-mov" data-id={m.id} data-kind={m.kind} data-ymd={m.ymd} data-res={res} onClick={() => openSheet({ t: 'detalle', id: m.id })}>
        <span className={`pn-mic ${m.kind}`}><Icon n={ICON[m.kind]} /></span>
        <span className="pn-rt">
          <b>{titulo(m)}</b>
          <small>
            {KIND_LABEL[m.kind]} · {withDay ? `${labelDay(m.ymd, hoy)}, ` : ''}{m.hm} · {payLabel(m.pay)}
            {m.kind !== 'gasto' && <span className="pn-g-in"> · ganancia {fmtMonto(res)}</span>}
            {m.status === 'sin-guardar' && <em className="pn-ns"> · Sin guardar</em>}
          </small>
        </span>
        <span className="pn-mamt">
          <b className="pn-num">{m.kind === 'gasto' ? fmtMonto(-m.amount) : fmt(ingreso(m))}</b>
          {m.kind !== 'gasto' && <small className="pn-num pn-g-out">ganancia {fmtMonto(res)}</small>}
        </span>
      </button>
    </li>
  );
}
