// DATOS DE EJEMPLO (maqueta del panel del dueño): pedidos inventados, armados en relación con "ahora" para que siempre
// haya de cada estado. Clientes con nombre e inicial (lo mínimo, como el seguimiento). Nada de esto es real.
// En la etapa 2 los crea la bolsa de la tienda (crear_pedido) y salen de la base.
import { PRODUCTS } from './catalog';
import { stamp, sumarMin, type Pedido, type PedidoItem } from '@/lib/panel/pedidos';

const it = (productId: string, qty = 1): PedidoItem => ({ productId, qty, unit: PRODUCTS.find(p => p.id === productId)!.price });

export function pedidosDemo(ahora: { ymd: string; hm: string }): Pedido[] {
  const now = stamp(ahora.ymd, ahora.hm), hace = (h: number) => sumarMin(now, -Math.round(h * 60));
  return [
    // Pendientes de pago (reservan el stock hasta las 48 h)
    { codigo: 'P-7KQ2-4M', creado: hace(2), cliente: 'Lucía M.', entrega: 'retiro', pago: 'transferencia', items: [it('ins-105a', 2)] },
    { codigo: 'P-3HXD-9T', creado: hace(19), cliente: 'Martín G.', entrega: 'envio', pago: 'mp', items: [it('per-g203')] },
    { codigo: 'P-8WRB-2C', creado: hace(41), cliente: 'Sofía R.', entrega: 'retiro', pago: 'efectivo', items: [it('nb-hp250')] },
    // Vencieron sin pago: se autocancelaron y el stock volvió
    { codigo: 'P-5NJF-7Q', creado: hace(53), cliente: 'Diego P.', entrega: 'envio', pago: 'transferencia', items: [it('per-k552'), it('red-hdmi', 2)] },
    { codigo: 'P-2VTA-6K', creado: hace(123), cliente: 'Carla B.', entrega: 'retiro', pago: 'mp', items: [it('comp-nv2')] },
    // Pagados, todavía sin entregar
    { codigo: 'P-9GMC-3R', creado: hace(30), pagado: hace(26), cliente: 'Andrés F.', entrega: 'envio', pago: 'transferencia', items: [it('imp-l3250')] },
    { codigo: 'P-4PZE-8H', creado: hace(9), pagado: hace(6), cliente: 'Valeria T.', entrega: 'retiro', pago: 'efectivo', items: [it('ins-t544')] },
    // Retrasados: pagados hace más de 3 días y sin entregar (aviso solo para el dueño)
    { codigo: 'P-6BYK-1W', creado: hace(120), pagado: hace(116), cliente: 'Javier S.', entrega: 'envio', pago: 'transferencia', items: [it('nb-ideapad')] },
    { codigo: 'P-1DSV-5N', creado: hace(192), pagado: hace(170), cliente: 'Paula N.', entrega: 'retiro', pago: 'mp', items: [it('red-hdmi', 3)] },
    // Historial: uno entregado y uno que canceló el dueño antes del pago
    { codigo: 'P-0XQH-7B', creado: hace(74), pagado: hace(72), entregado: hace(50), cliente: 'Romina V.', entrega: 'retiro', pago: 'efectivo', items: [it('ins-105a')] },
    { codigo: 'P-7TMR-2P', creado: hace(53), cancelado: hace(48), cliente: 'Hernán C.', entrega: 'envio', pago: 'transferencia', items: [it('per-g203')] },
  ];
}
