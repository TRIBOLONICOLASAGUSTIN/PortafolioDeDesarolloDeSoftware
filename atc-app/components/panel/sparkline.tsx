// Mini gráfico de tendencia (como en la app Bolsa): solo la forma; los montos van en texto al lado.
export function Sparkline({ values, tone = 'link' }: { values: number[]; tone?: 'link' | 'neutral' }) {
  const W = 72, H = 28, n = values.length;
  if (n < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${((i / (n - 1)) * W).toFixed(1)},${(H - 2 - ((v - lo) / span) * (H - 4)).toFixed(1)}`).join(' ');
  return (
    <svg className={`pn-spark ${tone}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <polyline points={pts} />
    </svg>
  );
}
