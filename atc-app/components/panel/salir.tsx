'use client';

// Cierra la sesión del superadmin (el servidor borra la cookie) y vuelve a la tienda.
export function Salir() {
  const salir = async () => {
    try { await fetch('/api/salir', { method: 'POST' }); } finally { location.assign('/'); }
  };
  return <button type="button" className="pn-salir" onClick={salir}>Salir</button>;
}
