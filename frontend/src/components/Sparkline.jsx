const WIDTH = 90;
const HEIGHT = 28;
const PADDING = 3;

export default function Sparkline({ history }) {
  if (history === undefined) return <span className="sparkline-placeholder">···</span>;
  if (history === null) return <span className="sparkline-placeholder">—</span>;

  const closes = history.map((p) => p.close).filter((v) => v != null);
  if (closes.length < 2) return <span className="sparkline-placeholder">—</span>;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const points = closes.map((price, i) => {
    const x = PADDING + (i / (closes.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((price - min) / range) * (HEIGHT - PADDING * 2);
    return [x, y];
  });

  const trendUp = closes[closes.length - 1] >= closes[0];
  const lineColor = "var(--viz-muted)";
  const dotColor = trendUp ? "var(--viz-good)" : "var(--viz-critical)";
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={dotColor} />
    </svg>
  );
}
