import type { ReactNode } from 'react';
import { waLink } from '@/lib/whatsapp';

/** Ícono del sprite (#i-*). Decorativo: el texto o el aria-label del botón dan el nombre. */
export const Icon = ({ n, cls = 'i' }: { n: string; cls?: string }) => (
  <svg className={cls} aria-hidden="true"><use href={`#i-${n}`} /></svg>
);

/** Ilustración de producto (#r-*), con fondo de pantalla opcional para notebooks. */
export const Render = ({ r, wall }: { r: string; wall?: string }) => (
  <svg className="r" aria-hidden="true" style={wall ? ({ '--wall': `url(#g-wall-${wall})` } as React.CSSProperties) : undefined}><use href={`#r-${r}`} /></svg>
);

/** Link a WhatsApp con el mensaje armado. */
export const Wa = ({ text, className, style, children }: { text: string; className?: string; style?: React.CSSProperties; children: ReactNode }) => (
  <a className={className} style={style} href={waLink(text)} target="_blank" rel="noopener">{children}</a>
);
