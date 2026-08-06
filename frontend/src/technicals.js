// RSI(14) simplificado (média aritmética de ganhos/perdas, não a suavização de Wilder) —
// suficiente para um indicador de referência rápida, não para trading algorítmico.
export function calcRSI(history, period = 14) {
  if (!history || history.length < period + 1) return null;
  const closes = history.map((p) => p.close).filter((v) => v != null);
  if (closes.length < period + 1) return null;

  const recent = closes.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
