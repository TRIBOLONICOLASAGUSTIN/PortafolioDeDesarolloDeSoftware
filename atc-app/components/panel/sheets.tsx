'use client';

import { useRef } from 'react';
import { usePanel, type Sheet as SheetT } from './panel-shell';
import { Sheet } from './sheet';
import { Detalle } from './detalle';

// Contenido de la hoja abierta. Al cerrar se sigue mostrando el último contenido mientras la hoja se va.
export function Sheets() {
  const { sheet, closeSheet } = usePanel();
  const last = useRef<SheetT>(null);
  if (sheet) last.current = sheet;
  const s = sheet ?? last.current;
  return (
    <Sheet open={!!sheet} onClose={closeSheet} labelledBy="pn-sh-h">
      {s?.t === 'detalle' && <Detalle id={s.id} />}
    </Sheet>
  );
}
