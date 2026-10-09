import { Icon } from '../ui';
import { CardHead } from './card-head';
import { Sparkline } from './sparkline';
import type { Totales } from '@/lib/panel/stats';
import { fmt, fmtMonto } from '@/lib/format';

export type Sparks = { ventas: number[]; servicio: number[]; gastos: number[] };

// "De dónde sale" la ganancia: productos, servicio técnico y gastos, cada uno con su tendencia del período.
export function Desglose({ t, sparks }: { t: Totales; sparks: Sparks }) {
  const rows: [keyof Sparks, string, string, string, number][] = [
    ['ventas', 'bag', 'Ventas de productos', `Vendiste ${fmt(t.ventas)} · costo ${fmt(t.costoVentas)}`, t.gananciaVentas],
    ['servicio', 'wrench', 'Servicio técnico', `Cobraste ${fmt(t.servicio)} · repuestos ${fmt(t.repuestos)}`, t.gananciaServicio],
    ['gastos', 'receipt', 'Gastos', t.nGastos === 1 ? '1 gasto en el período' : `${t.nGastos} gastos en el período`, -t.gastos],
  ];
  return (
    <section className="pn-card pn-des" aria-labelledby="pn-des-h">
      <CardHead id="pn-des-h" title="De dónde sale" value={fmtMonto(t.ganancia)} sub="ganancia del período" valueId="pn-des-total" />
      <ul className="pn-rows">
        {rows.map(([k, ic, title, sub, v]) => (
          <li key={k} className="pn-row" data-k={k}>
            <span className="pn-ic"><Icon n={ic} /></span>
            <span className="pn-rt"><b>{title}</b><small>{sub}</small></span>
            <span className="pn-amt-c">
              <span className="pn-amt pn-num">{fmtMonto(v)}</span>
              <Sparkline values={sparks[k]} tone={k === 'gastos' ? 'neutral' : 'link'} />
            </span>
          </li>
        ))}
      </ul>
      <details className="pn-how">
        <summary>¿Cómo se calcula?</summary>
        <p>Lo que vendiste menos lo que te costó esa mercadería, más lo que cobraste por reparaciones menos los repuestos, menos los gastos del local. La compra de mercadería no se cuenta como gasto: su costo ya se resta cuando la vendés.</p>
      </details>
    </section>
  );
}
