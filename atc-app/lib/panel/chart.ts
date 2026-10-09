// Geometría del gráfico de ganancia (SVG de 1000 × 300, se estira al ancho de la tarjeta).
export const W = 1000, H = 300;

/** Escala: el $0 siempre queda dentro del dibujo, con un margen de 8 % arriba y abajo. */
export function escala(values: number[]) {
  let lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  if (lo === hi) { lo = -1; hi = 1; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  return { y, y0: y(0) };
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
