'use client';

import { useState } from 'react';
import { Icon } from './ui';
import { waLink } from '@/lib/whatsapp';

/** Pedido de arrepentimiento: arma el mensaje de WhatsApp. Nada se guarda en el sitio. */
export function Arrepentimiento() {
  const [codigo, setCodigo] = useState('');
  const [prod, setProd] = useState('');
  const msg = `Hola, quiero arrepentirme de una compra (Botón de arrepentimiento).${codigo.trim() ? `\nPedido: ${codigo.trim()}` : ''}${prod.trim() ? `\nProducto: ${prod.trim()}` : ''}`;
  return (
    <form className="lg-form" onSubmit={e => { e.preventDefault(); window.open(waLink(msg), '_blank', 'noopener'); }}>
      <label className="lg-campo"><span>Código del pedido <small>(opcional)</small></span>
        <input id="arr-codigo" placeholder="P-XXXX-XX" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} /></label>
      <label className="lg-campo"><span>Producto <small>(opcional)</small></span>
        <input id="arr-prod" placeholder="Por ejemplo: mouse G203" autoComplete="off" maxLength={80} value={prod} onChange={e => setProd(e.target.value)} /></label>
      <button className="btn btn-wa" type="submit" id="arr-ok"><Icon n="wa" />Pedirlo por WhatsApp</button>
    </form>
  );
}
