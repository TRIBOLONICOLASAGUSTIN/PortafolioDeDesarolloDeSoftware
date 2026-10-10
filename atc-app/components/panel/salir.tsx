'use client';

import { usePanel } from './panel-shell';

// Cierra la sesión del superadmin (el servidor borra la cookie) y vuelve a la tienda.
// Si el servidor no respondió bien, no se sale: la sesión seguiría abierta y sería engañoso mostrar la tienda.
export function Salir() {
  const { toast } = usePanel();
  const salir = async () => {
    try {
      const r = await fetch('/api/salir', { method: 'POST' });
      if (r.ok) { location.assign('/'); return; }
    } catch {}
    toast('No se pudo cerrar la sesión. Probá de nuevo.');
  };
  return <button type="button" className="pn-salir" onClick={salir}>Salir</button>;
}
