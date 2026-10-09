import type { ReactNode } from 'react';

// Encabezado de cada tarjeta con gráfico: el título y, en la misma línea, el monto que representa.
export function CardHead({ id, title, value, sub, valueId }: { id: string; title: string; value: ReactNode; sub?: ReactNode; valueId?: string }) {
  return (
    <header className="pn-ch">
      <h2 className="pn-h2" id={id}>{title}</h2>
      <p className="pn-ch-v"><b className="pn-num" id={valueId}>{value}</b>{sub && <small>{sub}</small>}</p>
    </header>
  );
}
