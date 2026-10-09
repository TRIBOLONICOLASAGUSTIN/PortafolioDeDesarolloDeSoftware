import { Icon } from '../ui';
import type { Totales } from '@/lib/panel/stats';
import { fmt, fmtMonto } from '@/lib/format';

// "De dónde sale" la ganancia: productos, servicio técnico y gastos (equivale a las filas de totales de la referencia).
export function Desglose({ t }: { t: Totales }) {
  const rows: [string, string, string, string, number][] = [
    ['ventas', 'bag', 'Ventas de productos', `Vendiste ${fmt(t.ventas)} · costo ${fmt(t.costoVentas)}`, t.gananciaVentas],
    ['servicio', 'wrench', 'Servicio técnico', `Cobraste ${fmt(t.servicio)} · repuestos ${fmt(t.repuestos)}`, t.gananciaServicio],
    ['gastos', 'receipt', 'Gastos', t.nGastos === 1 ? '1 gasto en el período' : `${t.nGastos} gastos en el período`, -t.gastos],
  ];
  return (
    <section className="pn-card pn-des" aria-labelledby="pn-des-h">
      <h2 className="pn-h2" id="pn-des-h">De dónde sale</h2>
      <ul className="pn-rows">
        {rows.map(([k, ic, title, sub, v]) => (
          <li key={k} className="pn-row" data-k={k}>
            <span className="pn-ic"><Icon n={ic} /></span>
            <span className="pn-rt"><b>{title}</b><small>{sub}</small></span>
            <span className="pn-amt pn-num">{fmtMonto(v)}</span>
          </li>
        ))}
      </ul>
      <p className="pn-tot"><span>Ganancia</span><b className="pn-num" id="pn-des-total">{fmtMonto(t.ganancia)}</b></p>
      <details className="pn-how">
        <summary>¿Cómo se calcula?</summary>
        <p>Lo que vendiste menos lo que te costó esa mercadería, más lo que cobraste por reparaciones menos los repuestos, menos los gastos del local. La compra de mercadería no se cuenta como gasto: su costo ya se resta cuando la vendés.</p>
      </details>
    </section>
  );
}
