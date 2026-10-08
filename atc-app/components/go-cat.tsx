'use client';

import type { ReactNode } from 'react';
import { useUI } from './app-shell';

/** Link a la tienda que además elige una categoría (pie, perfiles de notebook). */
export function GoCat({ cat, className, children }: { cat: string; className?: string; children: ReactNode }) {
  const { setCat } = useUI();
  return <a className={className} href="#tienda" data-go-cat={cat} onClick={() => setCat(cat)}>{children}</a>;
}
