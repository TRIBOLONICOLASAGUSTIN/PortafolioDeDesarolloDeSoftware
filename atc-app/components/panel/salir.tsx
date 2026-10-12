'use client';

import { usePanel } from './panel-shell';

// Cierra la sesión del superadmin (el servidor borra la cookie) y va a `destino`: la tienda, o el ingreso para volver a
// entrar (ver un comprobante lo pide a los 15 minutos; /ingresar con una sesión abierta manda directo al panel).
// Si el servidor no respondió bien, no se sale: la sesión seguiría abierta y sería engañoso mostrar la tienda.
export async function cerrarSesion(destino: '/' | '/ingresar', toast: (m: string) => void) {
  try {
    const r = await fetch('/api/salir', { method: 'POST' });
    if (r.ok) { location.assign(destino); return; }
  } catch {}
  toast('No se pudo cerrar la sesión. Probá de nuevo.');
}

export function Salir() {
  const { toast } = usePanel();
  return <button type="button" className="pn-salir" onClick={() => cerrarSesion('/', toast)}>Salir</button>;
}
