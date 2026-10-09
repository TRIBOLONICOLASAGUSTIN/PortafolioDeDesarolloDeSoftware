import Link from 'next/link';

// 404 en castellano (la de Next sale en inglés). También la usa /panel cuando no está habilitado.
export default function NotFound() {
  return (
    <main className="nf">
      <span className="mark" aria-hidden="true">AT</span>
      <h1>No encontramos esta página.</h1>
      <p className="lede">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <Link className="btn" href="/">Volver al inicio</Link>
    </main>
  );
}
