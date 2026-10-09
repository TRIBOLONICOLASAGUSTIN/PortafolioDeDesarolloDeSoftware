'use client';

import type { ReactNode } from 'react';

// Campo de formulario con etiqueta, ayuda y error asociados (aria-describedby / aria-invalid los pone el control).
export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="pn-fld">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="pn-hint" id={`${id}-h`}>{hint}</p>}
      {error && <p className="pn-err" id={`${id}-e`}>{error}</p>}
    </div>
  );
}
/** Atributos de accesibilidad de un control según su error y su ayuda. */
export const aria = (id: string, error?: string, hint?: boolean) => ({
  id, 'aria-invalid': error ? true : undefined,
  'aria-describedby': [hint ? `${id}-h` : '', error ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined,
});
