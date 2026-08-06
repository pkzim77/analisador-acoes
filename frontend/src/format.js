export function formatPrice(value, currency) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);
}

export function formatPercent(value) {
  if (value == null) return "—";
  const num = Number(value);
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatVolume(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(Number(value));
}

export function formatRatio(value) {
  if (value == null) return "—";
  return Number(value).toFixed(2);
}

export function formatYield(value) {
  if (value == null) return "—";
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function formatRange(low, high) {
  if (low == null || high == null) return "—";
  const fmt = (v) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
  return `${fmt(low)} - ${fmt(high)}`;
}

export function formatCeiling(ceiling, margin, currency) {
  if (ceiling == null) return "—";
  const sign = margin > 0 ? "+" : "";
  return `${formatPrice(ceiling, currency)} (${sign}${margin.toFixed(1)}%)`;
}

export function formatMargin(margin) {
  if (margin == null) return "—";
  return `${margin > 0 ? "+" : ""}${margin.toFixed(1)}%`;
}
