'use client';

import { Icon } from '../ui';
import { usePanel } from './panel-shell';
import { ESTADO, gastoLabel, payLabel, productName, tipo } from '@/lib/panel/labels';
import { long } from '@/lib/panel/dates';
import { ingreso, resultado } from '@/lib/panel/types';
import { fmt, fmtMonto, fmtPct } from '@/lib/format';

const unidades = (n: number) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`;

// Detalle de un movimiento (equivale a "Details of transactions" de la referencia).
export function Detalle({ id }: { id: string }) {
  const { byMov } = usePanel();
  const m = byMov.get(id);
  if (!m) return <h2 id="pn-sh-h" className="pn-sh-t">No encontramos ese movimiento</h2>;
  const total = m.kind === 'gasto' ? -m.amount : ingreso(m);
  const res = resultado(m);
  const head = m.kind === 'venta' ? `Vendiste ${productName(m.items[0].productId)}${m.items.length > 1 ? ` y ${m.items.length - 1} más` : ''}`
    : m.kind === 'reparacion' ? `Cobraste la reparación de ${m.equipo}` : `Pagaste: ${m.concept}`;
  // El detalle para el cliente va sin número fijo: el dueño elige el contacto en WhatsApp. No es una factura.
  const wa = m.kind === 'gasto' ? null : `https://wa.me/?text=${encodeURIComponent([
    'EJEMPLO (maqueta): no es una compra real', 'Detalle de tu compra en AT Computación', long(m.ymd, m.hm),
    ...(m.kind === 'venta' ? m.items.map(i => `${i.qty} × ${productName(i.productId)}: ${fmt(i.qty * i.unit)}`) : [`Reparación de ${m.equipo} (orden ${m.orderCode}): ${fmt(m.amount)}`]),
    `Total: ${fmt(ingreso(m))} · ${payLabel(m.pay)}`, '¡Gracias!',
  ].join('\n'))}`;
  return (
    <div className="pn-det" data-id={m.id}>
      <h2 id="pn-sh-h" className="pn-sh-t">{head}</h2>
      <p className="pn-det-amt pn-num">{fmtMonto(total)}</p>
      <p><span className={`pn-st ${m.status}`}>{m.status === 'cobrado' && <Icon n="check" cls="i xs" />}{ESTADO[m.status]}</span></p>
      {wa && <a className="btn btn-wa pn-det-wa" href={wa} target="_blank" rel="noopener"><Icon n="wa" />Enviar el detalle por WhatsApp</a>}

      <ol className="pn-step" aria-label="Recorrido de la plata">
        {m.kind === 'venta' && m.items.map(i => <li key={i.productId}><b>{productName(i.productId)}</b><span>Salen {unidades(i.qty)} · {fmt(i.qty * i.unit)}</span></li>)}
        {m.kind === 'reparacion' && <li><b>Orden {m.orderCode}</b><span>{m.equipo}{m.partsCost ? ` · repuestos ${fmt(m.partsCost)}` : ''}</span></li>}
        {m.kind === 'gasto' && <li><b>{payLabel(m.pay)}</b><span>Sale {fmt(m.amount)}</span></li>}
        {m.kind === 'gasto' ? <li><b>{gastoLabel(m.cat)}</b><span>{m.concept}</span></li> : <li><b>{payLabel(m.pay)}</b><span>Entra {fmt(ingreso(m))}</span></li>}
      </ol>
      {m.kind !== 'gasto' && (
        <p className="pn-det-res"><span>Ganancia de {m.kind === 'venta' ? 'esta venta' : 'esta reparación'}</span><b className="pn-num">{fmtMonto(res)}{ingreso(m) > 0 && ` (${fmtPct(res / ingreso(m)).replace('+', '')})`}</b></p>
      )}

      <dl className="pn-dl">
        <div><dt>Fecha</dt><dd>{long(m.ymd, m.hm)}</dd></div>
        <div><dt>N.º de movimiento</dt><dd>{m.id}</dd></div>
        <div><dt>Nota</dt><dd>{m.note || '—'}</dd></div>
        <div><dt>Tipo</dt><dd>{tipo(m)}</dd></div>
      </dl>
    </div>
  );
}
