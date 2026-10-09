const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** $ 849.999 (redondeado, sin decimales). */
export const fmt = (n: number) => money.format(Math.round(n));

/** Minúsculas y sin acentos, para buscar ("tóner" = "toner"). */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Estilo con variables CSS (React no tipa las propiedades "--x"). */
export const vars = (v: Record<string, string | number>) => v as React.CSSProperties;

/** −$ 12.000 si es negativo (signo menos tipográfico), $ 12.000 si no. */
export const fmtMonto = (n: number) => (Math.round(n) < 0 ? '−' : '') + fmt(Math.abs(n));
/** +$ 60.000 / −$ 12.000: para variaciones. */
export const fmtSigned = (n: number) => (Math.round(n) < 0 ? '−' : '+') + fmt(Math.abs(n));
/** +12 % / −4,1 % (fracción → porcentaje; un decimal por debajo de 10). Sin Intl: igual en el servidor y en el navegador. */
export function fmtPct(p: number) {
  const v = Math.abs(p * 100);
  const s = v < 10 ? v.toFixed(1).replace('.', ',').replace(/,0$/, '') : String(Math.round(v));
  return `${s === '0' ? '' : p < 0 ? '−' : '+'}${s}\u00a0%`;
}
