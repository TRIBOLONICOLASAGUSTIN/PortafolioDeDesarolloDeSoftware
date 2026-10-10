import Link from 'next/link';

// Botón del dueño para pasar de la tienda al panel. Lo dibuja el servidor SOLO si la sesión del superadmin es válida
// (app/page.tsx): un cliente nunca lo recibe en el HTML, y aunque alguien lo inyecte con F12, /panel sigue dando 404.
// Abajo a la izquierda, del lado opuesto al botón de WhatsApp; en el panel, el mismo lugar lleva de vuelta a la tienda.
export function OwnerSwitch() {
  return (
    <Link className="own-sw" href="/panel" prefetch={false} aria-label="Ir al panel del dueño">
      <span className="mark" aria-hidden="true">AT</span><span className="own-t">Panel</span>
    </Link>
  );
}
