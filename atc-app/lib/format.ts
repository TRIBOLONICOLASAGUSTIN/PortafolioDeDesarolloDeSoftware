const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** $ 849.999 (redondeado, sin decimales). */
export const fmt = (n: number) => money.format(Math.round(n));

/** Minúsculas y sin acentos, para buscar ("tóner" = "toner"). */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Estilo con variables CSS (React no tipa las propiedades "--x"). */
export const vars = (v: Record<string, string | number>) => v as React.CSSProperties;
