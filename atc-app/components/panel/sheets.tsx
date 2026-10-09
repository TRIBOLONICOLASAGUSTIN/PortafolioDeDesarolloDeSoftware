'use client';

import { useRef } from 'react';
import { usePanel, type Sheet as SheetT } from './panel-shell';
import { Sheet } from './sheet';
import { Detalle } from './detalle';
import { AccionesSheet } from './acciones';
import { CobroForm, GastoForm, VentaForm } from './forms';
import { Exportar } from './exportar';

const TITULO = { venta: 'Registrar venta', cobro: 'Cobrar reparación', gasto: 'Registrar gasto', exportar: 'Exportar movimientos' } as const;

// Contenido de la hoja abierta. Al cerrar se sigue mostrando el último contenido mientras la hoja se va.
export function Sheets() {
  const { sheet, closeSheet } = usePanel();
  const last = useRef<SheetT>(null);
  if (sheet) last.current = sheet;
  const s = sheet ?? last.current;
  return (
    <Sheet open={!!sheet} onClose={closeSheet} labelledBy="pn-sh-h">
      {s?.t === 'detalle' && <Detalle id={s.id} />}
      {s?.t === 'acciones' && <AccionesSheet />}
      {s && s.t in TITULO && <h2 className="pn-sh-t" id="pn-sh-h">{TITULO[s.t as keyof typeof TITULO]}</h2>}
      {s?.t === 'venta' && <VentaForm key={`v${!!sheet}`} />}
      {s?.t === 'cobro' && <CobroForm key={`c${!!sheet}`} code={s.code} />}
      {s?.t === 'gasto' && <GastoForm key={`g${!!sheet}`} />}
      {s?.t === 'exportar' && <Exportar />}
    </Sheet>
  );
}
