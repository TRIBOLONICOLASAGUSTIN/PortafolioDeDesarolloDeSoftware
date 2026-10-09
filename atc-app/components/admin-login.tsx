'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';

declare global { interface Window { turnstile?: { reset: (el?: string | HTMLElement) => void } } }

const MOTIVOS: Record<string, string> = {
  credenciales: 'Los datos no son correctos.',
  demasiados_intentos: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  verificacion: 'No pudimos verificar el ingreso. Probá de nuevo.',
  solicitud_invalida: 'Revisá los datos: el código tiene 6 números.',
  origen: 'No se pudo ingresar desde esta página.',
  no_disponible: 'El ingreso no está disponible en este momento.',
};

// Ingreso del superadmin: usuario, contraseña y el código de 6 números de la app del celular.
// La sesión la crea el servidor (cookie HttpOnly): el navegador nunca ve ni guarda credenciales.
export function AdminLogin({ turnstileKey, nonce }: { turnstileKey?: string; nonce?: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !form.current) return;
    const f = new FormData(form.current);
    const token = f.get('cf-turnstile-response');
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/ingresar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: String(f.get('usuario') ?? ''), clave: String(f.get('clave') ?? ''), codigo: String(f.get('codigo') ?? '').replace(/\s/g, ''), ...(typeof token === 'string' ? { turnstileToken: token } : {}) }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; motivo?: string };
      if (r.ok && j.ok) { location.assign('/panel'); return; }
      setErr(MOTIVOS[j.motivo ?? ''] ?? MOTIVOS.no_disponible);
    } catch {
      setErr(MOTIVOS.no_disponible);
    }
    const code = form.current.elements.namedItem('codigo') as HTMLInputElement | null;
    if (code) { code.value = ''; code.focus(); }
    if (turnstileKey) window.turnstile?.reset();
    setBusy(false);
  };

  return (
    <main className="in">
      <section className="in-card" aria-labelledby="in-h">
        <span className="mark" aria-hidden="true">AT</span>
        <h1 id="in-h">Ingresar</h1>
        <p className="in-sub">Acceso privado del dueño.</p>
        <form className="in-form" ref={form} onSubmit={submit} noValidate>
          <div className="in-fld">
            <label htmlFor="in-user">Usuario</label>
            <input className="in-in" id="in-user" name="usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} />
          </div>
          <div className="in-fld">
            <label htmlFor="in-pass">Contraseña</label>
            <input className="in-in" id="in-pass" name="clave" type="password" autoComplete="current-password" required maxLength={200} />
          </div>
          <div className="in-fld">
            <label htmlFor="in-code">Código del celular</label>
            <input className="in-in in-code" id="in-code" name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required aria-describedby="in-code-h" />
            <p className="in-hint" id="in-code-h">Los 6 números de tu app de autenticación.</p>
          </div>
          {turnstileKey && <div className="cf-turnstile" data-sitekey={turnstileKey} data-size="flexible" data-language="es"></div>}
          <p className="in-err" role="alert">{err}</p>
          <button className="btn btn-full" type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
        <Link className="in-back" href="/" prefetch={false}>Volver a la tienda</Link>
      </section>
      {turnstileKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />}
    </main>
  );
}
