// Fechas del panel como "YYYY-MM-DD", con aritmética en UTC: no depende de la zona horaria del servidor
// ni del navegador (los dos calculan lo mismo y no hay errores de hidratación). Textos propios, sin Intl.

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAY_MS = 86400000;

const ms = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
const ymdOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const parts = (ymd: string) => ({ y: +ymd.slice(0, 4), m: +ymd.slice(5, 7) - 1, d: +ymd.slice(8, 10) });

export const addDays = (ymd: string, n: number) => ymdOf(ms(ymd) + n * DAY_MS);
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY_MS);
/** 0 = domingo. */
export const dow = (ymd: string) => new Date(ms(ymd)).getUTCDay();
export const monthStart = (ymd: string) => ymd.slice(0, 8) + '01';
/** Suma meses; si el día no existe en el mes destino, queda en el último (31/3 − 1 mes = 28/2). */
export function addMonths(ymd: string, n: number) {
  const { y, m, d } = parts(ymd);
  const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
  return ymdOf(Date.UTC(y, m + n, Math.min(d, last)));
}
export const monthIndex = (ymd: string) => parts(ymd).m;
/** Meses enteros entre dos fechas (para el índice de precios de ejemplo). */
export const monthsBetween = (a: string, b: string) => { const p = parts(a), q = parts(b); return (q.y - p.y) * 12 + q.m - p.m; };

/** "7 oct" */
export const short = (ymd: string) => { const { m, d } = parts(ymd); return `${d} ${MON[m]}`; };
/** "oct" o "oct 2025" si no es del año de referencia. */
export const monthShort = (ymd: string, ref: string) => { const { y, m } = parts(ymd); return y === parts(ref).y ? MON[m] : `${MON[m]} ${y}`; };
/** "octubre de 2026" */
export const monthLong = (ymd: string) => { const { y, m } = parts(ymd); return `${MONTHS[m]} de ${y}`; };
/** "Hoy", "Ayer" o "Miércoles 7 de octubre" (con el año si no es el actual). */
export function labelDay(ymd: string, hoy: string) {
  const diff = daysBetween(ymd, hoy);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  const { y, m, d } = parts(ymd);
  return `${cap(DAYS[dow(ymd)])} ${d} de ${MONTHS[m]}${y === parts(hoy).y ? '' : ` de ${y}`}`;
}
/** "Jueves 8 de octubre de 2026, 17:42" */
export const long = (ymd: string, hm: string) => { const { y, m, d } = parts(ymd); return `${cap(DAYS[dow(ymd)])} ${d} de ${MONTHS[m]} de ${y}, ${hm}`; };
/** "Sáb 3 oct" */
export const dayShort = (ymd: string) => `${cap(DAYS[dow(ymd)].slice(0, 3))} ${short(ymd)}`;
