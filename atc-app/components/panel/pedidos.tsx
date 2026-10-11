'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../ui';
import { Chips } from './chips';
import { usePanel } from './panel-shell';
import { DemoBanner } from './demo-banner';
import { TransferenciaForm } from './forms';
import { ESTADO_IDS, ESTADO_PEDIDO, ESTADOS, minutosEntre, total, vence, type EstadoPedido, type Pedido, type Vista } from '@/lib/panel/pedidos';
import { productName, payLabel } from '@/lib/panel/labels';
import { diaLargo, long, short } from '@/lib/panel/dates';
import { storeStamp } from '@/lib/hours';
import { fmt } from '@/lib/format';

const IC: Record<EstadoPedido, string> = { pendiente: 'clock', pagado: 'check-c', retrasado: 'bell', autocancelado: 'refresh', entregado: 'check', cancelado: 'x' };
const AYUDA: Record<Vista, string> = {
  pendiente: 'Sin pagar. El stock queda reservado hasta 48 h; si no se pagan, se cancelan solos y el stock vuelve.',
  pagado: 'Pagados y todavía sin entregar.',
  retrasado: 'Pagados y sin entregar desde hace varios días. Es un aviso para vos: al cliente no se le promete un plazo.',
  autocancelado: 'No se pagaron en 48 h: se cancelaron solos y el stock volvió a estar disponible.',
};
const RETRASOS: [string, string][] = [['2', '2 días'], ['3', '3 días'], ['5', '5 días'], ['7', '7 días']];
const horas = (min: number) => (min < 60 ? `${Math.max(1, Math.round(min))} min` : `${Math.round(min / 60)} h`);
const dias = (min: number) => { const d = Math.floor(min / 1440); return d === 1 ? '1 día' : `${d} días`; };
const resumenItems = (p: Pedido) => p.items.map(i => `${i.qty > 1 ? `${i.qty} × ` : ''}${productName(i.productId)}`).join(', ');

/** Qué tan urgente es (texto de la fila) */
function cuando(p: Pedido, e: EstadoPedido, ahora: string) {
  if (e === 'pendiente') return `Vence en ${horas(minutosEntre(ahora, vence(p)))}`;
  if (e === 'pagado') return `Pagado ${short(p.pagado!.slice(0, 10))}`;
  if (e === 'retrasado') return `Sin entregar hace ${dias(minutosEntre(p.pagado!, ahora))}`;
  if (e === 'autocancelado') return `Venció el ${short(vence(p).slice(0, 10))}`;
  return ESTADO_PEDIDO[e];
}

// Pedidos de la tienda (los arma la bolsa y llegan por WhatsApp; de ejemplo hasta conectar la base). Pestañas por estado
// (también por ?estado=, que valida el servidor), del más urgente al menos urgente. Cada fila abre el detalle.
export function Pedidos({ estado: inicial }: { estado: Vista }) {
  const { pedidos, estadoPedido, reglas, setRetraso, openSheet, ahoraS } = usePanel();
  // El estado vive en la dirección (?estado=): lo cambian las pestañas y el menú, y "Atrás" lo respeta.
  const q = useSearchParams().get('estado');
  const estado: Vista = (ESTADO_IDS as string[]).includes(q ?? '') ? (q as Vista) : inicial;
  const n = Object.fromEntries(ESTADOS.map(([e]) => [e, pedidos.filter(p => estadoPedido(p) === e).length])) as Record<Vista, number>;
  const lista = pedidos.filter(p => estadoPedido(p) === estado).sort((a, b) => {
    const k = (p: Pedido) => (estado === 'pendiente' ? vence(p) : estado === 'autocancelado' ? `~${vence(p)}` : p.pagado ?? p.creado);
    return estado === 'autocancelado' ? (k(a) < k(b) ? 1 : -1) : k(a) < k(b) ? -1 : 1;
  });
  const elegir = (v: Vista) => history.replaceState(null, '', `/panel/pedidos?estado=${v}`);
  return (
    <>
    <h1 className="pn-t" tabIndex={-1}>Pedidos</h1>
    <DemoBanner />
    <div className="pn-movl pn-peds" data-estado={estado}>
      <Chips name="pn-ped" legend="Estado" value={estado} onChange={elegir} options={ESTADOS.map(([e, t]) => [e, `${t} · ${n[e]}`])} />
      <p className="pn-hint">{AYUDA[estado]}</p>
      {estado === 'retrasado' && (
        <div className="pn-fld pn-retraso">
          <span className="pn-lab" aria-hidden="true">Avisar si pasan</span>
          <Chips name="pn-retraso" legend="Avisar si pasan" value={String(reglas.retrasoD)} onChange={v => setRetraso(+v)} options={RETRASOS} />
        </div>
      )}
      <p className="pn-count" role="status">{lista.length === 1 ? '1 pedido' : `${lista.length} pedidos`}</p>
      {lista.length > 0 && (
        <ul className="pn-card pn-movs pn-pedl">
          {lista.map(p => (
            <li key={p.codigo}>
              <button type="button" className="pn-inv pn-ped" data-codigo={p.codigo} data-estado={estado} onClick={() => openSheet({ t: 'pedido', codigo: p.codigo })}>
                <span className={`pn-ic pn-ped-ic ${estado}`}><Icon n={IC[estado]} /></span>
                <span className="pn-rt"><b>{p.cliente}<span className="pn-g-out"> · <span className="pn-nw">{p.codigo}</span></span></b><small><span className="pn-g-in pn-nw">{p.codigo} · </span>{resumenItems(p)}</small></span>
                <span className="pn-mamt"><b className="pn-num">{fmt(total(p))}</b><small className={`pn-pst ${estado}`}>{cuando(p, estado, ahoraS)}</small></span>
                <Icon n="chev-r" cls="i sm pn-chev" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!lista.length && <p className="pn-empty">No hay pedidos {ESTADOS.find(([e]) => e === estado)![1].toLowerCase()}.</p>}
    </div>
    </>
  );
}

/** Hora del local ahora (si cambió el día, hay que recargar: lo cargado lleva la fecha de hoy) */
function hmAhora(hoy: string, toast: (m: string) => void) {
  const now = storeStamp();
  if (now.ymd !== hoy) { toast('Cambió el día: recargá el panel.'); return null; }
  return now.hm;
}

// Detalle de un pedido, con lo que se puede hacer según su estado.
export function PedidoDetalle({ codigo }: { codigo: string }) {
  const { pedidos, estadoPedido, ahoraS, hoy, toast, closeSheet, pagarPedido, entregarPedido, cancelarPedido } = usePanel();
  const [confirmar, setConfirmar] = useState(false);
  const [transferir, setTransferir] = useState(false);
  const p = pedidos.find(x => x.codigo === codigo);
  if (!p) return <h2 id="pn-sh-h" className="pn-sh-t">No encontramos ese pedido</h2>;
  const e = estadoPedido(p);
  if (transferir && e === 'pendiente') return (
    <div className="pn-det pn-pdet" data-codigo={p.codigo}>
      <h2 id="pn-sh-h" className="pn-sh-t">Transferencia del pedido {p.codigo}</h2>
      <TransferenciaForm pedido={p} total={total(p)} onVolver={() => setTransferir(false)} />
    </div>
  );
  const t = p.transferencia;
  const accion = (fn: (c: string, hm: string) => void, msg: string) => () => {
    const hm = hmAhora(hoy, toast);
    if (!hm) return;
    fn(codigo, hm); toast(`${msg} Maqueta: no se guardó.`); closeSheet();
  };
  const fecha = (s: string) => long(s.slice(0, 10), s.slice(11, 16));
  return (
    <div className="pn-det pn-pdet" data-codigo={p.codigo} data-estado={e}>
      <h2 id="pn-sh-h" className="pn-sh-t">Pedido {p.codigo}</h2>
      <p className="pn-det-amt pn-num">{fmt(total(p))}</p>
      <p><span className={`pn-pst-pill ${e}`}>{ESTADO_PEDIDO[e]}</span></p>
      {e === 'retrasado' && <p className="pn-hint pn-pdet-aviso">Pagado hace {dias(minutosEntre(p.pagado!, ahoraS))} y todavía sin entregar. Coordiná la entrega con {p.cliente} por WhatsApp.</p>}
      {e === 'pendiente' && <p className="pn-hint pn-pdet-aviso">Si no se paga, se cancela solo el {diaLargo(vence(p).slice(0, 10)).toLowerCase()} a las {vence(p).slice(11, 16)} y el stock vuelve.</p>}
      <ol className="pn-step" aria-label="Productos del pedido">
        {p.items.map(i => <li key={i.productId}><b>{productName(i.productId)}</b><span>{i.qty} × {fmt(i.unit)} · {fmt(i.qty * i.unit)}</span></li>)}
      </ol>
      <dl className="pn-dl">
        <div><dt>Cliente</dt><dd>{p.cliente}</dd></div>
        <div><dt>Entrega</dt><dd>{p.entrega === 'retiro' ? 'Retira en el local' : 'Envío a coordinar por WhatsApp'}</dd></div>
        <div><dt>Pago elegido</dt><dd>{payLabel(p.pago)}</dd></div>
        <div><dt>Pedido</dt><dd>{fecha(p.creado)}</dd></div>
        {p.pagado && <div><dt>Pagado</dt><dd>{fecha(p.pagado)}</dd></div>}
        {t && <div><dt>Transferencia</dt><dd>{t.pagador} · <span className="pn-num">{fmt(t.monto)}</span></dd></div>}
        {t && <div><dt>Comprobante</dt><dd><a className="lnk" href={t.comprobante.url} target="_blank" rel="noopener" {...(t.comprobante.tipo === 'application/pdf' ? { download: t.comprobante.nombre } : {})}>Ver comprobante</a> <small>(solo lo ves vos)</small></dd></div>}
        {p.entregado && <div><dt>Entregado</dt><dd>{fecha(p.entregado)}</dd></div>}
        {e === 'autocancelado' && <div><dt>Se canceló solo</dt><dd>{fecha(vence(p))} · el stock volvió</dd></div>}
        {p.cancelado && <div><dt>Cancelado</dt><dd>{fecha(p.cancelado)} · el stock volvió</dd></div>}
      </dl>
      <div className="pn-foot pn-pdet-acts">
        {e === 'pendiente' && p.pago === 'transferencia' && <button type="button" className="btn btn-full" data-act="transferencia" data-autofocus onClick={() => setTransferir(true)}><Icon n="receipt" />Registrar transferencia</button>}
        {e === 'pendiente' && <button type="button" className={`btn btn-full${p.pago === 'transferencia' ? ' btn-gray' : ''}`} data-act="pagar" data-autofocus={p.pago !== 'transferencia' || undefined} onClick={accion(pagarPedido, `Pedido ${codigo} pagado: la venta entró en Ganancias.`)}><Icon n="check" />Marcar como pagado</button>}
        {e === 'pendiente' && p.pago !== 'transferencia' && <button type="button" className="btn btn-gray btn-full" data-act="transferencia" onClick={() => setTransferir(true)}><Icon n="receipt" />Registrar transferencia</button>}
        {e === 'pendiente' && !confirmar && <button type="button" className="btn btn-gray btn-full" data-act="cancelar" onClick={() => setConfirmar(true)}>Cancelar pedido</button>}
        {e === 'pendiente' && confirmar && <button type="button" className="btn btn-gray btn-full pn-danger" data-act="cancelar-ok" autoFocus onClick={accion(cancelarPedido, `Pedido ${codigo} cancelado: el stock volvió.`)}>Sí, cancelar y devolver el stock</button>}
        {(e === 'pagado' || e === 'retrasado') && <button type="button" className="btn btn-full" data-act="entregar" data-autofocus onClick={accion(entregarPedido, `Pedido ${codigo} entregado.`)}><Icon n="check" />Marcar como entregado</button>}
      </div>
    </div>
  );
}
