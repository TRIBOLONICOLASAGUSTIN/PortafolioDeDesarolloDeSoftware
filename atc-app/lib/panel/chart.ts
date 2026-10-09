// Geometría del gráfico de ganancia (SVG de 1000 × 300, se estira al ancho de la tarjeta).
import { diaSemana, mesCorto, short } from './dates';
import type { Bucket, Unit } from './stats';

export const W = 1000, H = 300;

/** Marcas del eje: números "lindos" (1 · 2 · 2,5 · 5 × 10ⁿ) que cubren los valores, siempre con el $ 0; de 3 a 6. */
export function ticks(lo: number, hi: number) {
  lo = Math.min(0, lo); hi = Math.max(0, hi);
  if (lo === hi) hi = 1;
  const raw = (hi - lo) / 4, p = 10 ** Math.floor(Math.log10(raw));
  for (const step of [1, 2, 2.5, 5, 10, 20, 25, 50].map(k => k * p)) {
    if (step < raw) continue;
    const a = Math.floor(lo / step), b = Math.ceil(hi / step);
    if (b - a <= 5) return Array.from({ length: b - a + 1 }, (_, i) => Math.round((a + i) * step * 1e6) / 1e6);
  }
  return [lo, 0, hi];
}

/** Escala: va de la marca más baja a la más alta, así la grilla coincide con los bordes del dibujo. */
export function escala(values: number[]) {
  const t = ticks(Math.min(...values), Math.max(...values));
  const lo = t[0], hi = t[t.length - 1];
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  return { y, y0: y(0), ticks: t };
}

/**
 * Fechas del eje X, ancladas al último punto (hoy) y hacia atrás: 7 días → cada día; 30 días → cada 7;
 * 3 meses → cada 4 semanas; 1 año → cada 3 meses. `alt` marca las que se ocultan en pantallas chicas.
 */
export function marcasX(serie: Bucket[], unit: Unit) {
  const n = serie.length, cada = unit === 'mes' ? 3 : unit === 'semana' ? 4 : n <= 7 ? 1 : 7;
  const txt = (b: Bucket) => (unit === 'mes' ? mesCorto(b.from) : unit === 'día' && n <= 7 ? diaSemana(b.to) : short(b.to));
  const idx: number[] = [];
  for (let i = n - 1; i >= 0; i -= cada) idx.unshift(i);
  return idx.map((i, k) => ({ i, x: (i + 1) / n, label: txt(serie[i]), alt: idx.length > 4 && (idx.length - 1 - k) % 2 === 1 }));
}

/** Curva monótona (Fritsch–Carlson): pasa por todos los puntos y nunca se pasa de largo entre dos de ellos. */
export function curva(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return `M${xs[0] ?? 0},${ys[0] ?? 0}`;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  const f = (v: number) => Math.round(v * 10) / 10;
  let p = `M${f(xs[0])},${f(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (xs[i + 1] - xs[i]) / 3;
    p += `C${f(xs[i] + h)},${f(ys[i] + m[i] * h)} ${f(xs[i + 1] - h)},${f(ys[i + 1] - m[i + 1] * h)} ${f(xs[i + 1])},${f(ys[i + 1])}`;
  }
  return p;
}
